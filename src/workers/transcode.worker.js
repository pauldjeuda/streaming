const fs = require("fs");
const path = require("path");
const Video = require("../modules/videos/video.model");
const env = require("../config/env");
const { getVideoMetadata } = require("../lib/ffprobe");
const { generateThumbnail, generateThumbnailSprite } = require("../lib/thumbnail");
const { generateHlsProgressive, createMasterPlaylist, SEGMENT_DURATION } = require("../lib/hls");

function buildStoragePrefix(videoId) {
  const date = new Date().toISOString().slice(0, 10);
  return `${env.mediaDir}/${date}/${videoId}`;
}

function buildVariants(hlsResults) {
  return hlsResults.map(({ rendition, playlistPath, segments }) => ({
    name: rendition.name,
    bandwidth: rendition.bandwidth,
    resolution: `${rendition.width}x${rendition.height}`,
    codec: rendition.codec || "avc1.640028",
    playlistPath: path.relative(process.cwd(), playlistPath).replace(/\\/g, "/"),
    preloadSegments: segments.slice(0, 2),
  }));
}

async function processVideo(videoId) {
  const video = await Video.findById(videoId);
  if (!video) throw new Error("Vidéo introuvable");

  const originalAbsolutePath = path.join(process.cwd(), video.originalPath);
  const mediaRootRelative = buildStoragePrefix(video._id);
  const mediaRootAbsolute = path.join(process.cwd(), mediaRootRelative);
  const datePrefix = new Date().toISOString().slice(0, 10);

  try {
    video.status = "processing";
    video.errorMessage = null;
    await video.save();

    fs.mkdirSync(mediaRootAbsolute, { recursive: true });

    const meta = await getVideoMetadata(originalAbsolutePath);

    // Thumbnail generated upfront so the video has a poster immediately
    const thumbAbsolutePath = await generateThumbnail(
      originalAbsolutePath, mediaRootAbsolute, meta.duration
    );

    // ── Phase 1: encode lowest quality (ultrafast) → mark video ready ─────────
    // ── Phase 2: encode remaining qualities in parallel (background) ──────────
    const allHlsResults = await generateHlsProgressive(
      originalAbsolutePath,
      mediaRootAbsolute,
      meta,
      async (firstResults) => {
        // Called as soon as 360p is done — video is immediately watchable
        const firstVariants = buildVariants(firstResults);
        const masterPath = createMasterPlaylist(mediaRootAbsolute, firstVariants, meta.fps);

        video.mediaRootPath      = mediaRootRelative.replace(/\\/g, "/");
        video.storageKey         = `${datePrefix}/${video._id}/master.m3u8`;
        video.hlsMasterPath      = path.relative(process.cwd(), masterPath).replace(/\\/g, "/");
        video.thumbnailPath      = path.relative(process.cwd(), thumbAbsolutePath).replace(/\\/g, "/");
        video.duration           = meta.duration;
        video.width              = meta.width;
        video.height             = meta.height;
        video.fps                = meta.fps;
        video.aspectRatio        = meta.aspectRatio;
        video.targetAspectRatio  = meta.width >= meta.height ? "16:9" : "9:16";
        video.variants           = firstVariants;
        video.segmentDuration    = SEGMENT_DURATION;
        video.ranking = {
          viralScore: (video.stats.views + 1) / (video.stats.likes + 1),
          freshnessScore: 1,
          recommendationScore: 0.5,
        };
        video.status = "ready"; // ← playable at 360p right now
        await video.save();

        console.log(`[transcode] ${videoId} → ready at ${firstResults[0].rendition.name}, upgrading remaining qualities in parallel`);
      }
    );

    // ── All qualities done: update master playlist + variants in DB ───────────
    const allVariants = buildVariants(allHlsResults);
    const finalMasterPath = createMasterPlaylist(mediaRootAbsolute, allVariants, meta.fps);

    video.hlsMasterPath = path.relative(process.cwd(), finalMasterPath).replace(/\\/g, "/");
    video.variants = allVariants;
    await video.save();

    console.log(`[transcode] ${videoId} → all ${allVariants.length} qualities ready`);

    // ── Sprite sheet generated in background (non-blocking) ───────────────────
    // Original file is deleted only after sprite is done (both use it)
    if (meta.duration >= SEGMENT_DURATION) {
      generateThumbnailSprite(originalAbsolutePath, mediaRootAbsolute, meta.duration)
        .then(({ spritePath, vttPath }) => {
          video.thumbnailSpritePath = path.relative(process.cwd(), spritePath).replace(/\\/g, "/");
          video.thumbnailVttPath    = path.relative(process.cwd(), vttPath).replace(/\\/g, "/");
          return video.save();
        })
        .catch((e) => console.warn(`[transcode] sprite failed: ${e.message}`))
        .finally(() => deleteOriginal(video, originalAbsolutePath));
    } else {
      deleteOriginal(video, originalAbsolutePath);
    }

  } catch (error) {
    video.status = "failed";
    video.errorMessage = error.message;
    await video.save();
    throw error;
  }
}

function deleteOriginal(video, originalAbsolutePath) {
  try {
    if (fs.existsSync(originalAbsolutePath)) {
      fs.unlinkSync(originalAbsolutePath);
      video.originalPath = null;
      video.save().catch(() => {});
    }
  } catch (e) {
    console.warn(`[transcode] could not delete original: ${e.message}`);
  }
}

module.exports = { processVideo };
