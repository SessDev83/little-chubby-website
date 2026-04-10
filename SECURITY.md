# Security Baseline

This project includes a static Astro site plus social automation workflows.
Use this checklist to keep deployment and automation secure.

## Immediate Actions

- Revoke any Make API token that was shared in chat, terminal, screenshots, or logs.
- Create a new Make API token only when needed, then revoke it after setup.
- Keep OAuth connections (Facebook/Instagram) managed inside Make only.

## Secrets Handling

- Never commit `.env`, `.env.local`, or token files.
- Store runtime secrets in GitHub Actions secrets:
  - `MAKE_WEBHOOK_URL`
  - `MAKE_WEBHOOK_SECRET`
- Optional host allowlist in repository variables:
  - `MAKE_WEBHOOK_ALLOWED_HOSTS`

## Webhook Security

The Make relay script applies these controls:

- Requires HTTPS webhook URLs.
- Restricts destination host to `*.make.com` unless explicitly overridden.
- Supports shared-secret validation via `X-Webhook-Secret`.
- Adds request signing headers:
  - `X-Webhook-Timestamp`
  - `X-Webhook-Signature` (HMAC-SHA256)

## Workflow Hardening

- Workflows use minimum required permission: `contents: read`.
- Concurrency prevents accidental overlap.
- Runtime timeouts reduce runaway jobs.
- Manual Make dispatch defaults to dry run for safer testing.

## Web App Security Headers

Vercel response headers are configured in `vercel.json`:

- Strict-Transport-Security
- X-Content-Type-Options
- X-Frame-Options
- Referrer-Policy
- Permissions-Policy
- Cross-Origin-Opener-Policy
- Cross-Origin-Resource-Policy
- Content-Security-Policy

## Verification Steps

1. Run `npm run build` and verify no errors.
2. Run `node scripts/social/make.mjs --type book-promo --lang en --dry-run`.
3. Trigger `.github/workflows/social-make.yml` with `dry_run=true`.
4. In Make, confirm webhook filter/signature checks before publish modules.
