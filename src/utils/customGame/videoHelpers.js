/**
 * Parses a YouTube URL and returns video metadata.
 * Supports:
 *   - youtube.com/watch?v=ID
 *   - youtu.be/ID
 *   - youtube.com/embed/ID
 *   - youtube.com/shorts/ID
 * Returns null for unrecognized URLs.
 */
export function parseVideoUrl(url) {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();

  // YouTube patterns
  const ytPatterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  ];

  for (const pattern of ytPatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const videoId = match[1];
      return {
        platform: "youtube",
        videoId,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1`,
      };
    }
  }

  return null;
}
