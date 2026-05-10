const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-opus-4-7";

/**
 * Generate a caption and relevant tags for a video given its metadata.
 * @param {{ originalFilename: string, duration: number, width: number, height: number }} videoMeta
 * @returns {Promise<{ caption: string, tags: string[] }>}
 */
async function generateVideoCaption(videoMeta) {
  const { originalFilename, duration, width, height } = videoMeta;

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 512,
    thinking: { type: "adaptive" },
    system:
      "You are a creative social-media assistant for a short-video platform. " +
      "Respond ONLY with valid JSON, no markdown.",
    messages: [
      {
        role: "user",
        content:
          `Generate a catchy caption (max 150 chars) and 5 relevant hashtag tags for a video.\n` +
          `Video info: filename="${originalFilename}", duration=${duration}s, resolution=${width}x${height}.\n` +
          `Return JSON: { "caption": "...", "tags": ["tag1", "tag2", ...] }`,
      },
    ],
  });

  const message = await stream.finalMessage();
  const text = message.content.find((b) => b.type === "text")?.text ?? "{}";

  try {
    return JSON.parse(text);
  } catch {
    return { caption: "", tags: [] };
  }
}

/**
 * Moderate a video caption — returns whether it's safe and a reason if not.
 * @param {string} caption
 * @returns {Promise<{ safe: boolean, reason: string | null }>}
 */
async function moderateCaption(caption) {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 256,
    system:
      "You are a content-moderation assistant. " +
      "Respond ONLY with valid JSON, no markdown.",
    messages: [
      {
        role: "user",
        content:
          `Evaluate whether the following video caption violates community guidelines ` +
          `(hate speech, violence, explicit content, spam).\n` +
          `Caption: "${caption}"\n` +
          `Return JSON: { "safe": true|false, "reason": "..." or null }`,
      },
    ],
  });

  const message = await stream.finalMessage();
  const text = message.content.find((b) => b.type === "text")?.text ?? "{}";

  try {
    return JSON.parse(text);
  } catch {
    return { safe: true, reason: null };
  }
}

/**
 * Given a list of video summaries from the feed, rank them for a specific user profile.
 * @param {Array<{ id: string, caption: string, tags: string[], stats: object }>} videos
 * @param {{ interests: string[], watchHistory: string[] }} userProfile
 * @returns {Promise<string[]>} Ordered list of video IDs
 */
async function rankVideosForUser(videos, userProfile) {
  if (!videos.length) return [];

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system:
      "You are a recommendation engine for a short-video platform. " +
      "Respond ONLY with valid JSON, no markdown.",
    messages: [
      {
        role: "user",
        content:
          `Rank the following videos for a user with these interests: ${userProfile.interests.join(", ")}.\n` +
          `User recently watched IDs: ${userProfile.watchHistory.join(", ") || "none"}.\n\n` +
          `Videos:\n${JSON.stringify(videos, null, 2)}\n\n` +
          `Return JSON: { "rankedIds": ["id1", "id2", ...] } — all IDs, best first.`,
      },
    ],
  });

  const message = await stream.finalMessage();
  const text = message.content.find((b) => b.type === "text")?.text ?? "{}";

  try {
    const { rankedIds } = JSON.parse(text);
    return Array.isArray(rankedIds) ? rankedIds : videos.map((v) => v.id);
  } catch {
    return videos.map((v) => v.id);
  }
}

module.exports = { generateVideoCaption, moderateCaption, rankVideosForUser };
