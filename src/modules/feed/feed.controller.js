const { getReadyFeed, serializeVideo } = require("../videos/videos.service");

async function getFeed(req, res, next) {
  try {
    const videos = await getReadyFeed();

    return res.json({
      success: true,
      data: videos.map(serializeVideo),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getFeed,
};