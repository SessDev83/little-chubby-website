# Social Media Automation — Setup Guide

## Overview

This system auto-generates and publishes social media posts to promote
Little Chubby Press books and drive traffic to the website + Amazon listings.

**Supported platforms:** Bluesky, Facebook Pages, Instagram Business

**Content types:**
- `book-promo` — Spotlight a book with description + Amazon link
- `blog-share` — Share a blog post with link to the website
- `engagement` — Tips, questions, parenting content (no product push)
- `review-request` — Ask readers to leave Amazon reviews

---

## Quick Start (Bluesky — 5 minutes)

Bluesky is free, requires no approval, and works immediately.

### 1. Create a Bluesky account

Go to [bsky.app](https://bsky.app) and create your account:
- Handle: `littlechubbypress.bsky.social`

### 2. Create an App Password

Go to **Settings → App Passwords → Add App Password**
Copy the generated password.

### 3. Add to your `.env` file

```env
BLUESKY_HANDLE=littlechubbypress.bsky.social
BLUESKY_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

### 4. Test it

```bash
# Preview a post (no publishing)
npm run social:generate -- --type book-promo --lang en

# Preview a full week of content
npm run social:calendar -- --lang en

# Dry run (simulates posting)
npm run social:post -- --platform bluesky --type engagement --dry-run

# Actually post to Bluesky
npm run social:post -- --platform bluesky --type book-promo --lang en
```

---

## Facebook Pages Setup

### 1. Create a Facebook Developer App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a new app (type: **Business**)
3. Add the **Facebook Login** and **Pages API** products

### 2. Get a Page Access Token

1. In Graph API Explorer, select your app
2. Select your Facebook Page
3. Request permissions: `pages_manage_posts`, `pages_read_engagement`
4. Generate Access Token
5. **Exchange for long-lived token** (lasts 60 days):

```
GET https://graph.facebook.com/v21.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id=YOUR_APP_ID
  &client_secret=YOUR_APP_SECRET
  &fb_exchange_token=YOUR_SHORT_LIVED_TOKEN
```

### 3. Get your Page ID

Go to your Facebook Page → **About** → Page ID (or use Graph API Explorer:
`GET /me/accounts`).

### 4. Add to `.env`

```env
META_PAGE_ACCESS_TOKEN=EAAG...long_token
META_PAGE_ID=123456789
```

---

## Instagram Business Setup

### 1. Prerequisites

- A Facebook Page connected to your Instagram Business account
- Completed Facebook setup above

### 2. Get your Instagram Business Account ID

```
GET /{page-id}?fields=instagram_business_account&access_token=YOUR_TOKEN
```

### 3. Add to `.env`

```env
META_IG_USER_ID=17841400...
```

### 4. Important: Instagram requires public image URLs

Instagram API cannot upload local files. Your book cover images must be publicly
accessible URLs. Images hosted on your Vercel site work:
`https://www.littlechubbypress.com/images/books/magical-creatures.webp`

---

## Automated Scheduling (GitHub Actions)

The workflow at `.github/workflows/social-post.yml` posts automatically:

| Day       | Type            |
|-----------|-----------------|
| Monday    | Book promo      |
| Tuesday   | Engagement      |
| Wednesday | Blog share      |
| Thursday  | Book promo      |
| Friday    | Engagement      |
| Saturday  | Review request  |

### Setup

1. Go to your GitHub repo → **Settings → Secrets and variables → Actions**
2. Add these secrets:
   - `BLUESKY_HANDLE`
   - `BLUESKY_PASSWORD`
   - (Optional) `META_PAGE_ACCESS_TOKEN`, `META_PAGE_ID`, `META_IG_USER_ID`

3. The workflow runs at **10:00 AM ET** every weekday + Saturday.

### Manual trigger

You can also trigger posts manually from the **Actions** tab →
**Social Media Auto-Post** → **Run workflow** and select type/platform/language.

---

## CLI Reference

```bash
# Generate (preview only)
node scripts/social/post.mjs generate --type <type> --lang <lang> [--book <id>]

# Post (publish)
node scripts/social/post.mjs post --platform <platform> --type <type> --lang <lang> [--book <id>] [--dry-run]

# Calendar (preview 7-day plan)
node scripts/social/post.mjs calendar --lang <lang>
```

**Platforms:** `bluesky`, `facebook`, `instagram`, `all`
**Types:** `book-promo`, `blog-share`, `engagement`, `review-request`
**Languages:** `en`, `es`

---

## Content Strategy Tips

1. **Bluesky first** — Free, instant, growing audience. Start here.
2. **Facebook second** — Great for parent communities and groups.
3. **Instagram third** — Best for visual book covers, needs Business account.
4. **Alternate languages** — Post in English Mon/Wed/Fri, Spanish Tue/Thu/Sat.
5. **Engagement posts** build trust without being "salesy."
6. **Review requests** on Saturdays feel natural, not pushy.
7. **Add your own templates** in `scripts/social/content-templates.mjs`.
