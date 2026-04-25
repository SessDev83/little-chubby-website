// Lighthouse CI config — master doc invariant #10 (mobile LH ≥ 90).
// Pkg P2-11.3.
//
// Runs against the URL in env var LHCI_TARGET_URL (Vercel preview URL in CI,
// or any URL via workflow_dispatch). LHCI does NOT shell-expand $VAR inside
// config strings, so we resolve it explicitly here.
//
// Gated paths: SSG only — home, coloring corner, book catalog (EN + ES).
// SSR/auth pages excluded (would require Puppeteer login automation; out of scope).
//
// Initial mode: WARN-only on all 4 categories. Promote to "error" via a
// follow-up PR after 3 consecutive green baselines on `main`.

const base = (process.env.LHCI_TARGET_URL || "https://www.littlechubbypress.com").replace(/\/+$/, "");

module.exports = {
  ci: {
    collect: {
      url: [
        `${base}/en/`,
        `${base}/es/`,
        `${base}/en/coloring-corner/`,
        `${base}/es/coloring-corner/`,
        `${base}/en/books/`,
        `${base}/es/books/`,
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
