import fallbackSnapshotJson from "./fallback.generated.json?raw";
import { SITE_LOGO_URL } from "./branding";

/** Every language the site is published in, in switcher order. */
export const SITE_LANGS = ["en", "ru"] as const;
export type SiteLang = (typeof SITE_LANGS)[number];

export function isSiteLang(value: string): value is SiteLang {
  return (SITE_LANGS as readonly string[]).includes(value);
}

export type ContentSnapshot = {
  version: number;
  langs: Record<SiteLang, Record<string, string>>;
  images: Record<string, string>;
  pages: Record<
    string,
    { titleKey: string; descriptionKey: string; keywordsKey: string | null; path: string }
  >;
};

/**
 * All site copy and imagery ships with the code, so the site runs anywhere
 * (including Vercel) with no environment variables, keys or database.
 * Editor changes are stored in the visitor's own browser and applied on the
 * client by /js/local-content.js.
 */
const SNAPSHOT: ContentSnapshot = JSON.parse(fallbackSnapshotJson);
SNAPSHOT.images["doctor-logo"] = SITE_LOGO_URL;
SNAPSHOT.images["dr-fatema-logo"] = SITE_LOGO_URL;
SNAPSHOT.images["transparent-pixel"] = SITE_LOGO_URL;

export async function getContentSnapshot(_force = false): Promise<ContentSnapshot> {
  return SNAPSHOT;
}

export function invalidateContentCache() {
  /* Content is bundled; nothing to invalidate. */
}
