const express = require('express');
const { likeVideo, registerView } = require('./interactions.controller');

const router = express.Router();

router.post('/video/:id/like', likeVideo);
router.post('/video/:id/view', registerView);

module.exports = router;
