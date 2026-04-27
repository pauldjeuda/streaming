const multer = require("multer");

function errorMiddleware(err, req, res, next) {
  const requestId = req.headers["x-request-id"] || null;

  console.error("ERROR:", {
    message: err.message,
    status: err.status || 500,
    requestId,
    path: req.path,
    method: req.method,
  });

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: `Erreur upload: ${err.message}`,
      ...(requestId && { requestId }),
    });
  }

  const status = err.status || 500;
  const response = {
    success: false,
    message: err.message || "Erreur interne du serveur",
    ...(requestId && { requestId }),
  };

  if (status === 429) {
    const retryAfter = err.retryAfter || 60;
    res.setHeader("Retry-After", String(retryAfter));
  }

  return res.status(status).json(response);
}

module.exports = errorMiddleware;
