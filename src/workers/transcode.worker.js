const fs = require("fs");
const path = require("path");
const Video = require("../modules/videos/video.model");
const env = require("../config/env");
const { getVideoMetadata } = require("../lib/ffprobe");
const { generateThumbnail } = require("../lib/thumbnail");
const { generateHls, createMasterPlaylist } = require("../lib/hls");

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
    const thumbAbsolutePath = await generateThumbnail(originalAbsolutePath, mediaRootAbsolute);
    const hlsResults = await generateHls(originalAbsolutePath, mediaRootAbsolute);

    const variants = hlsResults.map(({ rendition, playlistPath, segments }) => ({
      name: rendition.name,
      bandwidth: rendition.bandwidth,
      resolution: `${rendition.width}x${rendition.height}`,
      playlistPath: path.relative(process.cwd(), playlistPath).replace(/\\/g, "/"),
      preloadSegments: segments.slice(0, 2),
    }));

    const masterAbsolutePath = createMasterPlaylist(mediaRootAbsolute, variants);

    video.mediaRootPath = mediaRootRelative.replace(/\\/g, "/");
    video.storageKey = `${new Date().toISOString().slice(0, 10)}/${video._id}/master.m3u8`;
    video.hlsMasterPath = path.relative(process.cwd(), masterAbsolutePath).replace(/\\/g, "/");
    video.thumbnailPath = path.relative(process.cwd(), thumbAbsolutePath).replace(/\\/g, "/");
    video.duration = meta.duration;
    video.width = meta.width;
    video.height = meta.height;
    video.aspectRatio = meta.aspectRatio;
    video.variants = variants;
    video.segmentDuration = 2;
    video.targetAspectRatio = "9:16";
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
