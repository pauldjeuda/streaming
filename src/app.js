const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const compression = require("compression");

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
const { verifySignedToken } = require("./services/security.service");

const app = express();

// Security headers — disable content-type sniffing, clickjacking, etc.
// crossOriginResourcePolicy set to cross-origin so the media player (same origin) works fine
app.use(helmet({
  contentSecurityPolicy: false,           // would block inline scripts in HTML pages
  crossOriginEmbedderPolicy: false,       // HLS.js workers require cross-origin isolation to be off
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Restrict CORS to explicitly configured origins (prevents CSRF from arbitrary sites)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  : ["http://localhost:4000", "http://127.0.0.1:4000"];

app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin requests (origin is undefined for same-origin / non-browser) and whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(Object.assign(new Error("CORS not allowed"), { status: 403 }));
  },
  credentials: true,
}));
// Compress JSON/text API responses; skip binary media routes
app.use(compression({ filter: (req, res) => !req.path.startsWith("/media") && compression.filter(req, res) }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Verify signed token on HLS master & variant playlists (.m3u8).
// .ts segments are immutable and CDN-cacheable — they stay public.
app.use("/media", (req, res, next) => {
  if (req.path.endsWith(".m3u8")) {
    const token = req.query.token;
    if (token) {
      const result = verifySignedToken(token);
      if (!result.valid) {
        return res.status(401).json({ success: false, message: "Token invalide ou expiré" });
      }
    }
    // No token = allow (demo mode); in production change to: if (!token || !result.valid) return 401
  }
  next();
});

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
