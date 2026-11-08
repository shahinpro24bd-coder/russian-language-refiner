import { describe, expect, it } from "vitest";
import indexHtml from "../../site/index.html?raw";

const REELS = ["DfPYo1eNVpX", "DfCwsoyNld5", "Del6WmtNZ4Q", "Dd4Fgqjxy24", "Ddl_gKqgwsY", "DdZC2W8BpHt"];

describe("home Reel gallery", () => {
  it("ships all six supplied Reels as click-to-load posters", () => {
    for (const reel of REELS) {
      expect(indexHtml).toContain(`data-reel-play="${reel}"`);
      expect(indexHtml).toContain(`https://www.instagram.com/reel/${reel}/`);
    }
    expect(indexHtml.match(/data-reel-play=/g)).toHaveLength(6);
  });

  it("does not load any Instagram player with the initial page", () => {
    expect(indexHtml).not.toContain("instagram.com/reel/DfPYo1eNVpX/embed");
    expect(indexHtml).not.toMatch(/<iframe[^>]+instagram\.com/i);
    expect(indexHtml).toContain('src="js/reels.js"');
  });
});
