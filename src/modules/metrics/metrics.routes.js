const express = require('express');
const { renderPrometheus } = require('../../services/metrics.service');

const router = express.Router();

router.get('/', (req, res) => {
  res.type('text/plain').send(renderPrometheus());
});

module.exports = router;
