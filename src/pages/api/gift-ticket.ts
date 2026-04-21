import type { APIRoute } from "astro";
import { getServiceClient, supabase } from "../../lib/supabase";
import { emailUserGiftReceived, emailUserGiftInvite } from "../../lib/notifications";

export const prerender = false;

const MAX_PER_GIFT = 5;

export const POST: APIRoute = async ({ request, cookies }) => {
  const headers = { "Content-Type": "application/json" };

  try {
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers,
      });
    }

    const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionErr || !sessionData.session?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers,
      });
    }

    const user_id = sessionData.session.user.id;
    const body = await request.json().catch(() => ({}));
    const recipient_email = typeof body.recipient_email === "string" ? body.recipient_email : "";
    const qty = parseInt(body.quantity, 10);

    if (!qty || qty < 1 || qty > MAX_PER_GIFT) {
      return new Response(
        JSON.stringify({ error: `quantity must be between 1 and ${MAX_PER_GIFT}` }),
        { status: 400, headers }
      );
    }
    if (!recipient_email || recipient_email.length > 320 || !recipient_email.includes("@")) {
      return new Response(JSON.stringify({ error: "invalid_email" }), {
        status: 400, headers,
      });
    }

    const svc = getServiceClient();

    const { data: result, error: rpcErr } = await svc.rpc("gift_tickets", {
      p_sender_id: user_id,
      p_recipient_email: recipient_email,
      p_quantity: qty,
    });

    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), {
        status: 500, headers,
      });
    }

    const res = result as {
      success: boolean;
      pending?: boolean;
      error?: string;
      quantity?: number;
      sender_balance?: number;
      recipient_email?: string;
      expires_at?: string;
      token?: string;
      balance?: number;
      limit?: number;
    };

    if (!res.success) {
      // Map business errors to 4xx so the client can branch cleanly.
      const code =
        res.error === "rate_limit" ? 429 :
        res.error === "insufficient_tickets" ? 402 :
        res.error === "recipient_not_found" ? 404 :
        res.error === "self_gift_not_allowed" ? 400 :
        res.error === "invalid_quantity" ? 400 :
        res.error === "invalid_email" ? 400 : 403;
      return new Response(JSON.stringify(res), { status: code, headers });
    }

    // ── Fire-and-forget notification to the recipient ──
    // Best effort: failures must not fail the gift itself.
    try {
      const { data: sender } = await svc
        .from("profiles")
        .select("display_name, email, lang_pref")
        .eq("id", user_id)
        .maybeSingle();
      const senderDisplay =
        (sender?.display_name && sender.display_name.trim()) ||
        (sender?.email ? sender.email.split("@")[0] : "") ||
        "A friend";

      if (res.pending) {
        // No profile yet → invite the recipient to sign up.
        const inviteLang = sender?.lang_pref === "en" ? "en" : "es"; // fallback to sender's lang
        if (res.recipient_email && res.expires_at) {
          await emailUserGiftInvite(res.recipient_email, senderDisplay, qty, inviteLang, res.expires_at);
        }
      } else {
        // Direct gift → use recipient's own lang_pref.
        const normEmail = (res.recipient_email || recipient_email).toLowerCase().trim();
        const { data: recipient } = await svc
          .from("profiles")
          .select("lang_pref")
          .ilike("email", normEmail)
          .maybeSingle();
        const recipientLang = recipient?.lang_pref === "en" ? "en" : "es";
        if (res.recipient_email) {
          await emailUserGiftReceived(res.recipient_email, senderDisplay, qty, recipientLang);
        }
      }
    } catch (e) {
      console.warn("[gift-ticket] notify recipient failed:", (e as any)?.message);
    }

    return new Response(JSON.stringify(res), { status: 200, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Server error" }), {
      status: 500, headers,
    });
  }
};
