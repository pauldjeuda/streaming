const fs = require("fs");
const path = require("path");
const Video = require("../modules/videos/video.model");
const env = require("../config/env");
const { getVideoMetadata } = require("../lib/ffprobe");
const { generateThumbnail } = require("../lib/thumbnail");
const { generateHls, createMasterPlaylist } = require("../lib/hls");

async function processVideo(videoId) {
  console.log("processVideo appelé avec :", videoId.toString());

  const video = await Video.findById(videoId);

  if (!video) {
    throw new Error("Vidéo introuvable");
  }

  console.log("Vidéo trouvée :", video._id.toString());

  const originalAbsolutePath = path.join(process.cwd(), video.originalPath);
  const mediaRootRelative = `${env.mediaDir}/${video._id}`;
  const mediaRootAbsolute = path.join(process.cwd(), mediaRootRelative);

  console.log("Chemin vidéo source :", originalAbsolutePath);
  console.log("Dossier média :", mediaRootAbsolute);

  try {
    video.status = "processing";
    video.errorMessage = null;
    await video.save();

    console.log("Statut passé à processing");

    if (!fs.existsSync(mediaRootAbsolute)) {
      fs.mkdirSync(mediaRootAbsolute, { recursive: true });
    }

    console.log("Lecture métadonnées...");
    const meta = await getVideoMetadata(originalAbsolutePath);
    console.log("Métadonnées OK :", meta);

    console.log("Génération miniature...");
    const thumbAbsolutePath = await generateThumbnail(
      originalAbsolutePath,
      mediaRootAbsolute
    );
    console.log("Miniature OK :", thumbAbsolutePath);

    console.log("Génération HLS...");
    const hlsResult = await generateHls(originalAbsolutePath, mediaRootAbsolute);
    console.log("HLS OK :", hlsResult);

    console.log("Création master playlist...");
    const masterAbsolutePath = createMasterPlaylist(mediaRootAbsolute);
    console.log("Master playlist OK :", masterAbsolutePath);

    const thumbnailRelative = path
      .relative(process.cwd(), thumbAbsolutePath)
      .replace(/\\/g, "/");

    const hlsMasterRelative = path
      .relative(process.cwd(), masterAbsolutePath)
      .replace(/\\/g, "/");

    const playlistRelative = path
      .relative(process.cwd(), hlsResult.playlistPath)
      .replace(/\\/g, "/");

    video.mediaRootPath = mediaRootRelative.replace(/\\/g, "/");
    video.hlsMasterPath = hlsMasterRelative;
    video.thumbnailPath = thumbnailRelative;
    video.duration = meta.duration;
    video.width = meta.width;
    video.height = meta.height;
    video.aspectRatio = meta.aspectRatio;
    video.variants = [
      {
        name: "720p",
        bandwidth: 1400000,
        resolution: "720x1280",
        playlistPath: playlistRelative,
      },
    ];
    video.status = "ready";

    await video.save();

    console.log("Processing terminé pour la vidéo", video._id.toString());
  } catch (error) {
    video.status = "failed";
    video.errorMessage = error.message;
    await video.save();

    console.error("Erreur processing vidéo :", error);
  }
}

module.exports = {
  processVideo,
};