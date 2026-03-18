require("dotenv").config();

module.exports = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/short_video_streaming",
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:4000",
  originalsDir: process.env.ORIGINALS_DIR || "storage/originals",
  mediaDir: process.env.MEDIA_DIR || "storage/media",
  tmpDir: process.env.TMP_DIR || "tmp",
};