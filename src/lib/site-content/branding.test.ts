import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { SITE_LOGO_URL } from "./branding";
import { getContentSnapshot } from "./server";

describe("self-hosted site logo", () => {
  it("uses a bundled public image rather than a hosting-specific proxy", () => {
    expect(SITE_LOGO_URL).toBe("/img/dr-fatema-logo.png");
    expect(existsSync(resolve("public", SITE_LOGO_URL.slice(1)))).toBe(true);
  });

  it("uses the same portable logo in every shared snapshot slot", async () => {
    const snapshot = await getContentSnapshot();
    for (const slot of ["doctor-logo", "dr-fatema-logo", "transparent-pixel"]) {
      expect(snapshot.images[slot]).toBe(SITE_LOGO_URL);
    }
  });
});