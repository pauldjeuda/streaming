const express = require('express');
const { getOrCreateSession, touchSession } = require('../../services/session.service');

const router = express.Router();

router.get('/:sessionId', (req, res) => {
  const session = getOrCreateSession(req.params.sessionId, req.query.user_id || 'guest');
  res.json({ success: true, data: session });
});

router.post('/:sessionId', (req, res) => {
  const session = touchSession(req.params.sessionId, {
    userId: req.body.userId,
    feedState: req.body.feedState,
    historyAppend: req.body.videoId ? [req.body.videoId] : [],
  });
  res.json({ success: true, data: session });
});

module.exports = router;
