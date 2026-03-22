const express = require("express");
const { getVideoById, getVideoStatus, preloadVideo, refreshToken, getCatalog } = require("./videos.controller");

const router = express.Router();

router.get("/", getCatalog);
router.get("/:id", getVideoById);
router.get("/:id/status", getVideoStatus);
router.get("/:id/preload", preloadVideo);
router.post("/:id/refresh_token", refreshToken);

module.exports = router;
