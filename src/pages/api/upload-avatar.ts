import type { APIRoute } from "astro";
import sharp from "sharp";
import { supabase, getServiceClient } from "../../lib/supabase";

export const prerender = false;

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_SIZE = 512;       // px — square crop, suficiente para retina @256
const AVATAR_QUALITY = 82;     // JPEG quality — balance nitidez/tamaño

export const POST: APIRoute = async ({ cookies, request }) => {
  const access = cookies.get("sb-access-token")?.value;
  const refresh = cookies.get("sb-refresh-token")?.value;
  if (!access || !refresh) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401 });
  }

  const { data: { user }, error: authErr } = await supabase.auth.setSession({
    access_token: access,
    refresh_token: refresh,
  });
  if (authErr || !user) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401 });
  }

  const sc = getServiceClient();

  // ── Rate limit: max 10 avatar uploads per hour per user ──
  // Uses credit_transactions as accounting table (amount=0, no balance impact).
  // Migration 054 whitelists 'avatar_upload' as a valid reason.
  const { data: underLimit } = await sc.rpc("check_rate_limit", {
    p_user_id: user.id,
    p_action: "avatar_upload",
    p_max_per_hour: 10,
  });
  if (underLimit === false) {
    return new Response(
      JSON.stringify({ ok: false, error: "rate_limited" }),
      { status: 429 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid form" }), { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ ok: false, error: "missing file" }), { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return new Response(JSON.stringify({ ok: false, error: "file too large" }), { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return new Response(JSON.stringify({ ok: false, error: "invalid type" }), { status: 400 });
  }

  // ── Re-encode with sharp: strips EXIF (GPS, camera metadata), resizes, optimizes ──
  // All avatars normalized to 512×512 JPEG @ q=82. Source format (png/webp/jpeg) is
  // discarded — we always output JPEG for consistency and maximum compatibility.
  // sharp.rotate() respects EXIF Orientation BEFORE strip, so portraits stay upright.
  let processedBuffer: Buffer;
  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    processedBuffer = await sharp(inputBuffer, { failOn: "error" })
      .rotate()                                   // honor EXIF Orientation
      .resize(AVATAR_SIZE, AVATAR_SIZE, {
        fit: "cover",
        position: "centre",
      })
      .jpeg({ quality: AVATAR_QUALITY, mozjpeg: true })
      .toBuffer();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "invalid image" }),
      { status: 400 }
    );
  }

  // Always store as .jpg after re-encode (sharp normalizes all formats to JPEG).
  const path = `${user.id}/avatar.jpg`;

  const { error: upErr } = await sc.storage
    .from("avatars")
    .upload(path, processedBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (upErr) {
    return new Response(JSON.stringify({ ok: false, error: "upload failed" }), { status: 500 });
  }

  const { data: pub } = sc.storage.from("avatars").getPublicUrl(path);
  const publicUrl = `${pub.publicUrl}?t=${Date.now()}`;

  const { error: profErr } = await sc
    .from("profiles")
    .update({ avatar_url: publicUrl.split("?")[0] })
    .eq("id", user.id);

  if (profErr) {
    return new Response(JSON.stringify({ ok: false, error: "profile update failed" }), { status: 500 });
  }

  // Log upload for rate-limit accounting (amount=0, no credit effect).
  // Unique ref_id per upload — no collision risk (no unique constraint on
  // credit_transactions for reason='avatar_upload'; see migration 025).
  await sc.from("credit_transactions").insert({
    user_id: user.id,
    amount: 0,
    reason: "avatar_upload",
    ref_id: crypto.randomUUID(),
  });

  return new Response(JSON.stringify({ ok: true, url: publicUrl }), { status: 200 });
};

export const DELETE: APIRoute = async ({ cookies }) => {
  const access = cookies.get("sb-access-token")?.value;
  const refresh = cookies.get("sb-refresh-token")?.value;
  if (!access || !refresh) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401 });
  }

  const { data: { user }, error: authErr } = await supabase.auth.setSession({
    access_token: access,
    refresh_token: refresh,
  });
  if (authErr || !user) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401 });
  }

  const sc = getServiceClient();

  // Try to remove any existing avatar files for this user
  const { data: files } = await sc.storage.from("avatars").list(user.id, { limit: 10 });
  if (files && files.length > 0) {
    const paths = files.map((f) => `${user.id}/${f.name}`);
    await sc.storage.from("avatars").remove(paths);
  }

  const { error: profErr } = await sc
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (profErr) {
    return new Response(JSON.stringify({ ok: false, error: "profile update failed" }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
