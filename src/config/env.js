require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env.SIGNING_KEY) {
  throw new Error("SIGNING_KEY environment variable is required in production");
}

if (!isProduction && !process.env.SIGNING_KEY) {
  console.warn("[env] SIGNING_KEY not set — using insecure default (dev only)");
}

module.exports = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/short_video_streaming",
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:4000",
  originalsDir: process.env.ORIGINALS_DIR || "storage/originals",
  mediaDir: process.env.MEDIA_DIR || "storage/media",
  tmpDir: process.env.TMP_DIR || "tmp",
  signingKey: process.env.SIGNING_KEY || "streaming-demo-signing-key",
  feedPageSize: Number(process.env.FEED_PAGE_SIZE || 20),
  uploadMaxBytes: Number(process.env.UPLOAD_MAX_BYTES || 500 * 1024 * 1024),
};
