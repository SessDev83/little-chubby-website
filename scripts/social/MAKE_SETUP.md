# Make.com Setup (Recommended for Facebook/Instagram Auth)

This setup removes Meta token pain from your repo.

Your repo will only:
1. Generate daily content.
2. Send it to a Make webhook.

Make will:
1. Keep the Facebook/Instagram connection.
2. Publish to Facebook Pages and Instagram Business.

---

## 1) Add GitHub Secrets

In GitHub: **Settings -> Secrets and variables -> Actions -> Secrets**

Add:
- `MAKE_WEBHOOK_URL` (required)
- `MAKE_WEBHOOK_SECRET` (optional, extra validation)

Workflow used:
- `.github/workflows/social-make.yml`

---

## 2) Create a Make Scenario

1. In Make, create a new scenario.
2. Add module: **Webhooks -> Custom webhook**.
3. Copy the webhook URL and save it in GitHub as `MAKE_WEBHOOK_URL`.
4. Run the GitHub workflow once in dry run = false and catch sample data.

---

## 3) Add Facebook + Instagram Modules in Make

After the webhook trigger:

1. Add module: **Facebook Pages -> Create a Post**
   - Message: map `facebook.message`
   - Link URL (optional): map `facebook.link`

2. Add module: **Instagram for Business (Facebook login) -> Create a Photo Post**
   - Caption: map `instagram.caption`
   - Image URL: map `instagram.imageUrl`

Recommended:
- Put both modules behind a Router if you want separate error handling.
- Add retries/notifications in Make for failed publishes.

---

## 4) Optional Security Validation

If you set `MAKE_WEBHOOK_SECRET`, this script sends HTTP header:
- `X-Webhook-Secret: <value>`

In Make, add a filter right after webhook:
- Continue only if header `X-Webhook-Secret` equals your secret.

---

## 5) Test Commands

Preview payload only:

```bash
node scripts/social/make.mjs --type book-promo --lang en --dry-run
```

Send payload to Make webhook:

```bash
node scripts/social/make.mjs --type engagement --lang es
```

---

## Payload Example

```json
{
  "source": "little-chubby-website",
  "generatedAt": "2026-04-09T20:12:45.000Z",
  "type": "book-promo",
  "lang": "en",
  "text": "...",
  "cta": "...",
  "hashtags": "...",
  "fullPost": "...",
  "sourceUrl": "https://...",
  "imageUrl": "https://...",
  "metadata": {
    "bookId": "magical-creatures",
    "postId": null,
    "title": "Magical Creatures"
  },
  "facebook": {
    "message": "...",
    "link": "https://..."
  },
  "instagram": {
    "caption": "...",
    "imageUrl": "https://..."
  }
}
```

---

## Scheduling

No scheduler needed in Make for this flow.

GitHub Actions already schedules daily sends at 10:00 AM ET via:
- `.github/workflows/social-make.yml`
