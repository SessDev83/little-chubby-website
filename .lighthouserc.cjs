// Lighthouse CI config — master doc invariant #10 (mobile LH ≥ 90).
// Pkg P2-11.3.
//
// Runs against the Vercel preview URL passed via env var LHCI_TARGET_URL.
// LHCI substitutes $VAR-style references in collect.url at runtime.
//
// Gated paths: SSG only — home, coloring corner, book catalog (EN + ES).
// SSR/auth pages excluded (would require Puppeteer login automation; out of scope).
//
// Initial mode: WARN-only on all 4 categories. Promote to "error" via a
// follow-up PR after 3 consecutive green baselines on `main`. This avoids
// blocking PRs while we observe the real baseline of each URL.
module.exports = {
  ci: {
    collect: {
      url: [
        "$LHCI_TARGET_URL/en/",
        "$LHCI_TARGET_URL/es/",
        "$LHCI_TARGET_URL/en/coloring-corner/",
        "$LHCI_TARGET_URL/es/coloring-corner/",
        "$LHCI_TARGET_URL/en/books/",
        "$LHCI_TARGET_URL/es/books/",
      ],
      numberOfRuns: 2,
      settings: {
        chromeFlags: "--no-sandbox --headless",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.9 }],
        "categories:accessibility": ["warn", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
