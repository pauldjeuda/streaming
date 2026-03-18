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

module.exports = mongoose.model("PlaybackEvent", playbackEventSchema);