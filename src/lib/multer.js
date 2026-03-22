const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const env = require("../config/env");

const absoluteOriginalsDir = path.join(process.cwd(), env.originalsDir);

if (!fs.existsSync(absoluteOriginalsDir)) {
  fs.mkdirSync(absoluteOriginalsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, absoluteOriginalsDir);
  },
  filename(req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${extension}`;
    cb(null, filename);
  },
});

function fileFilter(req, file, cb) {
  const allowedMimeTypes = [
    "video/mp4",
    "video/quicktime",
    "video/x-matroska",
    "video/webm",
    "video/x-msvideo",
    "video/avi",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Type de fichier non autorisé. Envoie une vidéo valide."));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.uploadMaxBytes,
  },
});

module.exports = upload;
