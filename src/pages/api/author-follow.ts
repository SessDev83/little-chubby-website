import type { APIRoute } from "astro";

export const prerender = false;

const COOKIE_NAME = "lcp-author-follows";
const MAX_AUTHORS = 24;
const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function cleanAuthorId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return /^[a-z0-9_-]{2,64}$/i.test(text) ? text : null;
}

function readFollowSet(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(raw.split(",").map(cleanAuthorId).filter((id): id is string => Boolean(id)));
}

function writeFollowCookie(cookies: Parameters<APIRoute>[0]["cookies"], follows: Set<string>, secure: boolean) {
  const value = [...follows].slice(0, MAX_AUTHORS).join(",");
  cookies.set(COOKIE_NAME, value, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: 60 * 60 * 24 * 365,
  });
}

export const GET: APIRoute = async ({ url, cookies }) => {
  const authorId = cleanAuthorId(url.searchParams.get("author_id"));
  if (!authorId) {
    return new Response(JSON.stringify({ error: "invalid_author_id" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const follows = readFollowSet(cookies.get(COOKIE_NAME)?.value);
  return new Response(JSON.stringify({ author_id: authorId, following: follows.has(authorId) }), {
    status: 200,
    headers: JSON_HEADERS,
  });
};

export const POST: APIRoute = async ({ request, cookies, url }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const authorId = cleanAuthorId(body.author_id);
  if (!authorId) {
    return new Response(JSON.stringify({ error: "invalid_author_id" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const following = Boolean(body.following);
  const follows = readFollowSet(cookies.get(COOKIE_NAME)?.value);

  if (following) {
    follows.add(authorId);
  } else {
    follows.delete(authorId);
  }

  writeFollowCookie(cookies, follows, url.protocol === "https:");

  return new Response(JSON.stringify({ author_id: authorId, following: follows.has(authorId) }), {
    status: 200,
    headers: JSON_HEADERS,
  });
};
