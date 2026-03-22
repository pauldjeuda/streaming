const express = require("express");
const fs = require('fs');
const mongoose = require('mongoose');

const router = express.Router();

router.get("/", async (req, res) => {
  const disk = fs.statfsSync(process.cwd());
  const freeBytes = disk.bavail * disk.bsize;
  const dbReady = mongoose.connection.readyState === 1;
  const healthy = dbReady && freeBytes > 10 * 1024 * 1024;

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    message: healthy ? "API OK" : "Service dégradé",
    checks: {
      database: dbReady ? 'up' : 'down',
      diskFreeBytes: freeBytes,
      diskThresholdBytes: 10 * 1024 * 1024,
      latencyBudgetMs: 500,
    },
  });
});

module.exports = router;
