const Video = require("./video.model");
const env = require("../../config/env");
const { createSignedToken } = require("../../services/security.service");
const cache = require("../../services/cache.service");

function buildMediaUrl(relativePath) {
  if (!relativePath) return null;

  const normalized = relativePath.replace(/\\/g, "/");

  if (normalized.startsWith("storage/media/")) {
    const publicPath = normalized.replace("storage/media/", "media/");
    return `${env.appBaseUrl}/${publicPath}`;
  }

  return `${env.appBaseUrl}/${normalized}`;
}

function rankVideos(videos) {
  return videos.sort((a, b) => {
    const scoreA = (a.ranking?.viralScore || 0) + (a.ranking?.freshnessScore || 0) + (a.ranking?.recommendationScore || 0);
    const scoreB = (b.ranking?.viralScore || 0) + (b.ranking?.freshnessScore || 0) + (b.ranking?.recommendationScore || 0);
    return scoreB - scoreA;
  });
}

async function findVideoById(videoId) {
  return Video.findById(videoId);
}

async function getReadyFeed({ limit = env.feedPageSize, offset = 0 } = {}) {
  const cacheKey = `feed:${limit}:${offset}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const videos = await Video.find({ status: "ready" }).sort({ createdAt: -1 }).skip(offset).limit(limit);
  const ranked = rankVideos(videos);
  cache.set(cacheKey, ranked, 10);
  return ranked;
}

function withSignedPlayback(video, sessionId) {
  const token = createSignedToken({ videoId: video._id.toString(), userId: sessionId || 'guest' });
  const hlsUrl = buildMediaUrl(video.hlsMasterPath);

  return {
    ...serializeVideo(video),
    hlsUrl,
    signedPlayback: hlsUrl ? `${hlsUrl}?token=${token.token}` : null,
    tokenExpiresAt: token.expiresAt,
  };
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
    targetAspectRatio: video.targetAspectRatio,
    segmentDuration: video.segmentDuration,
    thumbnailUrl: buildMediaUrl(video.thumbnailPath),
    hlsUrl: buildMediaUrl(video.hlsMasterPath),
    variants: (video.variants || []).map((variant) => ({
      ...variant.toObject ? variant.toObject() : variant,
      playlistUrl: buildMediaUrl(variant.playlistPath),
    })),
    stats: video.stats || { views: 0, likes: 0, shares: 0, completions: 0, skips: 0 },
    ranking: video.ranking,
    storageKey: video.storageKey,
    errorMessage: video.errorMessage,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
  };
}

module.exports = {
  findVideoById,
  getReadyFeed,
  serializeVideo,
  withSignedPlayback,
  buildMediaUrl,
};
