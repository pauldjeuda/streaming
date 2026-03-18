const { createUploadedVideo } = require("./upload.service");
const { processVideo } = require("../../workers/transcode.worker");

async function uploadVideo(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Aucun fichier vidéo reçu",
      });
    }

    const { caption } = req.body;

    const video = await createUploadedVideo({
      file: req.file,
      caption,
    });

    console.log("Vidéo créée en base :", video._id.toString());

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
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadVideo,
};