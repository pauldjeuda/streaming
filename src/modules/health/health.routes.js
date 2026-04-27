const express = require("express");
const fs = require("fs");
const mongoose = require("mongoose");
const { getTranscodeQueueLength } = require("../upload/upload.controller");

const router = express.Router();

router.get("/", async (req, res) => {
  const disk      = fs.statfsSync(process.cwd());
  const freeBytes = disk.bavail * disk.bsize;
  const dbReady   = mongoose.connection.readyState === 1;
  const mem       = process.memoryUsage();
  const memUsagePct = Math.round((mem.heapUsed / mem.heapTotal) * 100);
  const transcodeQueue = getTranscodeQueueLength();

  const healthy = dbReady && freeBytes > 100 * 1024 * 1024 && memUsagePct < 95;

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    message: healthy ? "API OK" : "Service dégradé",
    checks: {
      database:          dbReady ? "up" : "down",
      diskFreeBytes:     freeBytes,
      diskThresholdBytes: 100 * 1024 * 1024,
      memUsagePct,
      transcodeActive:   transcodeQueue.active,
      transcodeQueued:   transcodeQueue.queued,
    },
  });
});

module.exports = router;
