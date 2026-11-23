import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SETTINGS,
  cloudinaryDownloadUrl,
  facebookVideoHref,
  volumeFraction,
} from "@/lib/site";
import { claimPlayback, registerPlayer } from "@/lib/media-bus";

const VIDEO =
  "https://res.cloudinary.com/kwsmgzni/video/upload/v1795367107/mishra-painters/lih7y6cxnjcpgtgt2zk4.mp4";

describe("downloads carry the website watermark", () => {
  it("default watermark is painter.rf.gd", () => {
    expect(DEFAULT_SETTINGS.watermark_text).toBe("painter.rf.gd");
  });

  it("video downloads burn the watermark into the bottom-left corner", () => {
    const url = cloudinaryDownloadUrl(VIDEO, "painter.rf.gd", "Royal play")!;
    expect(url).toContain("l_text:Arial_80_bold_stroke:painter.rf.gd,");
    expect(url).toContain("fl_layer_apply,g_south_west,");
    expect(url).toContain("fl_attachment:Royal-play/");
    expect(url.endsWith("/v1795367107/mishra-painters/lih7y6cxnjcpgtgt2zk4.mp4")).toBe(true);
  });

  it("an admin-changed watermark is used instead", () => {
    const url = cloudinaryDownloadUrl(VIDEO, "mishrapainters.in", "x")!;
    expect(url).toContain(":mishrapainters.in,");
    expect(url).not.toContain("painter.rf.gd");
  });

  it("videos not on Cloudinary get no download link", () => {
    expect(cloudinaryDownloadUrl("https://example.com/a.mp4", "painter.rf.gd", "x")).toBeNull();
  });
});

describe("reel playback", () => {
  it("starting one video pauses the others", () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = registerPlayer("a", a);
    const offB = registerPlayer("b", b);
    claimPlayback("b");
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
    offA();
    offB();
  });

  it("admin volume 0–100 maps to player volume, 0 = muted", () => {
    expect(volumeFraction(0)).toBe(0);
    expect(volumeFraction(40)).toBe(0.4);
    expect(volumeFraction(100)).toBe(1);
  });

  it("Facebook reels play through the video player using the stored reel link", () => {
    const embed =
      "https://www.facebook.com/plugins/video.php?height=476&href=https%3A%2F%2Fwww.facebook.com%2Freel%2F1493099869386048%2F&show_text=false&width=267&t=0";
    expect(facebookVideoHref(embed)).toBe("https://www.facebook.com/reel/1493099869386048/");
    expect(
      facebookVideoHref(
        "https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2Fx%2Fposts%2F1",
      ),
    ).toBeNull();
  });
});
