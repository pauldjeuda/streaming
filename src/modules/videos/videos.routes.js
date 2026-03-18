const express = require("express");
const { getVideoById, getVideoStatus } = require("./videos.controller");

const router = express.Router();

router.get("/:id", getVideoById);
router.get("/:id/status", getVideoStatus);

module.exports = router;