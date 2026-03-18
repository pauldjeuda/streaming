const Video = require("./video.model");
const env = require("../../config/env");

function buildMediaUrl(relativePath) {
  if (!relativePath) return null;

  const normalized = relativePath.replace(/\\/g, "/");

  if (normalized.startsWith("storage/media/")) {
    const publicPath = normalized.replace("storage/media/", "media/");
    return `${env.appBaseUrl}/${publicPath}`;
  }

  return `${env.appBaseUrl}/${normalized}`;
}

async function findVideoById(videoId) {
  return Video.findById(videoId);
}

async function getReadyFeed() {
  return Video.find({ status: "ready" }).sort({ createdAt: -1 }).limit(20);
}

function serializeVideo(video) {
  return {
    id: video._id,
    caption: video.caption,
    status: video.status,
    duration: video.duration,
    width: video.width,
    height: video.height,
    aspectRatio: video.aspectRatio,
    thumbnailUrl: buildMediaUrl(video.thumbnailPath),
    hlsUrl: buildMediaUrl(video.hlsMasterPath),
    variants: video.variants || [],
    stats: video.stats || { views: 0, likes: 0 },
    errorMessage: video.errorMessage,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
  };
}

module.exports = {
  findVideoById,
  getReadyFeed,
  serializeVideo,
};