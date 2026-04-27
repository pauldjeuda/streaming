const mongoose = require("mongoose");

const playbackEventSchema = new mongoose.Schema(
  {
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },

    sessionId: {
      type: String,
      default: null,
    },

    eventType: {
      type: String,
      required: true,
    },

    position: {
      type: Number,
      default: 0,
    },

    watchTime: {
      type: Number,
      default: 0,
    },

    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Auto-delete events older than 30 days — prevents unbounded collection growth
playbackEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
playbackEventSchema.index({ videoId: 1, createdAt: -1 });
playbackEventSchema.index({ sessionId: 1 });

module.exports = mongoose.model("PlaybackEvent", playbackEventSchema);