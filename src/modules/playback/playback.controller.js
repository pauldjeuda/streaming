const mongoose = require("mongoose");
const { createEvent } = require("./playback.service");

async function createPlaybackEvent(req, res, next) {
  try {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({
        success: false,
        message: "ID vidéo invalide",
      });
    }

    const { sessionId, eventType, position, watchTime, metadata } = req.body;

    if (!eventType) {
      return res.status(400).json({
        success: false,
        message: "eventType est requis",
      });
    }

    const event = await createEvent({
      videoId,
      sessionId,
      eventType,
      position,
      watchTime,
      metadata,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: event._id,
        videoId: event.videoId,
        eventType: event.eventType,
        createdAt: event.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPlaybackEvent,
};