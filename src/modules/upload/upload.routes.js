const express = require("express");
const upload = require("../../lib/multer");
const { uploadVideo } = require("./upload.controller");

const router = express.Router();

router.post("/", upload.single("video"), uploadVideo);

module.exports = router;