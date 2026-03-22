const cache = require('./cache.service');

function trackCreatorStat(video, eventType, watchTime = 0) {
  const creatorId = video.userId || 'creator-demo';
  const key = `creator:${creatorId}:stats`;
  const current = cache.get(key) || {
    viewsLastHour: 0,
    likes: 0,
    shares: 0,
    totalWatchTime: 0,
    completions: 0,
    devices: {},
    geography: {},
  };

  if (eventType === 'view') current.viewsLastHour += 1;
  if (eventType === 'like') current.likes += 1;
  if (eventType === 'share') current.shares += 1;
  if (eventType === 'complete') current.completions += 1;
  current.totalWatchTime += Number(watchTime || 0);

  cache.set(key, current, 60 * 60 * 6);
  return current;
}

function getCreatorStats(creatorId = 'creator-demo') {
  const current = cache.get(`creator:${creatorId}:stats`) || {
    viewsLastHour: 0,
    likes: 0,
    shares: 0,
    totalWatchTime: 0,
    completions: 0,
    devices: {},
    geography: {},
  };

  return {
    viewsLastHour: current.viewsLastHour,
    likes: current.likes,
    shares: current.shares,
    averageWatchTime: current.viewsLastHour ? current.totalWatchTime / current.viewsLastHour : 0,
    completionRate: current.viewsLastHour ? current.completions / current.viewsLastHour : 0,
    geography: current.geography,
    devices: current.devices,
  };
}

module.exports = {
  trackCreatorStat,
  getCreatorStats,
};
