const express = require("express");
const { createPlaybackEvent } = require("./playback.controller");

const router = express.Router();

router.post("/:videoId/events", createPlaybackEvent);

module.exports = router;