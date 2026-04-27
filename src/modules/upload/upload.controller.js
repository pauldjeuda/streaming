const { createUploadedVideo } = require("./upload.service");
const { processVideo } = require("../../workers/transcode.worker");

// Simple semaphore — cap concurrent FFmpeg processes to avoid CPU saturation
const MAX_CONCURRENT = 2;
let activeTranscodes = 0;
const transcodeQueue = [];

function acquireSemaphore(fn) {
  return new Promise((resolve) => {
    const run = async () => {
      activeTranscodes++;
      try { resolve(await fn()); }
      finally {
        activeTranscodes--;
        if (transcodeQueue.length) transcodeQueue.shift()();
      }
    };
    if (activeTranscodes < MAX_CONCURRENT) run();
    else transcodeQueue.push(run);
  });
}

async function uploadVideo(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Aucun fichier vidéo reçu",
      });
    }

    // MIME validation is handled by multer's fileFilter — no need to repeat it here
    const { caption, userId } = req.body;

    const video = await createUploadedVideo({
      file: req.file,
      caption,
      userId,
    });

    console.log(`[upload] ${video._id} "${video.caption}" — ${(req.file.size / 1024 / 1024).toFixed(1)} MB, queued for transcoding (active: ${activeTranscodes}/${MAX_CONCURRENT})`);

    // Queue transcoding — runs immediately if a slot is free, waits otherwise
    setImmediate(() => {
      const t0 = Date.now();
      acquireSemaphore(() => processVideo(video._id))
        .then(() => console.log(`[upload] ${video._id} done in ${((Date.now() - t0) / 1000).toFixed(1)}s`))
        .catch((error) => console.error(`[upload] ${video._id} failed: ${error.message}`));
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
