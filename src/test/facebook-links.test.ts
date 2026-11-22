import { describe, expect, it } from "vitest";
import {
  cleanFacebookUrl,
  isCanonicalFacebookUrl,
  isFacebookLinkInput,
  parseFacebookInput,
} from "@/lib/site";

describe("Facebook links pasted from the mobile app", () => {
  it("share links and fb.watch need server resolving first", () => {
    expect(isCanonicalFacebookUrl(new URL("https://www.facebook.com/share/r/1AbCdEf/"))).toBe(false);
    expect(isCanonicalFacebookUrl(new URL("https://www.facebook.com/share/p/1AbCdEf/"))).toBe(false);
    expect(isCanonicalFacebookUrl(new URL("https://fb.watch/abc123/"))).toBe(false);
    expect(isFacebookLinkInput("https://www.facebook.com/share/v/1AbCdEf/")).toBe(true);
  });

  it("resolved reel links embed with video.php", () => {
    const fb = parseFacebookInput("https://m.facebook.com/reel/1234567890/?mibextid=abc&rdid=xyz");
    expect(fb?.embedUrl.startsWith("https://www.facebook.com/plugins/video.php?href=")).toBe(true);
    expect(fb?.sourceUrl).toBe("https://www.facebook.com/reel/1234567890/");
    expect(fb?.orientation).toBe("vertical");
  });

  it("resolved post links embed with post.php", () => {
    const fb = parseFacebookInput(
      "https://www.facebook.com/permalink.php?story_fbid=pfbid0abc&id=100012345&mibextid=x",
    );
    expect(fb?.embedUrl.startsWith("https://www.facebook.com/plugins/post.php?href=")).toBe(true);
    expect(fb?.sourceUrl).toBe(
      "https://www.facebook.com/permalink.php?story_fbid=pfbid0abc&id=100012345",
    );
  });

  it("watch links keep the video id and drop tracking", () => {
    expect(cleanFacebookUrl(new URL("https://web.facebook.com/watch/?v=987&ref=share"))).toBe(
      "https://www.facebook.com/watch/?v=987",
    );
  });

  it("embed codes are not treated as links to resolve", () => {
    expect(isFacebookLinkInput('<iframe src="https://www.facebook.com/plugins/video.php?href=x">')).toBe(
      false,
    );
  });
});
