const DEFAULT_SITE_URL = "https://www.littlechubbypress.com";

export function normalizeSiteUrl(value: string | undefined | null): string {
  let text = String(value || "").trim();

  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    text = text.slice(1, -1).trim();
  }

  text = text
    .replace(/\\r|\\n/g, "")
    .replace(/[\r\n]/g, "")
    .trim()
    .replace(/\/+$/, "");

  try {
    const url = new URL(text || DEFAULT_SITE_URL);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : DEFAULT_SITE_URL;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function getPublicSiteUrl(): string {
  return normalizeSiteUrl(import.meta.env.PUBLIC_SITE_URL);
}