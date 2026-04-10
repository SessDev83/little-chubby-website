/**
 * Facebook Pages + Instagram connector via Meta Graph API.
 *
 * Required env vars:
 *   META_PAGE_ACCESS_TOKEN  — Long-lived Page Access Token
 *   META_PAGE_ID            — Your Facebook Page ID
 *   META_IG_USER_ID         — Your Instagram Business Account ID (optional, for IG posts)
 *
 * How to get these:
 * 1. Go to https://developers.facebook.com and create an app (Business type)
 * 2. Add "Pages API" and "Instagram Graph API" products
 * 3. Generate a Page Access Token with pages_manage_posts + instagram_basic +
 *    instagram_content_publish permissions
 * 4. Exchange short-lived token for a long-lived one (60 days)
 * 5. Your Page ID is in your Facebook Page > About > Page ID
 * 6. Your IG User ID: GET /{page-id}?fields=instagram_business_account
 */

const GRAPH_API = "https://graph.facebook.com/v21.0";

/**
 * Post a text (+ optional link/image) to your Facebook Page.
 * @param {string} message - Post text.
 * @param {object} [options]
 * @param {string} [options.link] - URL to attach as a link preview.
 * @param {string} [options.imageUrl] - Public URL of an image to post.
 * @returns {{ id: string }}
 */
export async function postToFacebook(message, options = {}) {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;

  if (!token || !pageId) {
    throw new Error("Missing META_PAGE_ACCESS_TOKEN or META_PAGE_ID env vars");
  }

  let endpoint;
  const params = new URLSearchParams({
    access_token: token,
    message,
  });

  if (options.imageUrl) {
    // Post as photo
    endpoint = `${GRAPH_API}/${encodeURIComponent(pageId)}/photos`;
    params.set("url", options.imageUrl);
  } else {
    // Post as text/link
    endpoint = `${GRAPH_API}/${encodeURIComponent(pageId)}/feed`;
    if (options.link) {
      params.set("link", options.link);
    }
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Facebook post failed (${res.status}): ${body}`);
  }

  return res.json();
}

/**
 * Post an image + caption to Instagram Business Account.
 * Instagram API requires a publicly accessible image URL (not a local file).
 *
 * @param {string} caption - Post caption.
 * @param {string} imageUrl - Public URL of the image.
 * @returns {{ id: string }}
 */
export async function postToInstagram(caption, imageUrl) {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const igUserId = process.env.META_IG_USER_ID;

  if (!token || !igUserId) {
    throw new Error("Missing META_PAGE_ACCESS_TOKEN or META_IG_USER_ID env vars");
  }

  // Step 1: Create media container
  const containerRes = await fetch(`${GRAPH_API}/${encodeURIComponent(igUserId)}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      image_url: imageUrl,
      caption,
      access_token: token,
    }).toString(),
  });

  if (!containerRes.ok) {
    const body = await containerRes.text();
    throw new Error(`Instagram container creation failed (${containerRes.status}): ${body}`);
  }

  const { id: containerId } = await containerRes.json();

  // Step 2: Wait for the container to finish processing
  //         Instagram needs time to download + process the image before publishing.
  const maxAttempts = 10;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const statusRes = await fetch(
      `${GRAPH_API}/${encodeURIComponent(containerId)}?fields=status_code&access_token=${encodeURIComponent(token)}`
    );
    if (statusRes.ok) {
      const { status_code } = await statusRes.json();
      if (status_code === "FINISHED") break;
      if (status_code === "ERROR") {
        throw new Error("Instagram container processing failed (status: ERROR)");
      }
    }
    if (attempt === maxAttempts) {
      throw new Error("Instagram container not ready after polling — timed out");
    }
    await new Promise((r) => setTimeout(r, 2000)); // wait 2s between polls
  }

  // Step 3: Publish the container
  const publishRes = await fetch(`${GRAPH_API}/${encodeURIComponent(igUserId)}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      creation_id: containerId,
      access_token: token,
    }).toString(),
  });

  if (!publishRes.ok) {
    const body = await publishRes.text();
    throw new Error(`Instagram publish failed (${publishRes.status}): ${body}`);
  }

  return publishRes.json();
}
