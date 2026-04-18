const { createUploadedVideo } = require("./upload.service");
const { processVideo } = require("../../workers/transcode.worker");
const { assertRateLimit } = require("../../services/rate-limit.service");

async function uploadVideo(req, res, next) {
  try {
    // Rate limit retiré - upload illimité pour éviter le problème "pending"

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Aucun fichier vidéo reçu",
      });
    }

    const { caption, userId } = req.body;

    // Validation basique du fichier vidéo
    const allowedMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Format de fichier non supporté. Utilisez MP4, MOV, AVI ou WMV",
      });
    }

    const video = await createUploadedVideo({
      file: req.file,
      caption,
      userId,
    });

    console.log(`[upload] ${video._id} "${video.caption}" — ${(req.file.size / 1024 / 1024).toFixed(1)} MB, transcoding started`);

    // Start transcoding immediately — no delay
    setImmediate(async () => {
      const t0 = Date.now();
      try {
        await processVideo(video._id);
        console.log(`[upload] ${video._id} done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      } catch (error) {
        console.error(`[upload] ${video._id} failed: ${error.message}`);
      }
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
