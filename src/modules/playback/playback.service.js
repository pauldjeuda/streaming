const PlaybackEvent = require("./playback.model");

async function createEvent({ videoId, sessionId, eventType, position, watchTime, metadata }) {
  const event = await PlaybackEvent.create({
    videoId,
    sessionId: sessionId || null,
    eventType,
    position: typeof position === "number" ? position : 0,
    watchTime: typeof watchTime === "number" ? watchTime : 0,
    metadata: metadata || {},
  });

  return event;
}

module.exports = {
  createEvent,
};