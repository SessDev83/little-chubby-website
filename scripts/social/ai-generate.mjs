/**
 * AI-powered social media content generator using Claude (Anthropic).
 * Falls back to static templates if the API is unavailable.
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 600;

const SITE_URL = "https://www.littlechubbypress.com";

// ─── Brand voice / system prompt ────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the social media voice of Little Chubby Press, a small independent publisher of children's coloring books on Amazon KDP.

BRAND PERSONALITY:
- Warm, friendly, and encouraging — like a helpful parent friend
- Playful but not childish — you speak TO parents, not to kids
- Passionate about screen-free creative time
- Relatable — you understand the daily challenges of parenting
- Never salesy or pushy — even when promoting books, lead with value

AUDIENCE:
- Parents and caregivers of children ages 4-12
- Mostly moms, but inclusive of all caregivers
- They care about reducing screen time, fostering creativity, and quality family moments

RULES:
- NEVER use more than 3 emojis per post
- NEVER use ALL CAPS words (except book titles when appropriate)
- Keep posts conversational and natural — NOT corporate or robotic
- Each post should feel like a friend sharing something helpful, not an ad
- Vary sentence length and structure for natural rhythm
- Use line breaks for readability (short paragraphs)
- When mentioning books, focus on the EXPERIENCE, not features
- Include 3-5 relevant hashtags at the end (mix popular + niche)
- Posts should be 150-280 characters for engagement, max 400 characters total including hashtags

HASHTAG GUIDELINES:
- Always include #LittleChubbyPress
- Mix 2-3 from: #ScreenFreePlay #ColoringBook #CreativeKids #FamilyTime #KidsActivities #ParentingTips #ArtForKids
- Add 1-2 specific to the post topic
- For Spanish posts, use Spanish hashtags: #LibroDeColorear #SinPantallas #TiempoEnFamilia #NinosCreativos #ActividadesParaNinos

LANGUAGE:
- Write in the language specified (en or es)
- For Spanish: use Latin American Spanish, casual but respectful. Do NOT use accents/tildes (the system doesn't support them well). Use "peques" for little kids.
- For English: warm American English, inclusive language`;

// ─── Post type prompts ──────────────────────────────────────────────────────

function buildPrompt(type, lang, data) {
  const langLabel = lang === "es" ? "Spanish (Latin American, no accents)" : "English";

  switch (type) {
    case "book-promo":
      return `Write a social media post in ${langLabel} promoting this coloring book:

Title: "${data.title[lang]}"
Subtitle: ${data.subtitle[lang]}
Description: ${data.description[lang]}
Age range: ${data.ageRange[lang]}
Pages: ${data.pages}
Amazon link: ${data.amazonUrl}

Make it feel like a genuine recommendation from a friend, NOT an advertisement. Focus on the experience a child will have, not just product features. Include the Amazon link naturally.`;

    case "blog-share":
      return `Write a social media post in ${langLabel} sharing this blog article:

Title: "${data.title[lang]}"
Summary: ${data.summary[lang]}
Link: ${SITE_URL}/${lang}/blog/${data.slug[lang]}

Make it intriguing — give a taste of the value without giving everything away. Make people want to click and read more.`;

    case "engagement":
      return `Write an engaging social media post in ${langLabel} for parents of young children (ages 4-12).

Topic should be ONE of these (pick randomly):
- A relatable parenting moment about kids and creativity
- A fun question or poll about family activities
- A practical tip about reducing screen time
- A "did you know" fact about child development and art/creativity
- A conversation starter about family routines

DO NOT mention any specific book or product. This is pure community engagement. End with a question to encourage comments.`;

    case "parenting-tip":
      return `Write a social media post in ${langLabel} sharing a genuinely useful parenting tip related to creativity, education, or family time.

The tip should be:
- Actionable (something they can try TODAY)
- Based on real child development principles
- Relatable to everyday parenting challenges
- NOT about coloring books specifically (though art/creativity is fine)

This is a VALUE post — no selling, no product mentions. Just be helpful.`;

    case "behind-scenes":
      return `Write a social media post in ${langLabel} giving a behind-the-scenes look at Little Chubby Press.

Pick ONE angle:
- The creative process of designing coloring book pages
- Why we chose single-sided pages (to prevent bleed-through)
- What inspires the themes for new books
- A fun fact about how many hours go into one book
- The joy of reading parent/kid reviews
- Why independent publishing matters

Make it personal and authentic. People connect with stories, not brands.`;

    case "fun-fact":
      return `Write a social media post in ${langLabel} sharing an interesting fact about one of these topics:

- Child development and creativity
- The science behind coloring and fine motor skills
- Screen time statistics and alternatives
- Art therapy and emotional regulation in children
- Historical fun facts about coloring books or children's art

Make it surprising and shareable. Start with the fact, then connect it to why it matters for parents. Keep it light and interesting, not preachy.`;

    case "community":
      return `Write a social media post in ${langLabel} building community around Little Chubby Press.

Pick ONE approach:
- Invite parents to share their kids' coloring artwork
- Promote the newsletter (${SITE_URL}/${lang}/newsletter) with a compelling reason to join
- Encourage visiting the gallery page (${SITE_URL}/${lang}/gallery)
- Ask for book theme suggestions for future coloring books
- Thank the community and celebrate a milestone

Make it warm and genuine. Include the relevant link naturally.`;

    default:
      return `Write a short, engaging social media post in ${langLabel} for parents of young children about creativity and screen-free activities.`;
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
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  return json.content?.[0]?.text?.trim() || null;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a social media post using AI.
 * @param {string} type - Post type
 * @param {string} lang - Language code
 * @param {object} [data] - Book or post data
 * @returns {Promise<{fullPost: string, text: string, cta: string, hashtags: string, aiGenerated: boolean} | null>}
 */
export async function generateAIPost(type, lang, data) {
  const prompt = buildPrompt(type, lang, data);

  const fullPost = await callClaude(prompt);
  if (!fullPost) return null;

  // Extract hashtags from the generated text
  const hashtagMatch = fullPost.match(/(#\w+[\s]*)+$/);
  const hashtags = hashtagMatch ? hashtagMatch[0].trim() : "";
  const textWithoutHashtags = fullPost.replace(/(#\w+[\s]*)+$/, "").trim();

  // Try to find a CTA (line with a URL)
  const lines = textWithoutHashtags.split("\n");
  const ctaLine = lines.find((l) => l.includes("http"));
  const text = ctaLine
    ? lines.filter((l) => l !== ctaLine).join("\n").trim()
    : textWithoutHashtags;

  return {
    fullPost,
    text,
    cta: ctaLine || "",
    hashtags,
    aiGenerated: true,
  };
}
