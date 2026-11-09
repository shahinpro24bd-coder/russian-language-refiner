import { describe, expect, it } from "vitest";
import { SITE_LANGS, isSiteLang, getContentSnapshot } from "./server";
import { renderPage } from "./transform";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

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

  it("keeps cookie-selected pages out of shared caches", async () => {
    const { renderSitePage } = await import("./render.server");
    const res = await renderSitePage(new Request("http://x/index.html", {
      headers: { cookie: "site_lang=en" },
    }), "index");
    expect(await res.text()).toContain('window.__SITE_LANG__="en"');
    expect(res.headers.get("Cache-Control")).toBe("private, no-cache");
    expect(res.headers.get("Vary")).toBe("Cookie");
    const fresh = await renderSitePage(new Request("http://x/index.html"), "index");
    expect(await fresh.text()).toContain('window.__SITE_LANG__="ru"');
    expect(fresh.headers.get("Cache-Control")).toBe("private, no-cache");
  });

  it("switches explicitly to Russian even with a remembered English preference", async () => {
    const { renderSitePage } = await import("./render.server");
    const res = await renderSitePage(new Request("http://x/about.html?lang=ru", {
      headers: { cookie: "site_lang=en" },
    }), "about");
    expect(await res.text()).toContain('window.__SITE_LANG__="ru"');
    expect(res.headers.get("Cache-Control")).toContain("public");
  });

  it("renders English on an explicit switch even with a Russian cookie", async () => {
    const { renderSitePage } = await import("./render.server");
    const res = await renderSitePage(new Request("http://x/service.html?lang=en", {
      headers: { cookie: "site_lang=ru" },
    }), "service");
    expect(await res.text()).toContain('window.__SITE_LANG__="en"');
  });

  it("sends both dropdown choices as explicit language URLs", () => {
    const dom = new JSDOM('<div class="navbar-languages"></div>', {
      url: "http://x/?lang=en", runScripts: "outside-only",
    });
    const destinations: [string, string][] = [];
    Object.assign(dom.window, {
      __SITE_LANG__: "en",
      __siteGo: (url: string, lang: string) => destinations.push([url, lang]),
    });
    dom.window.eval(readFileSync("public/js/i18n.js", "utf8"));
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
    for (const lang of ["ru", "en"]) {
      const choice = dom.window.document.querySelector<HTMLAnchorElement>(`[data-lang="${lang}"]`);
      expect(choice?.getAttribute("href")).toBe(`/?lang=${lang}`);
      choice?.click();
    }
    expect(destinations).toEqual([["http://x/?lang=ru", "ru"], ["http://x/?lang=en", "en"]]);
    dom.window.close();
  });
});
