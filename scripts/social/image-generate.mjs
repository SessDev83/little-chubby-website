/**
 * AI image generation for social media posts.
 * Uses Nano Banana API (nanobananaapi.dev) for brand-consistent visuals.
 * Returns a public URL directly — no storage upload needed.
 *
 * Required env var:
 *   NANO_BANANA_API_KEY — API key from https://nanobananaapi.dev/settings/apikeys
 *
 * Falls back gracefully: if no key is set, posts go out text-only
 * (Instagram is skipped when no image is available).
 */

const API_URL = "https://api.nanobananaapi.dev/v1/images/generate";
const MODEL = "gemini-2.5-flash-image";

// ─── Brand visual guidelines (prepended to every prompt) ────────────────────

const BRAND_STYLE = `Style guidelines (MUST follow):
- Soft watercolor / digital illustration style, children's book aesthetic
- Warm color palette: soft yellows, corals, sky blues, gentle greens, creamy whites
- Mood: joyful, cozy, wholesome, inviting
- Diverse representation: different skin tones, hair types, family structures
- Subjects may include: children coloring, art supplies, families together, open coloring books, crayons, creative play
- NO text, words, letters, logos, or watermarks anywhere in the image
- NO scary, violent, or inappropriate elements
- Clean composition, uncluttered, suitable as a social media post image
- Square 1:1 aspect ratio
- Bright, well-lit scene with soft shadows`;

// ─── Nano Banana image generation ───────────────────────────────────────────

/**
 * Generate a brand-consistent image using Nano Banana API.
 * Returns a public URL + downloaded buffer for Bluesky uploads.
 *
 * @param {string} prompt - Descriptive prompt from Claude
 * @returns {Promise<{ buffer: Buffer, mimeType: string, url: string } | null>}
 */
export async function generateImage(prompt) {
  const apiKey = process.env.NANO_BANANA_API_KEY;
  if (!apiKey) return null;

  const fullPrompt = `${BRAND_STYLE}\n\nScene to illustrate:\n${prompt}`;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: fullPrompt,
      num: 1,
      model: MODEL,
      image_size: "1:1",
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Nano Banana image generation failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  if (json.code !== 0) {
    throw new Error(`Nano Banana error: ${json.message}`);
  }

  // API returns url as string (single image) or array (multiple)
  const url = Array.isArray(json.data?.url) ? json.data.url[0] : json.data?.url;
  if (!url) throw new Error("Nano Banana returned no image URL");

  // Download the image to get a buffer (needed for Bluesky blob upload)
  const { buffer, mimeType } = await downloadImage(url);

  return { buffer, mimeType, url };
}

/**
 * Download an image from a URL and return it as a Buffer + MIME type.
 * Used to download book covers, blog images, and AI-generated images.
 * @param {string} url
 * @returns {Promise<{ buffer: Buffer, mimeType: string }>}
 */
export async function downloadImage(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Image download failed (${res.status})`);

  const contentType = res.headers.get("content-type") || "image/png";
  const arrayBuffer = await res.arrayBuffer();

  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: contentType.split(";")[0].trim(),
  };
}
