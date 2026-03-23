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

    console.log(`🚀 Upload terminé pour vidéo ${video._id}: "${video.caption}" - Lancement du transcodage...`);
    console.log(`📁 Fichier: ${req.file.originalname} (${req.file.mimetype}, ${(req.file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Lancer le transcodage de manière plus fiable
    setTimeout(async () => {
      try {
        console.log(`⚡ Début du transcodage pour ${video._id}`);
        const startTime = Date.now();
        
        await processVideo(video._id);
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        console.log(`✅ Transcodage terminé pour ${video._id} en ${duration.toFixed(2)}s`);
      } catch (error) {
        console.error(`❌ Erreur transcodage pour ${video._id}:`, error.message);
        
        // Mettre à jour le statut en "failed" avec le message d'erreur
        const Video = require("../videos/video.model");
        await Video.findByIdAndUpdate(video._id, { 
          status: "failed", 
          errorMessage: error.message 
        });
      }
    }, 1000); // Lancer après 1 seconde pour être sûr que l'upload est bien terminé

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
