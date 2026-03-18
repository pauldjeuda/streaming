const mongoose = require("mongoose");

const videoVariantSchema = new mongoose.Schema(
  {
    name: String,
    bandwidth: Number,
    resolution: String,
    playlistPath: String,
  },
  { _id: false }
);

const videoSchema = new mongoose.Schema(
  {
    caption: {
      type: String,
      default: "",
    },

    originalFilename: {
      type: String,
      required: true,
    },

    originalPath: {
      type: String,
      required: true,
    },

    mediaRootPath: {
      type: String,
      default: null,
    },

    hlsMasterPath: {
      type: String,
      default: null,
    },

    thumbnailPath: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["uploaded", "processing", "ready", "failed"],
      default: "uploaded",
    },

    duration: Number,
    width: Number,
    height: Number,
    aspectRatio: Number,

    variants: {
      type: [videoVariantSchema],
      default: [],
    },

    stats: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
    },

    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Video", videoSchema);