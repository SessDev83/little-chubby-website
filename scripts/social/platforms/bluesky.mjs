/**
 * Bluesky (AT Protocol) connector.
 * Posts text (and optionally an image) to your Bluesky account.
 *
 * Required env vars:
 *   BLUESKY_HANDLE   — e.g. "littlechubbypress.bsky.social"
 *   BLUESKY_PASSWORD  — an App Password (NOT your main password)
 *
 * Create an App Password at: https://bsky.app/settings/app-passwords
 */

import sharp from "sharp";

const BLUESKY_SERVICE = "https://bsky.social";
const BLUESKY_MAX_BLOB = 1_000_000; // 1 MB AT Protocol limit

/**
 * Authenticate and return session tokens.
 */
async function createSession(handle, password) {
  const res = await fetch(`${BLUESKY_SERVICE}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: handle, password }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bluesky auth failed (${res.status}): ${body}`);
  }

  return res.json(); // { did, handle, accessJwt, refreshJwt }
}

/**
 * Upload an image blob (for embedding in a post).
 * @param {string} accessJwt
 * @param {Buffer} imageBuffer
 * @param {string} mimeType - e.g. "image/png", "image/jpeg", "image/webp"
 * @returns {{ blob: object }}
 */
async function uploadImage(accessJwt, imageBuffer, mimeType) {
  // Compress if over Bluesky's 1 MB blob limit
  let finalBuffer = imageBuffer;
  let finalMimeType = mimeType;
  if (imageBuffer.length > BLUESKY_MAX_BLOB) {
    finalBuffer = await sharp(imageBuffer)
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    finalMimeType = "image/jpeg";
  }

  const res = await fetch(`${BLUESKY_SERVICE}/xrpc/com.atproto.repo.uploadBlob`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessJwt}`,
      "Content-Type": finalMimeType,
    },
    body: finalBuffer,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bluesky image upload failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.blob;
}

/**
 * Detect URLs in text and create facets for link embedding.
 */
function detectFacets(text) {
  const facets = [];
  const urlRegex = /https?:\/\/[^\s)]+/g;
  let match;
  const encoder = new TextEncoder();

  while ((match = urlRegex.exec(text)) !== null) {
    const beforeBytes = encoder.encode(text.slice(0, match.index)).byteLength;
    const urlBytes = encoder.encode(match[0]).byteLength;
    facets.push({
      index: { byteStart: beforeBytes, byteEnd: beforeBytes + urlBytes },
      features: [{ $type: "app.bsky.richtext.facet#link", uri: match[0] }],
    });
  }

  return facets;
}

/**
 * Post to Bluesky.
 * @param {string} text - The post text (max 300 chars).
 * @param {object} [options]
 * @param {Buffer} [options.imageBuffer] - Optional image to attach.
 * @param {string} [options.imageMimeType] - MIME type of the image.
 * @param {string} [options.imageAlt] - Alt text for the image.
 * @returns {{ uri: string, cid: string }}
 */
export async function postToBluesky(text, options = {}) {
  const handle = process.env.BLUESKY_HANDLE;
  const password = process.env.BLUESKY_PASSWORD;

  if (!handle || !password) {
    throw new Error("Missing BLUESKY_HANDLE or BLUESKY_PASSWORD env vars");
  }

  const session = await createSession(handle, password);
  const { did, accessJwt } = session;

  // Build post record
  const record = {
    $type: "app.bsky.feed.post",
    text,
    createdAt: new Date().toISOString(),
    facets: detectFacets(text),
  };

  // Attach link card embed if a URL is provided (appears as a clickable card below the post)
  if (options.linkUrl) {
    record.embed = {
      $type: "app.bsky.embed.external",
      external: {
        uri: options.linkUrl,
        title: options.linkTitle || "",
        description: options.linkDescription || "",
      },
    };
  }

  // Attach image embed if provided (overrides link card)
  if (options.imageBuffer) {
    const blob = await uploadImage(
      accessJwt,
      options.imageBuffer,
      options.imageMimeType || "image/png"
    );
    record.embed = {
      $type: "app.bsky.embed.images",
      images: [{ alt: options.imageAlt || "", image: blob }],
    };
  }

  const res = await fetch(`${BLUESKY_SERVICE}/xrpc/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repo: did,
      collection: "app.bsky.feed.post",
      record,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bluesky post failed (${res.status}): ${body}`);
  }

  return res.json(); // { uri, cid }
}

// ─── Engagement functions ───────────────────────────────────────────────────

/**
 * Fetch notifications (replies, mentions, likes, follows).
 * @param {string} accessJwt
 * @param {string} [cursor] - Pagination cursor.
 * @returns {{ notifications: object[], cursor?: string }}
 */
async function listNotifications(accessJwt, cursor) {
  const params = new URLSearchParams({ limit: "50" });
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(
    `${BLUESKY_SERVICE}/xrpc/app.bsky.notification.listNotifications?${params}`,
    { headers: { Authorization: `Bearer ${accessJwt}` } }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bluesky listNotifications failed (${res.status}): ${body}`);
  }
  return res.json();
}

/**
 * Get replies and mentions directed at our account.
 * @returns {{ notifications: Array<{ uri, cid, author, reason, record, indexedAt }> }}
 */
export async function getNotifications() {
  const session = await createSession(
    process.env.BLUESKY_HANDLE,
    process.env.BLUESKY_PASSWORD
  );

  const data = await listNotifications(session.accessJwt);

  // Filter to replies and mentions only
  const relevant = (data.notifications || []).filter(
    (n) => n.reason === "reply" || n.reason === "mention"
  );

  // Mark as seen
  await fetch(`${BLUESKY_SERVICE}/xrpc/app.bsky.notification.updateSeen`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ seenAt: new Date().toISOString() }),
  });

  return { notifications: relevant, did: session.did };
}

/**
 * Reply to a Bluesky post.
 * @param {string} text - Reply text.
 * @param {{ uri: string, cid: string }} parent - The post being replied to.
 * @param {{ uri: string, cid: string }} root - The root post of the thread.
 * @returns {{ uri: string, cid: string }}
 */
export async function replyToPost(text, parent, root) {
  const session = await createSession(
    process.env.BLUESKY_HANDLE,
    process.env.BLUESKY_PASSWORD
  );

  const record = {
    $type: "app.bsky.feed.post",
    text,
    createdAt: new Date().toISOString(),
    facets: detectFacets(text),
    reply: {
      root: { uri: root.uri, cid: root.cid },
      parent: { uri: parent.uri, cid: parent.cid },
    },
  };

  const res = await fetch(`${BLUESKY_SERVICE}/xrpc/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repo: session.did,
      collection: "app.bsky.feed.post",
      record,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bluesky reply failed (${res.status}): ${body}`);
  }
  return res.json();
}

/**
 * Like a Bluesky post.
 * @param {{ uri: string, cid: string }} subject - The post to like.
 * @returns {{ uri: string, cid: string }}
 */
export async function likePost(subject) {
  const session = await createSession(
    process.env.BLUESKY_HANDLE,
    process.env.BLUESKY_PASSWORD
  );

  const res = await fetch(`${BLUESKY_SERVICE}/xrpc/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repo: session.did,
      collection: "app.bsky.feed.like",
      record: {
        $type: "app.bsky.feed.like",
        subject: { uri: subject.uri, cid: subject.cid },
        createdAt: new Date().toISOString(),
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bluesky like failed (${res.status}): ${body}`);
  }
  return res.json();
}

/**
 * Search public Bluesky posts by keyword.
 * @param {string} query - Search terms.
 * @param {number} [limit=25] - Max results.
 * @returns {{ posts: Array<{ uri, cid, author, record, indexedAt }> }}
 */
export async function searchPosts(query, limit = 25) {
  const session = await createSession(
    process.env.BLUESKY_HANDLE,
    process.env.BLUESKY_PASSWORD
  );

  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const res = await fetch(
    `${BLUESKY_SERVICE}/xrpc/app.bsky.feed.searchPosts?${params}`,
    { headers: { Authorization: `Bearer ${session.accessJwt}` } }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bluesky search failed (${res.status}): ${body}`);
  }
  return res.json();
}
