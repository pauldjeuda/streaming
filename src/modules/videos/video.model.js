const mongoose = require("mongoose");

const videoVariantSchema = new mongoose.Schema(
  {
    name: String,
    bandwidth: Number,
    resolution: String,
    playlistPath: String,
    preloadSegments: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const videoSchema = new mongoose.Schema(
  {
    caption: {
      type: String,
      default: "",
    },
    userId: {
      type: String,
      default: "creator-demo",
    },
    originalFilename: {
      type: String,
      required: true,
    },
    originalPath: {
      type: String,
      default: null,
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
    storageKey: {
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
    targetAspectRatio: {
      type: String,
      default: "9:16",
    },
    segmentDuration: {
      type: Number,
      default: 2,
    },
    variants: {
      type: [videoVariantSchema],
      default: [],
    },
    stats: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      completions: { type: Number, default: 0 },
      skips: { type: Number, default: 0 },
    },
    ranking: {
      viralScore: { type: Number, default: 0 },
      freshnessScore: { type: Number, default: 0 },
      recommendationScore: { type: Number, default: 0 },
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

videoSchema.index({ createdAt: -1, 'stats.views': -1 });

module.exports = mongoose.model("Video", videoSchema);
