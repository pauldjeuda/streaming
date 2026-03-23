const { findVideoById } = require("../videos/videos.service");
const { assertRateLimit } = require("../../services/rate-limit.service");
const cache = require("../../services/cache.service");
const { incrementCounter, setGauge } = require("../../services/metrics.service");
const { trackCreatorStat } = require("../../services/analytics.service");

async function likeVideo(req, res, next) {
  try {
    const { id } = req.params;
    const sessionId = req.body.sessionId || 'guest';
    assertRateLimit({ key: `like:${req.ip}:${sessionId}`, limit: 10, windowSeconds: 60 });

    const video = await findVideoById(id);
    if (!video) {
      return res.status(404).json({ success: false, message: "Vidéo introuvable" });
    }

    // Vérifier si l'utilisateur a déjà liké cette vidéo
    const dedupeKey = `like:${sessionId}:${id}`;
    const hasLiked = cache.get(dedupeKey);

    if (hasLiked) {
      // Retirer le like
      video.stats.likes = Math.max(0, video.stats.likes - 1);
      cache.del(dedupeKey);
      incrementCounter("video_unlikes_total", 1, { video_id: id });
      await video.save();
      
      return res.json({ success: true, data: { id, likes: video.stats.likes, liked: false } });
    } else {
      // Ajouter le like
      video.stats.likes += 1;
      cache.set(dedupeKey, true, 24 * 60 * 60); // Garder en mémoire pendant 24h
      incrementCounter("video_likes_total", 1, { video_id: id });
      trackCreatorStat(video, 'like');
      await video.save();
      
      return res.json({ success: true, data: { id, likes: video.stats.likes, liked: true } });
    }
  } catch (error) {
    next(error);
  }
}

async function registerView(req, res, next) {
  try {
    const { id } = req.params;
    const sessionId = req.body.sessionId || 'guest';
    const watchTime = Number(req.body.watchTime || 0);
    assertRateLimit({ key: `view:${req.ip}:${sessionId}`, limit: 50, windowSeconds: 60 });

    const dedupeKey = `view:${sessionId}:${id}`;
    if (cache.get(dedupeKey)) {
      return res.json({ success: true, deduplicated: true });
    }

    if (watchTime < 2) {
      return res.status(400).json({ success: false, message: "Visionnage insuffisant (< 2s)" });
    }

    const video = await findVideoById(id);
    if (!video) {
      return res.status(404).json({ success: false, message: "Vidéo introuvable" });
    }

    cache.set(dedupeKey, true, 24 * 60 * 60);
    video.stats.views += 1;
    if (watchTime >= Number(video.duration || 0) - 0.5) {
      video.stats.completions += 1;
      trackCreatorStat(video, 'complete', watchTime);
    }
    await video.save();

    incrementCounter("video_views_total", 1, { video_id: id });
    setGauge("active_video_sessions", 1, { video_id: id, region: req.headers['x-region'] || 'global' });
    trackCreatorStat(video, 'view', watchTime);

    return res.json({ success: true, data: { id, views: video.stats.views, completions: video.stats.completions } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  likeVideo,
  registerView,
};
