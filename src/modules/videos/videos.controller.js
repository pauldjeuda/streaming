const {
  findVideoById,
  serializeVideo,
} = require("./videos.service");

async function getVideoById(req, res, next) {
  try {
    const { id } = req.params;
    const video = await findVideoById(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Vidéo introuvable",
      });
    }

    return res.json({
      success: true,
      data: serializeVideo(video),
    });
  } catch (error) {
    next(error);
  }
}

async function getVideoStatus(req, res, next) {
  try {
    const { id } = req.params;
    const video = await findVideoById(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Vidéo introuvable",
      });
    }

    return res.json({
      success: true,
      data: {
        id: video._id,
        status: video.status,
        errorMessage: video.errorMessage,
        updatedAt: video.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getVideoById,
  getVideoStatus,
};