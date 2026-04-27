export const LINKABLE_ASSETS = [
  {
    id: "free-printable-coloring-library",
    title: "Free Printable Coloring Library",
    status: "pilot",
    audience: "Parents, caregivers, teachers, and homeschool families looking for printable activities.",
    routes: ["/en/coloring-corner/", "/es/coloring-corner/"],
    primaryActions: ["download_success", "download_blocked", "register_submit_success", "newsletter_inline_submit_success", "newsletter_confirmed"],
    nextSteps: ["Download", "Register", "Newsletter"],
    outreachGuardrails: [
      "Recommend only where free printable resources are genuinely useful.",
      "Do not buy links or submit to low-quality directories.",
      "Keep the next step useful: browse, register, download, or join newsletter.",
    ],
  },
  {
    id: "bilingual-activity-guides",
    title: "Bilingual Activity Guides",
    status: "pilot",
    audience: "Families and educators who need practical EN/ES activity ideas.",
    routes: ["/en/blog/", "/es/blog/"],
    primaryActions: ["newsletter_inline_submit_success", "newsletter_confirmed", "lead_magnet_submit_success", "book_page_viewed", "amazon_click"],
    nextSteps: ["Newsletter", "Book page", "Coloring library"],
    outreachGuardrails: [
      "Use practical guides, not generic AI content volume, as the link target.",
      "Keep bilingual parity visible before pitching bilingual value.",
      "Review organic/referral activation before expanding topic clusters.",
    ],
  },
  {
    id: "book-sample-decision-hub",
    title: "Book Sample Decision Hub",
    status: "pilot",
    audience: "Gift shoppers and parents comparing book fit before Amazon purchase.",
    routes: ["/en/books/", "/es/books/"],
    primaryActions: ["book_page_viewed", "sample_viewed", "sample_cta_click", "amazon_click"],
    nextSteps: ["Book detail", "Sample preview", "Amazon"],
    outreachGuardrails: [
      "Treat Amazon clicks as buyer intent, not confirmed sales.",
      "Pitch usefulness and samples, not urgency or discount language.",
      "Avoid affiliate/disclosure claims unless the owner enables that program later.",
    ],
  },
];