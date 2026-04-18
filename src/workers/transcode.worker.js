const fs = require("fs");
const path = require("path");
const Video = require("../modules/videos/video.model");
const env = require("../config/env");
const { getVideoMetadata } = require("../lib/ffprobe");
const { generateThumbnail, generateThumbnailSprite } = require("../lib/thumbnail");
const { generateHls, createMasterPlaylist, SEGMENT_DURATION } = require("../lib/hls");

function buildStoragePrefix(videoId) {
  const date = new Date().toISOString().slice(0, 10);
  return `${env.mediaDir}/${date}/${videoId}`;
}

async function processVideo(videoId) {
  const video = await Video.findById(videoId);

  if (!video) {
    throw new Error("Vidéo introuvable");
  }

  const originalAbsolutePath = path.join(process.cwd(), video.originalPath);
  const mediaRootRelative = buildStoragePrefix(video._id);
  const mediaRootAbsolute = path.join(process.cwd(), mediaRootRelative);

  try {
    video.status = "processing";
    video.errorMessage = null;
    await video.save();

    fs.mkdirSync(mediaRootAbsolute, { recursive: true });

    const meta = await getVideoMetadata(originalAbsolutePath);

    // Main thumbnail at ~10% duration
    const thumbAbsolutePath = await generateThumbnail(
      originalAbsolutePath,
      mediaRootAbsolute,
      meta.duration
    );

    // Sprite sheet + WebVTT storyboard for seek-bar hover preview
    let spritePath = null;
    let vttPath = null;
    if (meta.duration >= SEGMENT_DURATION) {
      try {
        const sprite = await generateThumbnailSprite(
          originalAbsolutePath,
          mediaRootAbsolute,
          meta.duration
        );
        spritePath = sprite.spritePath;
        vttPath = sprite.vttPath;
      } catch (spriteErr) {
        // Non-fatal — sprite generation failure doesn't block playback
        console.warn(`[transcode] sprite generation failed: ${spriteErr.message}`);
      }
    }

    // HLS multi-quality transcoding
    const hlsResults = await generateHls(originalAbsolutePath, mediaRootAbsolute, meta);

    const variants = hlsResults.map(({ rendition, playlistPath, segments }) => ({
      name: rendition.name,
      bandwidth: rendition.bandwidth,
      resolution: `${rendition.width}x${rendition.height}`,
      codec: rendition.codec || "avc1.640028",
      playlistPath: path.relative(process.cwd(), playlistPath).replace(/\\/g, "/"),
      preloadSegments: segments.slice(0, 2),
    }));

    const masterAbsolutePath = createMasterPlaylist(mediaRootAbsolute, variants, meta.fps);

    video.mediaRootPath = mediaRootRelative.replace(/\\/g, "/");
    video.storageKey = `${new Date().toISOString().slice(0, 10)}/${video._id}/master.m3u8`;
    video.hlsMasterPath = path.relative(process.cwd(), masterAbsolutePath).replace(/\\/g, "/");
    video.thumbnailPath = path.relative(process.cwd(), thumbAbsolutePath).replace(/\\/g, "/");
    video.thumbnailSpritePath = spritePath
      ? path.relative(process.cwd(), spritePath).replace(/\\/g, "/")
      : null;
    video.thumbnailVttPath = vttPath
      ? path.relative(process.cwd(), vttPath).replace(/\\/g, "/")
      : null;
    video.duration = meta.duration;
    video.width = meta.width;
    video.height = meta.height;
    video.fps = meta.fps;
    video.aspectRatio = meta.aspectRatio;
    video.targetAspectRatio = meta.width >= meta.height ? "16:9" : "9:16";
    video.variants = variants;
    video.segmentDuration = SEGMENT_DURATION;
    video.ranking = {
      viralScore: (video.stats.views + 1) / (video.stats.likes + 1),
      freshnessScore: 1,
      recommendationScore: 0.5,
    };
    video.status = "ready";

    await video.save();

    if (fs.existsSync(originalAbsolutePath)) {
      fs.unlinkSync(originalAbsolutePath);
      video.originalPath = null;
      await video.save();
    }
  } catch (error) {
    video.status = "failed";
    video.errorMessage = error.message;
    await video.save();
    throw error;
  }
}

module.exports = {
  processVideo,
};
