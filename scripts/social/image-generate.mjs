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
// Model Apr 2026: gemini-2.5-flash-image-hd (5 credits) for social.
// Upgrade from base gemini-2.5-flash-image (2 credits) — HD output, same speed.
// Gemini 3 Pro 2K proved too slow (>240s timeouts) for the scheduler; reserved for blog heroes.
// Override via NANO_BANANA_MODEL env for experiments.
const MODEL = process.env.NANO_BANANA_MODEL || "gemini-2.5-flash-image-hd";

// ─── Brand visual guidelines (prepended to every prompt) ────────────────────
// Shared brand style — used by social posts AND blog hero images.
// Based on the Little Chubby Press identity: cute baby elephant mascot with
// a green-yellow crayon, warm paper tones, children's coloring book aesthetic.

export const BRAND_STYLE = `Style guidelines (MUST follow strictly):
- Kawaii / soft watercolor children's book illustration style
- Warm palette matching a cozy coloring book brand: creamy paper whites (#f6f1e7), soft yellows, gentle corals (#d9825f), sky blues, warm browns (#754624), sage greens (#5c9650), touches of gold (#d3a442)
- Brand mascot: a cute chubby baby elephant — include as a subtle element when natural (small, in a corner or background, NOT dominating the scene)
- Characters should be diverse children (different skin tones, hair types) aged 3-8 years old
- Mood: joyful, cozy, wholesome, inviting, warm and fuzzy
- Art supplies visible when relevant: crayons, colored pencils, open coloring books
- NO text, words, letters, logos, or watermarks ANYWHERE in the image
- NO scary, violent, or inappropriate elements
- Clean uncluttered composition with soft rounded shapes
- Bright, well-lit scene with soft watercolor edges and gentle shadows
- Background should feel warm and papery, like a coloring book page come to life
- Square 1:1 aspect ratio`;

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
    signal: AbortSignal.timeout(240_000),
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
