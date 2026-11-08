import { describe, expect, it } from "vitest";
import { SITE_LANGS, isSiteLang, getContentSnapshot } from "./server";
import { renderPage } from "./transform";

describe("public languages", () => {
  it("offers exactly English and Russian", () => {
    expect(SITE_LANGS).toEqual(["en", "ru"]);
    expect(isSiteLang("ru")).toBe(true);
    expect(isSiteLang("he")).toBe(false);
  });

  it("bundles Russian for every English content key", async () => {
    const snapshot = await getContentSnapshot();
    expect(Object.keys(snapshot.langs.ru).sort()).toEqual(Object.keys(snapshot.langs.en).sort());
    for (const [key, english] of Object.entries(snapshot.langs.en)) {
      if (/[a-z]/i.test(english) && !/^(WhatsApp|Instagram|@dr\.dinasvinareva)/.test(english)) {
        expect(snapshot.langs.ru[key]).toMatch(/[Ѐ-ӿ]/);
      }
    }
  });

  it("renders Russian and English left-to-right", () => {
    const html = "<html><head></head><body>Home</body></html>";
    expect(renderPage(html, { texts: {}, images: {}, lang: "ru" })).toContain('lang="ru" dir="ltr"');
    expect(renderPage(html, { texts: {}, images: {}, lang: "en" })).toContain('lang="en" dir="ltr"');
  });
});

describe("default language", () => {
  it("serves Russian when no language is chosen", async () => {
    const { renderSitePage } = await import("./render.server");
    const res = await renderSitePage(new Request("http://x/index.html"), "index");
    expect(await res.text()).toContain('window.__SITE_LANG__="ru"');
  });
});
