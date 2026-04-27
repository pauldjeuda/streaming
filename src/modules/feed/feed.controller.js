const env = require("../../config/env");
const { getReadyFeed, withSignedPlayback } = require("../videos/videos.service");
const { getOrCreateSession, touchSession } = require("../../services/session.service");
const { observeHistogram, incrementCounter } = require("../../services/metrics.service");
const { assertRateLimit } = require("../../services/rate-limit.service");

async function getFeed(req, res, next) {
  const startedAt = Date.now();

  try {
    const sessionId = req.headers["x-session-id"] || req.query.session_id;
    // Cap limit and offset to prevent full-collection scans
    const limit  = Math.min(Math.max(Number(req.query.limit)  || env.feedPageSize, 1), 100);
    const offset = Math.min(Math.max(Number(req.query.offset) || 0, 0), 10_000);
    const cursor = req.query.cursor || null; // ISO timestamp cursor for stable pagination
    const userId = req.query.user_id || "guest";

    assertRateLimit({ key: `feed:${req.ip}:${userId}`, limit: 100, windowSeconds: 60 });

    const session = getOrCreateSession(sessionId, userId);
    const videos = await getReadyFeed({ limit, offset, cursor });

    const payload = videos.map((video) => withSignedPlayback(video, session.sessionId));
    touchSession(session.sessionId, {
      userId,
      feedState: {
        index: offset,
        currentVideoId: payload[0]?.id || null,
        progress: 0,
      },
    });

    observeHistogram("feed_response_ms", Date.now() - startedAt, { route: "/api/v2/feed" });
    incrementCounter("feed_requests_total", 1, { region: req.headers["x-region"] || "global" });

    // Link prefetch hints so the browser (and CDN) can pipeline the next playlists
    const prefetchLinks = payload
      .slice(1, 3)
      .filter((v) => v.hlsUrl)
      .map((v) => `<${v.hlsUrl}>; rel=prefetch`)
      .join(", ");
    if (prefetchLinks) res.setHeader("Link", prefetchLinks);

    return res.json({
      success: true,
      data: payload,
      paging: {
        limit,
        offset,
        nextOffset: offset + payload.length,
        nextCursor: payload.length ? payload[payload.length - 1].createdAt : null,
        hasMore: payload.length === limit,
      },
      session,
      preloadHints: payload.slice(1, 3).map((video) => ({ id: video.id, hlsUrl: video.hlsUrl })),
      strategy: {
        viral: 0.6,
        recent: 0.3,
        recommended: 0.1,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getFeed,
};
