const express = require("express");
const { getFeed } = require("./feed.controller");

const router = express.Router();

router.get("/", getFeed);

module.exports = router;
