import { describe, expect, it } from "vitest";
import indexHtml from "../../site/index.html?raw";
import fallback from "./fallback.generated.json?raw";

const PUBLIC_ASSET_HOST = "https://id-preview--800b11c5-de62-438c-bba4-c2b14c3abaa7.lovable.app";

function expectPublicAssetUrls(source: string, expectedCount: number) {
  const urls = source.match(/https:\/\/id-preview--800b11c5-de62-438c-bba4-c2b14c3abaa7\.lovable\.app\/__l5e\/assets-v1\/[a-f0-9-]+\/[A-Za-z0-9._-]+/g) || [];
  expect(urls).toHaveLength(expectedCount);
  expect(urls.every((url) => url.startsWith(`${PUBLIC_ASSET_HOST}/__l5e/assets-v1/`))).toBe(true);
  expect(source).not.toContain('"/__l5e/assets-v1/');
}

describe("externally deployed media", () => {
  it("uses public absolute URLs for every image, thumbnail and video", () => {
    expectPublicAssetUrls(indexHtml, 10);
    expectPublicAssetUrls(fallback, 9);
  });
});
