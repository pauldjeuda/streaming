const { createUploadedVideo } = require("./upload.service");
const { processVideo } = require("../../workers/transcode.worker");
const { assertRateLimit } = require("../../services/rate-limit.service");

async function uploadVideo(req, res, next) {
  try {
    assertRateLimit({
      key: `upload:${req.ip}:${req.body.userId || 'creator-demo'}`,
      limit: 5,
      windowSeconds: 60 * 60,
    });

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Aucun fichier vidéo reçu",
      });
    }

    const { caption, userId } = req.body;

    const video = await createUploadedVideo({
      file: req.file,
      caption,
      userId,
    });

    setImmediate(() => {
      processVideo(video._id).catch((error) => {
        console.error("Erreur lancement worker:", error);
      });
    });

    return res.status(201).json({
      success: true,
      message: "Vidéo uploadée avec succès, processing démarré",
      data: {
        id: video._id,
        caption: video.caption,
        originalFilename: video.originalFilename,
        originalPath: video.originalPath,
        status: video.status,
        createdAt: video.createdAt,
      },
      constraints: {
        maxDurationSeconds: 180,
        maxBytes: 500 * 1024 * 1024,
        targetAspectRatio: '9:16',
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadVideo,
};
