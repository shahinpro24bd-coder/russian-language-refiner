import { describe, expect, it } from "vitest";
import indexHtml from "../../site/index.html?raw";
import reelsScript from "../../../public/js/reels.js?raw";

const REELS = ["DfPYo1eNVpX", "DfCwsoyNld5", "Del6WmtNZ4Q", "Dd4Fgqjxy24", "Ddl_gKqgwsY", "DdZC2W8BpHt"];
const DIRECT_REELS = ["DfCwsoyNld5", "Dd4Fgqjxy24", "Ddl_gKqgwsY", "DdZC2W8BpHt"];

describe("home Reel gallery", () => {
  it("ships all six supplied Reels as click-to-load posters", () => {
    for (const reel of REELS) {
      expect(indexHtml).toContain(`data-reel-play="${reel}"`);
      expect(indexHtml).toContain(`https://www.instagram.com/reel/${reel}/`);
    }
    expect(indexHtml.match(/data-reel-play=/g)).toHaveLength(6);
  });

  it("plays every available video directly without an Instagram player", () => {
    for (const reel of DIRECT_REELS) {
      const button = indexHtml.match(new RegExp(`<button[^>]+data-reel-play="${reel}"[^>]*>`))?.[0];
      expect(button).toContain(`data-reel-src=`);
      expect(button).toContain(`.mp4`);
    }
    expect(indexHtml.match(/data-reel-src=/g)).toHaveLength(4);
    expect(indexHtml).not.toMatch(/<iframe[^>]+instagram\.com/i);
    expect(reelsScript).toContain('document.createElement("video")');
    expect(reelsScript).not.toContain('document.createElement("iframe")');
    expect(indexHtml).toContain('src="js/reels.js"');
  });
});
