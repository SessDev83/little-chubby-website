import type { APIRoute } from "astro";
import { supabase, getServiceClient } from "../../lib/supabase";

export const prerender = false;

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

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

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = /^(jpg|jpeg|png|webp)$/.test(ext) ? ext : "jpg";
  const path = `${user.id}/avatar.${safeExt}`;

  const sc = getServiceClient();
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await sc.storage
    .from("avatars")
    .upload(path, bytes, {
      contentType: file.type,
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
