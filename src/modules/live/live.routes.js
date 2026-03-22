const express = require('express');

const router = express.Router();

router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      signaling: 'ready',
      transport: 'websocket',
      mediaServer: 'mediasoup-compatible-placeholder',
      verticalFormat: '9:16',
      replayExport: 'HLS on live end',
      targetLatencyMs: 500,
    },
  });
});

module.exports = router;
