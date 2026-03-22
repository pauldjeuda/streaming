const express = require('express');
const { getCreatorAnalytics } = require('./analytics.controller');

const router = express.Router();

router.get('/creator/stats', getCreatorAnalytics);

module.exports = router;
