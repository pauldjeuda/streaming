const multer = require("multer");

function errorMiddleware(err, req, res, next) {
  console.error("ERROR:", err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: `Erreur upload: ${err.message}`,
    });
  }

  return res.status(err.status || 500).json({
    success: false,
    message: err.message || "Erreur interne du serveur",
  });
}

module.exports = errorMiddleware;