const express = require("express");
const cors = require("cors");
const path = require("path");

const healthRoutes = require("./modules/health/health.routes");
const uploadRoutes = require("./modules/upload/upload.routes");
const videosRoutes = require("./modules/videos/videos.routes");
const feedRoutes = require("./modules/feed/feed.routes");
const playbackRoutes = require("./modules/playback/playback.routes");
const interactionsRoutes = require('./modules/interactions/interactions.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const metricsRoutes = require('./modules/metrics/metrics.routes');
const sessionsRoutes = require('./modules/sessions/sessions.routes');
const liveRoutes = require('./modules/live/live.routes');
const errorMiddleware = require("./middlewares/error.middleware");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HLS segments are immutable — cache them for 1 year; playlists change less often
app.use("/media", (req, res, next) => {
  if (req.path.endsWith(".ts")) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else if (req.path.endsWith(".m3u8")) {
    res.setHeader("Cache-Control", "public, max-age=60");
  } else if (req.path.endsWith(".jpg") || req.path.endsWith(".vtt")) {
    res.setHeader("Cache-Control", "public, max-age=86400");
  }
  next();
}, express.static(path.join(process.cwd(), "storage/media")));
app.use("/public", express.static(path.join(process.cwd(), "public")));

app.use("/health", healthRoutes);
app.use("/metrics", metricsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/videos", videosRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/v2/feed", feedRoutes);
app.use("/api/playback", playbackRoutes);
app.use('/api', interactionsRoutes);
app.use('/api', analyticsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/live', liveRoutes);

// Serve SW and manifest at root scope so the Service Worker controls the whole origin
app.get("/sw.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Service-Worker-Allowed", "/");
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(path.join(process.cwd(), "public", "sw.js"));
});

app.get("/manifest.json", (req, res) => {
  res.setHeader("Content-Type", "application/manifest+json");
  res.sendFile(path.join(process.cwd(), "public", "manifest.json"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "feed.html"));
});

app.use(errorMiddleware);

module.exports = app;
