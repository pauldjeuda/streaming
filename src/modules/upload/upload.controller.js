const { createUploadedVideo } = require("./upload.service");
const { processVideo } = require("../../workers/transcode.worker");
const log = require("../../lib/logger");

// ── Concurrency semaphore — max 2 simultaneous FFmpeg processes ────────────────
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

// Exponential-backoff retry: 1 min → 5 min → 15 min
async function retryTranscode(videoId, maxAttempts = 3) {
  const delays = [60_000, 300_000, 900_000];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await processVideo(videoId);
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const delay = delays[attempt - 1];
      log.warn("upload", `${videoId} transcode attempt ${attempt} failed, retry in ${delay / 1000}s`, { error: err.message });
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// Exported so health check can report queue depth
function getTranscodeQueueLength() {
  return { active: activeTranscodes, queued: transcodeQueue.length };
}

async function uploadVideo(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Aucun fichier vidéo reçu" });
    }

    // MIME validation is handled by multer's fileFilter — no need to repeat here
    const { caption, userId } = req.body;

    const video = await createUploadedVideo({ file: req.file, caption, userId });

    const queueInfo = getTranscodeQueueLength();
    log.info("upload", `${video._id} queued`, {
      size: `${(req.file.size / 1024 / 1024).toFixed(1)}MB`,
      active: queueInfo.active,
      queued: queueInfo.queued,
    });

    setImmediate(() => {
      const t0 = Date.now();
      acquireSemaphore(() => retryTranscode(video._id))
        .then(() => log.info("upload", `${video._id} done in ${((Date.now() - t0) / 1000).toFixed(1)}s`))
        .catch((err) => log.error("upload", `${video._id} failed permanently`, { error: err.message }));
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
        maxDurationSeconds: Number(process.env.MAX_DURATION_SECONDS || 180),
        maxBytes: 500 * 1024 * 1024,
        targetAspectRatio: "9:16",
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { uploadVideo, getTranscodeQueueLength };
