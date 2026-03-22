const PlaybackEvent = require("./playback.model");
const { touchSession } = require('../../services/session.service');
const { incrementCounter } = require('../../services/metrics.service');
const { findVideoById } = require('../videos/videos.service');
const { trackCreatorStat } = require('../../services/analytics.service');

async function createEvent({ videoId, sessionId, eventType, position, watchTime, metadata }) {
  const event = await PlaybackEvent.create({
    videoId,
    sessionId: sessionId || null,
    eventType,
    position: typeof position === "number" ? position : 0,
    watchTime: typeof watchTime === "number" ? watchTime : 0,
    metadata: metadata || {},
  });

  if (sessionId) {
    touchSession(sessionId, {
      feedState: {
        currentVideoId: videoId,
        progress: Number(position || 0),
      },
      historyAppend: [videoId],
    });
  }

  incrementCounter('playback_events_total', 1, { event_type: eventType, video_id: videoId });

  const video = await findVideoById(videoId);
  if (video && ['view', 'complete', 'share'].includes(eventType)) {
    trackCreatorStat(video, eventType, watchTime);
  }

  if (video && eventType === 'skip') {
    video.stats.skips += 1;
    await video.save();
  }

  return event;
}

module.exports = {
  createEvent,
};
