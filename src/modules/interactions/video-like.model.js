const mongoose = require("mongoose");

const videoLikeSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true },
    videoId:   { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true },
  },
  { timestamps: true }
);

// Unique compound index → DB-level deduplication (survives cache flush/restart)
videoLikeSchema.index({ sessionId: 1, videoId: 1 }, { unique: true });
videoLikeSchema.index({ videoId: 1 });

module.exports = mongoose.model("VideoLike", videoLikeSchema);
