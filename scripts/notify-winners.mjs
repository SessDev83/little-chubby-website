#!/usr/bin/env node
/**
 * Notify Lottery Winners via Resend
 * Fetches un-notified winners from Supabase, sends bilingual claim emails,
 * and marks them as notified.
 *
 * Usage:  node scripts/notify-winners.mjs [--dry-run]
 *
 * Required env vars:
 *   PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
 */

// ─── Config ────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "Little Chubby Press <hello@littlechubbypress.com>";
const SITE_URL = "https://www.littlechubbypress.com";
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!RESEND_API_KEY && !DRY_RUN) {
  console.error("Missing RESEND_API_KEY (use --dry-run to preview)");
  process.exit(1);
}

// ─── Supabase REST helper ──────────────────────────────────────────────────
async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase GET ${path}: ${res.status}`);
  return res.json();
}

async function supabasePatch(table, id, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${table}/${id}: ${res.status}`);
}

async function supabaseRpc(fn, args) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase RPC ${fn}: ${res.status} ${err}`);
  }
  return res.json();
}

// ─── Email templates ───────────────────────────────────────────────────────
function subjectLine(lang) {
  return lang === "es"
    ? "🎉 ¡Ganaste el sorteo de Little Chubby Press!"
    : "🎉 You Won the Little Chubby Press Giveaway!";
}

function emailHtml(winner, lang) {
  const claimUrl = `${SITE_URL}/${lang}/lottery/`;
  const displayName = winner.display_name || (lang === "es" ? "Ganador/a" : "Winner");

  if (lang === "es") {
    return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f6f1e7;margin:0;padding:0;">
  <div style="max-width:520px;margin:2rem auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="background:#d3a442;padding:1.5rem 2rem;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:1.6rem;">🎉 ¡Felicidades, ${displayName}!</h1>
    </div>
    <div style="padding:1.5rem 2rem;">
      <p style="font-size:1rem;color:#2f261f;line-height:1.6;">
        ¡Fuiste seleccionado/a como ganador/a del sorteo mensual de <strong>Little Chubby Press</strong>!
      </p>
      <p style="font-size:1rem;color:#2f261f;line-height:1.6;">
        Tienes <strong>7 días</strong> para reclamar tu premio. Visita tu página de sorteo y elige el libro que deseas recibir.
      </p>
      <div style="text-align:center;margin:1.5rem 0;">
        <a href="${claimUrl}" style="display:inline-block;background:#d3a442;color:#fff;font-weight:700;padding:0.8rem 2rem;border-radius:8px;text-decoration:none;font-size:1rem;">
          Reclamar mi Premio
        </a>
      </div>
      <p style="font-size:0.85rem;color:#4b4239;">
        Si no reclamas dentro de 7 días, tu premio podría transferirse a otro participante.
      </p>
    </div>
    <div style="background:#fffaf2;padding:1rem 2rem;text-align:center;font-size:0.8rem;color:#4b4239;">
      Little Chubby Press &bull; <a href="${SITE_URL}" style="color:#1f4f86;">littlechubbypress.com</a>
    </div>
  </div>
</body>
</html>`;
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f6f1e7;margin:0;padding:0;">
  <div style="max-width:520px;margin:2rem auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="background:#d3a442;padding:1.5rem 2rem;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:1.6rem;">🎉 Congratulations, ${displayName}!</h1>
    </div>
    <div style="padding:1.5rem 2rem;">
      <p style="font-size:1rem;color:#2f261f;line-height:1.6;">
        You've been selected as a winner in the <strong>Little Chubby Press</strong> monthly giveaway!
      </p>
      <p style="font-size:1rem;color:#2f261f;line-height:1.6;">
        You have <strong>7 days</strong> to claim your prize. Visit your giveaway page to choose which book you'd like to receive.
      </p>
      <div style="text-align:center;margin:1.5rem 0;">
        <a href="${claimUrl}" style="display:inline-block;background:#d3a442;color:#fff;font-weight:700;padding:0.8rem 2rem;border-radius:8px;text-decoration:none;font-size:1rem;">
          Claim My Prize
        </a>
      </div>
      <p style="font-size:0.85rem;color:#4b4239;">
        If you don't claim within 7 days, your prize may be transferred to another participant.
      </p>
    </div>
    <div style="background:#fffaf2;padding:1rem 2rem;text-align:center;font-size:0.8rem;color:#4b4239;">
      Little Chubby Press &bull; <a href="${SITE_URL}" style="color:#1f4f86;">littlechubbypress.com</a>
    </div>
  </div>
</body>
</html>`;
}

// ─── Send email via Resend ─────────────────────────────────────────────────
async function sendEmail(to, subject, html) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err}`);
  }
  return res.json();
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN — no emails will be sent\n" : "📧 Sending winner notifications...\n");

  // Fetch un-notified winners with their profile data
  const winners = await supabaseGet(
    "lottery_winners?notified=eq.false&select=id,user_id,month,claimed,profiles(email,display_name,lang_pref)"
  );

  if (!winners.length) {
    console.log("✅ No un-notified winners found. Nothing to do.");
    return;
  }

  console.log(`Found ${winners.length} winner(s) to notify:\n`);

  let sent = 0;
  let failed = 0;

  for (const w of winners) {
    const profile = w.profiles;
    if (!profile?.email) {
      console.log(`⚠️  Winner ${w.id} (user ${w.user_id}) — no email on profile, skipping`);
      failed++;
      continue;
    }

    const lang = profile.lang_pref === "es" ? "es" : "en";
    const subject = subjectLine(lang);
    const html = emailHtml({ display_name: profile.display_name }, lang);

    console.log(`  → ${profile.display_name || profile.email} (${lang}) — ${w.month}`);

    if (DRY_RUN) {
      console.log(`    [DRY RUN] Would send: "${subject}" to ${profile.email}`);
      sent++;
      continue;
    }

    try {
      await sendEmail(profile.email, subject, html);
      await supabasePatch("lottery_winners", w.id, { notified: true });
      // Idempotent +20 🥜 bonus for the winner (master plan §14 / L4)
      try {
        const result = await supabaseRpc("grant_giveaway_bonus", {
          p_winner_id: w.id,
          p_amount: 20,
        });
        const row = Array.isArray(result) ? result[0] : result;
        const status = row?.status || "unknown";
        if (status === "granted") {
          console.log(`    🥜 +20 granted (balance: ${row?.new_balance ?? "?"})`);
        } else if (status === "already_granted") {
          console.log(`    🥜 bonus already granted (balance: ${row?.new_balance ?? "?"})`);
        } else {
          console.log(`    ⚠️  bonus status: ${status}`);
        }
      } catch (bonusErr) {
        // Don't fail the whole notification if bonus RPC errors — just log.
        console.error(`    ⚠️  Bonus RPC failed: ${bonusErr.message}`);
      }
      console.log(`    ✅ Sent & marked notified`);
      sent++;
    } catch (err) {
      console.error(`    ❌ Failed: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${sent} sent, ${failed} failed`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
