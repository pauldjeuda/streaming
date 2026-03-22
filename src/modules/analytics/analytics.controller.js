const { getCreatorStats } = require('../../services/analytics.service');

async function getCreatorAnalytics(req, res, next) {
  try {
    const creatorId = req.query.creator_id || 'creator-demo';
    return res.json({
      success: true,
      data: {
        creatorId,
        timeseries: {
          lastHourViews: getCreatorStats(creatorId).viewsLastHour,
        },
        ...getCreatorStats(creatorId),
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCreatorAnalytics,
};
