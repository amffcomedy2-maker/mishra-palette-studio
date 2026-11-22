import { describe, expect, it } from "vitest";
import {
  DEFAULT_PIN,
  DEFAULT_SETTINGS,
  buildVCard,
  defaultEnquiryMessage,
  orderActiveIntegrations,
  parseFacebookInput,
  telLink,
  whatsappLink,
  workEnquiryMessage,
} from "@/lib/site";

describe("Mishra Painters business rules", () => {
  it("default admin PIN is 1050", () => {
    expect(DEFAULT_PIN).toBe("1050");
  });

  it("pre-filled card details match the requested visiting card", () => {
    expect(DEFAULT_SETTINGS.business_name).toBe("Mishra Painters");
    expect(DEFAULT_SETTINGS.proprietor_name).toBe("Amit Mishra");
    expect(DEFAULT_SETTINGS.experience_text).toBe("20+ Years of Experience");
    expect(DEFAULT_SETTINGS.call_number).toBe("9217672275");
    expect(DEFAULT_SETTINGS.whatsapp_number).toBe("7488650236");
    expect(DEFAULT_SETTINGS.address).toBe("Sector 105, Gurgaon");
  });

  it("WhatsApp Now opens the exact requested chat link", () => {
    expect(
      whatsappLink(DEFAULT_SETTINGS.whatsapp_number, defaultEnquiryMessage("Amit Mishra")),
    ).toBe(
      "https://wa.me/917488650236?text=Namaste%20Amit%20ji%2C%20mujhe%20painting%20work%20ke%20baare%20me%20jaankari%20chahiye",
    );
  });

  it("Call Now dials +91 9217672275", () => {
    expect(telLink("9217672275")).toBe("tel:+919217672275");
    expect(telLink("+91 92176 72275")).toBe("tel:+919217672275");
  });

  it("lightbox WhatsApp message includes the work title", () => {
    expect(workEnquiryMessage("Amit Mishra", "Royal Play Hall")).toContain('"Royal Play Hall"');
  });

  it("saved contact is 'Amit Mishra - Mishra Painters' with both numbers and the address", () => {
    const v = buildVCard(DEFAULT_SETTINGS);
    expect(v).toContain("FN:Amit Mishra - Mishra Painters");
    expect(v).toContain("TEL;TYPE=CELL,VOICE:+919217672275");
    expect(v).toContain("item1.TEL;TYPE=CELL:+917488650236");
    expect(v).toContain("Sector 105\\, Gurgaon");
  });

  it("converts a Facebook reel link to a vertical video embed", () => {
    const r = parseFacebookInput("https://www.facebook.com/reel/1234567890");
    expect(r?.isVideo).toBe(true);
    expect(r?.orientation).toBe("vertical");
    expect(r?.embedUrl.startsWith("https://www.facebook.com/plugins/video.php?href=")).toBe(true);
  });

  it("converts a Facebook post link to a post embed", () => {
    const r = parseFacebookInput("https://m.facebook.com/mishrapainters/posts/pfbid02abc");
    expect(r?.isVideo).toBe(false);
    expect(r?.embedUrl.startsWith("https://www.facebook.com/plugins/post.php?href=")).toBe(true);
  });

  it("accepts a raw Facebook iframe embed code and rejects other sites", () => {
    const code =
      '<iframe src="https://www.facebook.com/plugins/video.php?height=476&amp;href=https%3A%2F%2Fwww.facebook.com%2Freel%2F1%2F&amp;show_text=false&amp;width=267" width="267" height="476"></iframe>';
    const r = parseFacebookInput(code);
    expect(r?.orientation).toBe("vertical");
    expect(r?.embedUrl).toContain("&href=");
    expect(
      parseFacebookInput('<iframe src="https://evil.example.com/plugins/video.php"></iframe>'),
    ).toBeNull();
    expect(parseFacebookInput("https://youtube.com/watch?v=1")).toBeNull();
  });

  it("API failover order: default first, then lowest priority, inactive skipped", () => {
    const list = [
      { id: "b", is_active: true, is_default: false, priority: 2, created_at: "2026-01-01" },
      { id: "off", is_active: false, is_default: true, priority: 1, created_at: "2026-01-01" },
      { id: "a", is_active: true, is_default: false, priority: 1, created_at: "2026-01-02" },
      { id: "d", is_active: true, is_default: true, priority: 5, created_at: "2026-01-03" },
    ];
    expect(orderActiveIntegrations(list).map((x) => x.id)).toEqual(["d", "a", "b"]);
  });
});
