/**
 * AI-powered social media content generator using Claude (Anthropic).
 * Generates platform-specific content for Bluesky, Facebook, and Instagram
 * in a single API call for consistent messaging across platforms.
 * Falls back to static templates if the API is unavailable.
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 1500;

const SITE_URL = "https://www.littlechubbypress.com";

// ─── Brand voice / system prompt ────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the social media content strategist for Little Chubby Press, a small independent publisher of children's coloring books on Amazon KDP — with a community-driven website that rewards sharing.

BRAND PERSONALITY:
- Warm, friendly, and encouraging — like a helpful parent friend
- Playful but not childish — you speak TO parents, not to kids
- Passionate about screen-free creative time
- Relatable — you understand the daily challenges of parenting
- Never salesy or pushy — even when promoting books, lead with value
- Community-first: the website is a place to BELONG, not just buy

TARGET AUDIENCE:
- Parents and caregivers of children ages 4-12
- Mostly moms, but inclusive of all caregivers
- They value reducing screen time, fostering creativity, and quality family moments
- Mid-income families looking for affordable, enriching activities
- They love free resources and sharing discoveries with friends

═══ WEBSITE FEATURES YOU MUST KNOW (use these in posts!) ═══

1. FREE COLORING CORNER (${SITE_URL}/{lang}/coloring-corner)
   - Hundreds of free downloadable coloring pages in 9 categories
   - Categories: Animals & Nature, Space, Dinosaurs, Food & Drinks, Jobs, Machines, Kids Favorites, Mini Scenes, Basic Elements
   - Cost: 1 Peanut per download (Peanuts are free to earn!)
   - Anyone can browse; account needed to download

2. PEANUTS LOYALTY SYSTEM 🥜
   - Earn Peanuts for FREE by participating:
     • +5 Peanuts for submitting an approved book review with photo
     • +1 Peanut per share (sharing gallery or coloring pages to social media) — up to 3/day
   - Spend Peanuts on:
     • Free coloring page downloads (1 🥜 each)
     • Extra lottery tickets for monthly giveaway (3 🥜 = 1 ticket)
     • Profile badges (Gold Frame, Top Reviewer, etc.)
     • Gallery boosts (pin your review to the top for 7 days)
   - It's a free loyalty currency — no money needed!

3. MONTHLY BOOK GIVEAWAY (${SITE_URL}/{lang}/lottery)
   - Every month, 1-3 winners get a FREE coloring book shipped to them
   - How to enter: Submit a book review with photo → get 5 FREE tickets
   - Newsletter subscribers can buy extra tickets with Peanuts
   - Drawing on the 1st of each month — winners announced publicly
   - Past winners: ${SITE_URL}/{lang}/winners

4. COMMUNITY GALLERY (${SITE_URL}/{lang}/gallery)
   - Parents share photos of their kids' coloring artwork
   - Star ratings and written reviews visible to everyone
   - Sharing a gallery photo to social media earns +1 Peanut
   - Featured reviews get pinned or gold-bordered

5. BOOKS COLLECTION (${SITE_URL}/{lang}/books)
   - 15 coloring books, 90-110 pages each, ages 3-18+
   - Themes: animals, space, fashion, food, machines, emotions, alphabet, Easter
   - All books on Amazon with direct purchase links
   - Single-sided pages (no bleed-through)

6. BLOG (${SITE_URL}/{lang}/blog)
   - Parenting tips, activity ideas, fun facts, coloring corner articles
   - Bilingual content (EN + ES)

7. NEWSLETTER (${SITE_URL}/{lang}/newsletter)
   - Free signup with a bonus: downloadable mini coloring book (10 pages PDF)
   - Subscribers unlock extra lottery ticket purchases
   - No spam, unsubscribe anytime

8. CHUBBY THE ELEPHANT 🐘
   - Our mascot and AI chat assistant on the website
   - Helps users navigate features, find books, learn about Peanuts

═══ CONTENT STRATEGY — THE SHARING FLYWHEEL ═══

Our goal is NOT direct sales. It's building a viral community loop:
  Social post → Visit website → Register → Use features → Share with friends → Friends visit → Loop repeats

Every post should subtly drive ONE action:
- VISIT: Link to a specific page (coloring corner, gallery, blog, lottery)
- REGISTER: Mention a feature that requires an account (downloads, reviews, lottery)
- SHARE: Encourage sharing coloring creations, gallery photos, or blog articles with friends/groups
- ENGAGE: Ask questions, start conversations that build community loyalty

Only ~15% of posts should directly promote buying a book. The rest should showcase FREE value.

CONTENT RULES:
- NEVER use more than 3 emojis per platform variant
- NEVER use ALL CAPS words (except book titles when appropriate)
- Conversational and natural — NOT corporate or robotic
- Each post should feel like a friend sharing something helpful, not an ad
- Vary sentence length and structure for natural rhythm
- Use line breaks for readability
- When mentioning books, focus on the EXPERIENCE, not features
- Always include #LittleChubbyPress in every platform's hashtags

LANGUAGE:
- Write in the language specified (en or es)
- For Spanish: Latin American Spanish, casual but respectful. Do NOT use accents/tildes. Use "peques" for little kids.
- For English: warm American English, inclusive language
- ~80% of all posts are in English (primary audience). Spanish posts should feel intentional, not a translation.

ANTI-REPETITION:
- Every post must have a UNIQUE hook/opening line — never start two posts the same way.
- Vary your angle: if the same book or topic was covered recently, pick a completely different benefit, scenario, or emotional angle.
- Rotate between storytelling, questions, tips, facts, and direct hooks.
- If recent history is provided, study it carefully and deliberately differentiate this post.

PLATFORM-SPECIFIC RULES:

BLUESKY (max 280 characters for text body, hashtags counted separately):
- Ultra-concise, punchy, conversational
- Include URLs in the text when relevant — they become clickable links automatically
- Keep the URL short (Amazon short link or direct URL, no UTM params)
- 2-3 hashtags maximum
- Text body MUST be 280 characters or fewer (URL counts toward this limit)

FACEBOOK (300-600 characters):
- Longer, conversational, storytelling tone
- Include relevant URL naturally within the text
- 3-5 hashtags at the end
- Use line breaks for readability
- End with a question or clear CTA to drive engagement
- IMPORTANT: Facebook is where parents share discoveries with friends — make posts share-worthy

INSTAGRAM (300-600 characters, NO clickable links):
- NEVER include URLs in the caption — they are not clickable on Instagram
- If directing to a page, say "Link in bio" (en) or "Link en bio" (es)
- First line must be a scroll-stopping hook
- 8-15 hashtags (mix popular + niche for discovery)
- Caption should complement the image

RESPONSE FORMAT:
Respond with VALID JSON ONLY. No markdown code fences, no backticks, no commentary.
The JSON must have this exact structure:
{
  "concept": "one-line summary of the post idea",
  "bluesky": {
    "text": "post text, max 280 chars, can include URLs",
    "hashtags": "#Tag1 #Tag2"
  },
  "facebook": {
    "text": "full post text with URL if applicable",
    "hashtags": "#Tag1 #Tag2 #Tag3 #Tag4"
  },
  "instagram": {
    "text": "caption, no URLs, say link in bio if needed",
    "hashtags": "#Tag1 #Tag2 #Tag3 #Tag4 #Tag5 #Tag6 #Tag7 #Tag8 #Tag9 #Tag10"
  },
  "imagePrompt": "detailed description for AI image generation, or null if using product photo"
}`;

// ─── Image prompt guidelines (appended for non-product posts) ───────────────

const IMAGE_GUIDELINES = `
IMAGE PROMPT GUIDELINES (for the "imagePrompt" field):
Generate a detailed description for an AI image generator. The image should:
- Be a warm, colorful illustration in soft watercolor or digital children's book style
- Use brand colors: soft yellows, corals, sky blues, gentle greens, creamy whites
- Show diverse children, families, or creative scenes (different skin tones, hair types)
- Feature creativity-related subjects: children coloring, art supplies, family art time
- Have NO text, words, letters, logos, or watermarks
- Be a clean, uncluttered square composition for social media
- Feel joyful, cozy, and wholesome`;

// ─── Post type prompts ──────────────────────────────────────────────────────

function buildPrompt(type, lang, data) {
  const langLabel = lang === "es" ? "Spanish (Latin American, no accents/tildes)" : "English";

  switch (type) {
    case "book-promo":
      return `Create a social media post in ${langLabel} promoting this coloring book:

Title: "${data.title[lang]}"
Subtitle: ${data.subtitle[lang]}
Description: ${data.description[lang]}
Age range: ${data.ageRange[lang]}
Pages: ${data.pages}
Amazon link: ${data.amazonUrl}

Make it feel like a genuine recommendation from a friend, NOT an advertisement. Focus on the experience a child will have.

For Facebook: include the Amazon URL naturally in the text.
For Bluesky: include the Amazon URL in the text (it becomes a clickable link automatically). Keep text+URL under 280 chars.
For Instagram: do NOT include URLs (they are NOT clickable), say "Link in bio" instead.

Set "imagePrompt" to null — we will use the book cover photo.`;

    case "blog-share":
      return `Create a social media post in ${langLabel} sharing this blog article:

Title: "${data.title[lang]}"
Summary: ${data.summary[lang]}
Blog URL: ${SITE_URL}/${lang}/blog/${data.slug[lang]}

Make it intriguing — give a taste of the value without giving everything away.

For Facebook: include the blog URL naturally.
For Bluesky: include the blog URL in the text (it becomes a clickable link). Keep text+URL under 280 chars.
For Instagram: say "Link in bio" instead of the URL.
${IMAGE_GUIDELINES}`;

    case "engagement":
      return `Create an engaging social media post in ${langLabel} for parents of young children (ages 4-12).

Topic should be ONE of these (pick the most engaging):
- A relatable parenting moment about kids and creativity
- A fun question or poll about family activities
- A practical tip about reducing screen time
- A "did you know" fact about child development and art/creativity
- A conversation starter about family routines

Do NOT mention any specific book or product. This is pure community engagement.
End with a question to encourage comments.
${IMAGE_GUIDELINES}`;

    case "parenting-tip":
      return `Create a social media post in ${langLabel} sharing a genuinely useful parenting tip related to creativity, education, or family time.

The tip should be:
- Actionable (something they can try TODAY)
- Based on real child development principles
- Relatable to everyday parenting challenges
- NOT about coloring books specifically (though art/creativity is fine)

This is a VALUE post — no selling, no product mentions. Just be helpful.
${IMAGE_GUIDELINES}`;

    case "behind-scenes":
      return `Create a social media post in ${langLabel} giving a behind-the-scenes look at Little Chubby Press.

Pick ONE angle:
- The creative process of designing coloring book pages
- Why we chose single-sided pages (to prevent bleed-through)
- What inspires the themes for new books
- A fun fact about how many hours go into one book
- The joy of reading parent/kid reviews
- Why independent publishing matters

Make it personal and authentic. People connect with stories, not brands.
${IMAGE_GUIDELINES}`;

    case "fun-fact":
      return `Create a social media post in ${langLabel} sharing an interesting, shareable fact about one of these topics:

- Child development and creativity
- The science behind coloring and fine motor skills
- Screen time statistics and alternatives
- Art therapy and emotional regulation in children
- Historical fun facts about coloring books or children's art

Start with the fact, then connect it to why it matters for parents. Keep it light and interesting, not preachy.
${IMAGE_GUIDELINES}`;

    case "community":
      return `Create a social media post in ${langLabel} building community around Little Chubby Press.

Pick ONE approach:
- Invite parents to share their kids' coloring artwork in our gallery (${SITE_URL}/${lang}/gallery)
- Promote the newsletter (${SITE_URL}/${lang}/newsletter) — mention the free 10-page PDF you get on signup
- Encourage visiting the gallery page to see what other families are creating
- Ask for book theme suggestions for future coloring books
- Thank the community and celebrate a milestone
- Highlight how sharing gallery photos or coloring pages earns Peanuts

For Facebook: include the relevant page URL naturally.
For Bluesky: include the relevant URL in the text (it becomes a clickable link). Keep text+URL under 280 chars.
For Instagram: say "Link in bio" instead.
${IMAGE_GUIDELINES}`;

    case "free-coloring":
      return `Create a social media post in ${langLabel} promoting the FREE Coloring Corner on our website.

KEY FACTS:
- Hundreds of free coloring pages to download at ${SITE_URL}/${lang}/coloring-corner
- 9 categories: Animals & Nature, Space & Astronauts, Dinosaurs, Food & Drinks, Jobs, Machines & Construction, Kids Favorites (Toys & Fantasy), Mini Scenes, Basic Elements
- Downloads cost just 1 Peanut each (Peanuts are FREE to earn by sharing or reviewing!)
- Free account required to download
- Perfect for rainy days, road trips, waiting rooms, or afternoon fun

ANGLE — pick ONE:
- Highlight a specific category ("Does your kid love dinosaurs? We have free dino coloring pages!")
- Frame it as a parenting hack ("Free activity for 30 minutes of calm? Yes please!")
- Emphasize the variety ("9 categories, hundreds of pages — find your kid's favorite")
- Social proof angle ("Parents are downloading these every day for screen-free fun")
- Compare to buying a coloring book ("Why not try free pages first?")

Make people want to visit the page RIGHT NOW. This is our #1 traffic driver.

For Facebook: include ${SITE_URL}/${lang}/coloring-corner naturally.
For Bluesky: include the URL in text. Keep text+URL under 280 chars.
For Instagram: say "Link in bio" instead.
${IMAGE_GUIDELINES}`;

    case "giveaway":
      return `Create a social media post in ${langLabel} promoting our MONTHLY FREE BOOK GIVEAWAY.

KEY FACTS:
- Every month, we give away 1-3 FREE coloring books shipped to winners
- How to enter: Buy any of our books on Amazon → upload a photo review on our website → get 5 FREE lottery tickets
- Newsletter subscribers can buy extra tickets using Peanuts (3 🥜 = 1 extra ticket)
- Drawing happens on the 1st of each month
- Winners announced at ${SITE_URL}/${lang}/winners
- Enter at: ${SITE_URL}/${lang}/lottery

ANGLE — pick ONE:
- Urgency ("The monthly drawing is coming up! Have you entered yet?")
- Simplicity ("Buy a book, share a photo, win another book for free!")
- Social proof ("Check out our past winners!")
- Value ("Your review could win you a free book!")
- Community ("Your photos and reviews help other parents discover great books")

Make it exciting but not spammy. Focus on how EASY it is to participate.

For Facebook: include ${SITE_URL}/${lang}/lottery naturally.
For Bluesky: include the URL in text. Keep text+URL under 280 chars.
For Instagram: say "Link in bio" instead.
${IMAGE_GUIDELINES}`;

    case "share-earn":
      return `Create a social media post in ${langLabel} teaching people about our Peanuts loyalty system and how SHARING earns rewards.

KEY FACTS:
- Peanuts 🥜 is our free loyalty currency — no money needed!
- Earn Peanuts by: reviewing books (+5), sharing gallery/coloring pages (+1 per share, up to 3/day)
- Spend on: free coloring page downloads (1 🥜), extra lottery tickets (3 🥜), profile badges, gallery boosts
- The more you share, the more free stuff you unlock

ANGLE — pick ONE:
- "Share to earn" hook ("Did you know sharing earns you free coloring pages?")
- Explain the loop ("Share → Earn Peanuts → Download free pages → Share those too!")
- Highlight a specific reward ("Earn enough Peanuts and your gallery review gets a gold border!")
- Frame as a game ("Collect Peanuts like a treasure hunt — share, review, earn!")
- Value proposition ("Free coloring pages just for sharing with your friends!")

Make it sound fun and rewarding, NOT complicated. Keep it simple: share = earn = free stuff.

For Facebook: include ${SITE_URL}/${lang}/peanuts naturally.
For Bluesky: include the URL in text. Keep text+URL under 280 chars.
For Instagram: say "Link in bio" instead.
${IMAGE_GUIDELINES}`;

    default:
      return `Create a short, engaging social media post in ${langLabel} for parents of young children about creativity and screen-free activities.
${IMAGE_GUIDELINES}`;
  }
}

// ─── Call Claude API ────────────────────────────────────────────────────────

async function callClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  };

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  return json.content?.[0]?.text?.trim() || null;
}

// ─── Parse AI response ─────────────────────────────────────────────────────

function parseAIResponse(raw) {
  let cleaned = raw.trim();
  // Strip markdown code fences if Claude wraps in ```json ... ```
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }
  return JSON.parse(cleaned);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate platform-specific social media posts using AI.
 * Returns a structured object with tailored content for each platform.
 *
 * @param {string} type - Post type (book-promo, engagement, etc.)
 * @param {string} lang - Language code (en or es)
 * @param {object} [data] - Book or post data (when applicable)
 * @returns {Promise<{
 *   concept: string,
 *   platforms: {
 *     bluesky:   { text: string, hashtags: string },
 *     facebook:  { text: string, hashtags: string },
 *     instagram: { text: string, hashtags: string },
 *   },
 *   imagePrompt: string | null,
 *   aiGenerated: boolean
 * } | null>}
 */
export async function generateAIPost(type, lang, data, smartContext = null, recentHistory = null) {
  let prompt = buildPrompt(type, lang, data);

  // Inject recent post history for anti-repetition
  if (recentHistory) {
    prompt += `\n\n═══ ANTI-REPETITION — RECENT POSTING HISTORY ═══\n${recentHistory}\n\nCRITICAL RULES:\n- Do NOT reuse the same angle, hook, or concept from recent posts above.\n- If a book was promoted recently, pick a DIFFERENT angle (audience, benefit, scenario).\n- Vary your opening line / hook — never start two posts the same way.\n- If the same content type was posted recently in the same language, make this one feel fresh and distinct.`;
  }

  // Inject smart context from agent intelligence if available
  if (smartContext) {
    prompt += `\n\n═══ PERFORMANCE INTELLIGENCE (use this to optimize your content) ═══\n${smartContext}\n\nUse the above data to make this post MORE effective:\n- Lean into content styles that get higher engagement\n- Use language patterns from top-performing posts\n- Consider platform-specific insights\n- Follow the AI strategist recommendations when relevant`;
  }

  const raw = await callClaude(prompt);
  if (!raw) return null;

  const parsed = parseAIResponse(raw);

  // Validate required fields
  if (!parsed.bluesky?.text || !parsed.facebook?.text || !parsed.instagram?.text) {
    throw new Error("AI response missing required platform fields");
  }

  // Enforce Bluesky character limit
  if (parsed.bluesky.text.length > 280) {
    // Try to cut at a sentence boundary
    let cut = parsed.bluesky.text.lastIndexOf(".", 277);
    if (cut < 100) cut = parsed.bluesky.text.lastIndexOf(" ", 277);
    if (cut < 100) cut = 277;
    parsed.bluesky.text = parsed.bluesky.text.slice(0, cut + 1);
  }

  return {
    concept: parsed.concept || "",
    platforms: {
      bluesky: {
        text: parsed.bluesky.text,
        hashtags: parsed.bluesky.hashtags || "",
      },
      facebook: {
        text: parsed.facebook.text,
        hashtags: parsed.facebook.hashtags || "",
      },
      instagram: {
        text: parsed.instagram.text,
        hashtags: parsed.instagram.hashtags || "",
      },
    },
    imagePrompt: parsed.imagePrompt || null,
    aiGenerated: true,
  };
}

// ─── Engagement AI functions ────────────────────────────────────────────────

const REPLY_SYSTEM_PROMPT = `You are the social media manager for Little Chubby Press, a small independent publisher of children's coloring books.

RULES:
- Reply in 1-2 sentences only. Keep it SHORT and warm.
- Match the language of the comment (English or Spanish).
- Be genuinely grateful, friendly, and encouraging.
- NEVER be salesy or mention buying/purchasing.
- If they mention a specific book, acknowledge it warmly.
- If they ask a question, answer helpfully and concisely.
- Use at most 1 emoji per reply.
- Sound like a real person, not a bot.
- For Spanish: Latin American Spanish, no accents/tildes.

Respond with ONLY the reply text — no JSON, no quotes, no commentary.`;

const OUTREACH_SYSTEM_PROMPT = `You are a friendly parent who loves creative activities with kids. You're commenting on someone else's social media post.

RULES:
- Write a brief, genuine comment (1-2 sentences, max 250 characters).
- Be a friendly fellow parent or educator — NOT promotional.
- Do NOT mention any brand, product, book, or company name. EVER.
- Relate naturally to what the person posted about.
- Be encouraging, empathetic, or share a very brief related thought.
- Sound like a real person having a casual conversation.
- Match the language of the post (English or Spanish).
- Use at most 1 emoji.

Respond with ONLY the comment text — no JSON, no quotes, no commentary.`;

/**
 * Generate a brand-voice reply to a social media comment.
 * @param {string} comment - The comment text to reply to.
 * @param {string} originalPost - Context: the original post text (if available).
 * @param {string} platform - "bluesky" | "facebook" | "instagram"
 * @returns {Promise<string|null>} The reply text.
 */
export async function generateReply(comment, originalPost, platform) {
  const maxChars = platform === "bluesky" ? 280 : 500;
  const prompt = `Original post context: "${originalPost || "(not available)"}"\n\nComment to reply to: "${comment}"\n\nPlatform: ${platform} (max ${maxChars} characters)`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      system: REPLY_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  let reply = json.content?.[0]?.text?.trim() || null;
  if (reply && reply.length > maxChars) {
    reply = reply.slice(0, maxChars - 1).trimEnd();
  }
  return reply;
}

/**
 * Generate a genuine, non-promotional comment for outbound engagement.
 * @param {string} postText - The post text to comment on.
 * @returns {Promise<string|null>} The comment text.
 */
export async function generateOutreachComment(postText) {
  const prompt = `Post to comment on:\n"${postText}"\n\nWrite a brief, genuine comment as a friendly parent. Max 250 characters.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 200,
      system: OUTREACH_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  let comment = json.content?.[0]?.text?.trim() || null;
  if (comment && comment.length > 250) {
    comment = comment.slice(0, 249).trimEnd();
  }
  return comment;
}

/**
 * Check if a post's content is safe to engage with (not controversial/political).
 * @param {string} postText - The text to check.
 * @returns {Promise<boolean>} True if safe to engage.
 */
export async function isSafeToEngage(postText) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return false;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 10,
      system: "You are a content safety filter. Respond with ONLY 'yes' or 'no'.",
      messages: [{
        role: "user",
        content: `Is the following social media post safe for a children's brand to publicly engage with? It must NOT be political, controversial, sexual, violent, hateful, or about sensitive social issues. Only answer 'yes' if it's clearly safe and wholesome.\n\nPost: "${postText}"`,
      }],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) return false;
  const json = await res.json();
  const answer = json.content?.[0]?.text?.trim()?.toLowerCase();
  return answer === "yes";
}
