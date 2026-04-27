const mongoose = require("mongoose");
const Video = require("../videos/video.model");
const VideoLike = require("./video-like.model");
const { assertRateLimit } = require("../../services/rate-limit.service");
const { incrementCounter, setGauge } = require("../../services/metrics.service");
const { trackCreatorStat } = require("../../services/analytics.service");

function validateId(id, res) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: "ID vidéo invalide" });
    return false;
  }
  return true;
}

async function likeVideo(req, res, next) {
  try {
    const { id } = req.params;
    if (!validateId(id, res)) return;

    const sessionId = req.body.sessionId || req.headers["x-session-id"] || "guest";
    assertRateLimit({ key: `like:${req.ip}:${sessionId}`, limit: 10, windowSeconds: 60 });

    // DB-level deduplication via unique index — survives cache restarts
    const existing = await VideoLike.findOne({ sessionId, videoId: id });

    let updated;
    if (existing) {
      await VideoLike.deleteOne({ _id: existing._id });
      updated = await Video.findByIdAndUpdate(
        id,
        { $inc: { "stats.likes": -1 } },
        { new: true }
      );
      if (!updated) return res.status(404).json({ success: false, message: "Vidéo introuvable" });
      incrementCounter("video_unlikes_total", 1, { video_id: id });
      return res.json({ success: true, data: { id, likes: Math.max(0, updated.stats.likes), liked: false } });
    } else {
      try {
        await VideoLike.create({ sessionId, videoId: id });
      } catch (dupErr) {
        // Unique index violation — race condition, already liked
        if (dupErr.code === 11000) {
          const v = await Video.findById(id);
          return res.json({ success: true, data: { id, likes: v?.stats?.likes ?? 0, liked: true } });
        }
        throw dupErr;
      }
      updated = await Video.findByIdAndUpdate(
        id,
        { $inc: { "stats.likes": 1 } },
        { new: true }
      );
      if (!updated) return res.status(404).json({ success: false, message: "Vidéo introuvable" });
      incrementCounter("video_likes_total", 1, { video_id: id });
      trackCreatorStat(updated, "like");
      return res.json({ success: true, data: { id, likes: updated.stats.likes, liked: true } });
    }
  } catch (error) {
    next(error);
  }
}

async function registerView(req, res, next) {
  try {
    const { id } = req.params;
    if (!validateId(id, res)) return;

    const sessionId = req.body.sessionId || req.headers["x-session-id"] || "guest";
    const watchTime = Number(req.body.watchTime || 0);
    assertRateLimit({ key: `view:${req.ip}:${sessionId}`, limit: 50, windowSeconds: 60 });

    if (watchTime < 1) {
      return res.status(400).json({ success: false, message: "Visionnage insuffisant (< 1s)" });
    }

    // Find first to check duration and dedup in one shot
    const video = await Video.findById(id);
    if (!video) return res.status(404).json({ success: false, message: "Vidéo introuvable" });

    // Cache-based dedup (best-effort; DB dedup would need a ViewEvent collection)
    const cache = require("../../services/cache.service");
    const dedupeKey = `view:${sessionId}:${id}`;
    if (cache.get(dedupeKey)) {
      return res.json({ success: true, deduplicated: true });
    }
    cache.set(dedupeKey, true, 2 * 60 * 60); // 2 h session window

    const isCompletion = video.duration > 0 && watchTime >= video.duration - 0.5;
    const inc = { "stats.views": 1, ...(isCompletion ? { "stats.completions": 1 } : {}) };
    const updated = await Video.findByIdAndUpdate(id, { $inc: inc }, { new: true });

    incrementCounter("video_views_total", 1, { video_id: id });
    setGauge("active_video_sessions", 1, { video_id: id, region: req.headers["x-region"] || "global" });
    trackCreatorStat(updated, "view", watchTime);
    if (isCompletion) trackCreatorStat(updated, "complete", watchTime);

    return res.json({
      success: true,
      data: { id, views: updated.stats.views, completions: updated.stats.completions },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { likeVideo, registerView };
