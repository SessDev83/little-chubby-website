# Security Baseline

This project includes a static Astro site plus social automation workflows.
Use this checklist to keep deployment and automation secure.

## Immediate Actions

- Never share API tokens in chat, terminal, screenshots, or logs.
- Revoke and regenerate any token that was accidentally exposed.

## Secrets Handling

- Never commit `.env`, `.env.local`, or token files.
- Store runtime secrets in GitHub Actions secrets:
  - `BLUESKY_HANDLE`, `BLUESKY_PASSWORD`
  - `ANTHROPIC_API_KEY`
  - (Optional) `META_PAGE_ACCESS_TOKEN`, `META_PAGE_ID`, `META_IG_USER_ID`

## Workflow Hardening

- Workflows use minimum required permission: `contents: read`.
- Concurrency prevents accidental overlap.
- Runtime timeouts reduce runaway jobs.
- Manual dispatch defaults to dry run for safer testing.

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
2. Run `node scripts/social/post.mjs generate --type book-promo --lang en` to preview content.
3. Trigger `.github/workflows/social-post.yml` with `dry_run=true`.
