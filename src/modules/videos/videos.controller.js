const mongoose = require("mongoose");
const { findVideoById, withSignedPlayback, serializeVideo } = require("./videos.service");
const { createSignedToken } = require("../../services/security.service");

async function getVideoById(req, res, next) {
  try {
    const { id } = req.params;
    const sessionId = req.query.session_id || req.headers["x-session-id"];
    const video = await findVideoById(id);

    if (!video) {
      return res.status(404).json({ success: false, message: "Vidéo introuvable" });
    }

    return res.json({ success: true, data: withSignedPlayback(video, sessionId) });
  } catch (error) {
    next(error);
  }
}

async function getVideoStatus(req, res, next) {
  try {
    const { id } = req.params;
    const video = await findVideoById(id);

    if (!video) {
      return res.status(404).json({ success: false, message: "Vidéo introuvable" });
    }

    return res.json({
      success: true,
      data: {
        id: video._id,
        status: video.status,
        errorMessage: video.errorMessage,
        updatedAt: video.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function preloadVideo(req, res, next) {
  try {
    const { id } = req.params;
    const video = await findVideoById(id);

    if (!video) {
      return res.status(404).json({ success: false, message: "Vidéo introuvable" });
    }

    const preload = (video.variants || []).map((variant) => ({
      name: variant.name,
      resolution: variant.resolution,
      firstSegments: (variant.preloadSegments || []).slice(0, 2),
      playlistPath: variant.playlistPath,
    }));

    return res.json({ success: true, data: { id: video._id, preload } });
  } catch (error) {
    next(error);
  }
}

async function refreshToken(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "ID vidéo invalide" });
    }

    const token = createSignedToken({
      videoId: id,
      userId: req.body.userId || req.body.sessionId || 'guest',
      segment: req.body.segment || 'master',
    });

    return res.json({ success: true, data: token });
  } catch (error) {
    next(error);
  }
}

async function getCatalog(req, res, next) {
  try {
    const { limit = 50 } = req.query;
    const videos = await require('./videos.service').getReadyFeed({ limit: Number(limit), offset: 0 });
    return res.json({ success: true, data: videos.map(serializeVideo) });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getVideoById,
  getVideoStatus,
  preloadVideo,
  refreshToken,
  getCatalog,
};
