// Pure, browser-safe helpers shared by the public site, admin panel and server code.

export const CATEGORIES = [
  "Painting",
  "Wall Putty",
  "Plastic Paint",
  "Royal Play",
  "Wall Texture",
  "Furniture Polish",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const DEFAULT_PIN = "1050";

export type SiteSettings = {
  devotional_header: string;
  business_name: string;
  proprietor_name: string;
  experience_text: string;
  services_text: string;
  call_number: string;
  whatsapp_number: string;
  address: string;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  devotional_header: "जय श्री श्याम",
  business_name: "Mishra Painters",
  proprietor_name: "Amit Mishra",
  experience_text: "20+ Years of Experience",
  services_text:
    "मकान में सुंदर एवं आकर्षक पेंटिंग, वॉल पुट्टी, प्लास्टिक पेंट, रॉयल प्ले, वॉल टेक्सचर एवं फर्नीचर पॉलिश इत्यादि... के लिए संपर्क करें।",
  call_number: "9217672275",
  whatsapp_number: "7488650236",
  address: "Sector 105, Gurgaon",
};

export type PostKind = "photo" | "facebook" | "video";
export type Orientation = "vertical" | "horizontal" | "square";

export type Post = {
  id: string;
  kind: PostKind;
  title: string;
  category: string;
  note: string | null;
  image_url: string | null;
  embed_url: string | null;
  source_url: string | null;
  video_url: string | null;
  orientation: Orientation;
  is_visible: boolean;
  created_at: string;
};

/** Digits with India country code, e.g. "917488650236". */
export function toIntlDigits(num: string): string {
  let d = (num || "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = `91${d}`;
  return d;
}

/** "+91 9217672275" */
export function formatIndianPhone(num: string): string {
  const d = toIntlDigits(num);
  if (d.length === 12 && d.startsWith("91")) return `+91 ${d.slice(2)}`;
  return d ? `+${d}` : "";
}

export function telLink(num: string): string {
  return `tel:+${toIntlDigits(num)}`;
}

export function firstName(fullName: string): string {
  return (fullName || "").trim().split(/\s+/)[0] || "";
}

export function defaultEnquiryMessage(proprietor: string): string {
  return `Namaste ${firstName(proprietor)} ji, mujhe painting work ke baare me jaankari chahiye`;
}

export function workEnquiryMessage(proprietor: string, workTitle: string): string {
  return `Namaste ${firstName(proprietor)} ji, mujhe aapke "${workTitle}" work ke baare me jaankari chahiye`;
}

export function whatsappLink(num: string, message?: string): string {
  const base = `https://wa.me/${toIntlDigits(num)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

function vcEscape(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function buildVCard(s: SiteSettings): string {
  const name = s.proprietor_name.trim();
  const parts = name.split(/\s+/);
  const last = parts.length > 1 ? parts[parts.length - 1]! : "";
  const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : name;
  const call = `+${toIntlDigits(s.call_number)}`;
  const wa = `+${toIntlDigits(s.whatsapp_number)}`;
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${vcEscape(last)};${vcEscape(first)};;;`,
    `FN:${vcEscape(`${name} - ${s.business_name}`)}`,
    `ORG:${vcEscape(s.business_name)}`,
    "TITLE:Proprietor",
    `TEL;TYPE=CELL,VOICE:${call}`,
    `item1.TEL;TYPE=CELL:${wa}`,
    "item1.X-ABLabel:WhatsApp",
    `ADR;TYPE=WORK:;;${vcEscape(s.address)};;;;India`,
    `NOTE:${vcEscape(`Call: ${call} | WhatsApp: ${wa}`)}`,
    "END:VCARD",
  ];
  return lines.join("\r\n") + "\r\n";
}

/* ---------------- Facebook embeds ---------------- */

const FB_HOSTS = [
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "web.facebook.com",
  "mbasic.facebook.com",
  "fb.watch",
  "www.fb.watch",
  "fb.com",
  "www.fb.com",
];

export function isFacebookHost(host: string): boolean {
  return FB_HOSTS.includes(host.toLowerCase()) || /(^|\.)facebook\.com$/i.test(host);
}

/** True for share links that must be resolved on the server before embedding. */
export function isFacebookShareUrl(u: URL): boolean {
  const host = u.hostname.toLowerCase();
  return (
    host.endsWith("fb.watch") ||
    /^\/share(\/|$)/i.test(u.pathname) ||
    (host === "l.facebook.com" && u.pathname.startsWith("/l.php"))
  );
}

/** A final facebook.com reel/video/post URL that the embed plugin understands. */
export function isCanonicalFacebookUrl(u: URL): boolean {
  if (!isFacebookHost(u.hostname) || isFacebookShareUrl(u)) return false;
  if (u.hostname.toLowerCase().endsWith("fb.watch")) return false;
  const p = u.pathname;
  return (
    /^\/(reel|reels)\/\d+/i.test(p) ||
    /\/videos\//i.test(p) ||
    (/^\/watch\/?$/i.test(p) && !!u.searchParams.get("v")) ||
    /\/posts\//i.test(p) ||
    /^\/(permalink|story)\.php$/i.test(p) ||
    /^\/photo(\.php)?\/?$/i.test(p) ||
    /\/photos\//i.test(p)
  );
}

const KEEP_PARAMS = ["v", "story_fbid", "id", "fbid", "set"];

/** www.facebook.com URL with tracking parameters (mibextid, rdid, share_url, …) removed. */
export function cleanFacebookUrl(input: URL): string {
  const u = new URL(input.toString());
  u.protocol = "https:";
  if (/(^|\.)facebook\.com$/i.test(u.hostname) || /(^|\.)fb\.com$/i.test(u.hostname))
    u.hostname = "www.facebook.com";
  const kept = new URLSearchParams();
  for (const k of KEEP_PARAMS) {
    const v = u.searchParams.get(k);
    if (v) kept.set(k, v);
  }
  u.search = kept.toString();
  u.hash = "";
  return u.toString();
}

/** True when the text is a plain Facebook link (not an <iframe> embed code). */
export function isFacebookLinkInput(input: string): boolean {
  const raw = (input || "").trim();
  if (!raw || /<iframe/i.test(raw) || /\s/.test(raw)) return false;
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return isFacebookHost(u.hostname);
  } catch {
    return false;
  }
}

export function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e ?? "");
}

export type FacebookEmbed = {
  embedUrl: string;
  sourceUrl: string;
  isVideo: boolean;
  orientation: Orientation;
};

function decodeHtmlAttr(v: string): string {
  return v
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function isVideoPath(u: URL): boolean {
  if (u.hostname.endsWith("fb.watch")) return true;
  return (
    /\/(reel|reels|videos|watch|share\/v|share\/r)(\/|$|\?)/i.test(u.pathname) ||
    u.pathname.startsWith("/watch")
  );
}

/**
 * Accepts either a raw Facebook <iframe> embed code or a normal Facebook reel/post/video link
 * and returns a safe facebook.com/plugins iframe src. Returns null for anything else.
 */
export function parseFacebookInput(input: string): FacebookEmbed | null {
  const raw = (input || "").trim();
  if (!raw) return null;

  if (/<iframe/i.test(raw)) {
    const src = raw.match(/src\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!src) return null;
    let u: URL;
    try {
      u = new URL(decodeHtmlAttr(src));
    } catch {
      return null;
    }
    if (
      u.protocol !== "https:" ||
      !/(^|\.)facebook\.com$/i.test(u.hostname) ||
      !u.pathname.startsWith("/plugins/")
    )
      return null;
    const width = Number(
      raw.match(/width\s*=\s*["']?(\d+)/i)?.[1] ?? u.searchParams.get("width") ?? 0,
    );
    const height = Number(
      raw.match(/height\s*=\s*["']?(\d+)/i)?.[1] ?? u.searchParams.get("height") ?? 0,
    );
    const isVideo = u.pathname.includes("video.php");
    let orientation: Orientation = isVideo ? "vertical" : "square";
    if (width && height)
      orientation =
        height > width * 1.15 ? "vertical" : width > height * 1.15 ? "horizontal" : "square";
    u.hostname = "www.facebook.com";
    return {
      embedUrl: u.toString(),
      sourceUrl: u.searchParams.get("href") ?? u.toString(),
      isVideo,
      orientation,
    };
  }

  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (!isFacebookHost(u.hostname)) return null;
  if (!isFacebookShareUrl(u)) u = new URL(cleanFacebookUrl(u));
  else if (/(^|\.)facebook\.com$/i.test(u.hostname)) u.hostname = "www.facebook.com";
  u.protocol = "https:";
  const isVideo = isVideoPath(u);
  const isReel = /\/(reel|reels|share\/r)(\/|$)/i.test(u.pathname) || u.hostname.endsWith("fb.watch");
  const href = encodeURIComponent(u.toString());
  const embedUrl = isVideo
    ? `https://www.facebook.com/plugins/video.php?href=${href}&show_text=false&width=560&t=0`
    : `https://www.facebook.com/plugins/post.php?href=${href}&show_text=true&width=500`;
  return {
    embedUrl,
    sourceUrl: u.toString(),
    isVideo,
    orientation: isVideo ? (isReel ? "vertical" : "horizontal") : "square",
  };
}

export function isFacebookEmbedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname === "www.facebook.com" &&
      u.pathname.startsWith("/plugins/")
    );
  } catch {
    return false;
  }
}

export function cloudinaryPoster(videoUrl: string): string | undefined {
  try {
    const u = new URL(videoUrl);
    if (!u.hostname.endsWith("res.cloudinary.com")) return undefined;
    return videoUrl.replace(/\.[a-z0-9]+(\?.*)?$/i, ".jpg");
  } catch {
    return undefined;
  }
}

/* ---------------- API integrations ---------------- */

export type ServiceType = "imgbb" | "cloudinary" | "gemini" | "custom";

export const SERVICE_LABELS: Record<ServiceType, string> = {
  imgbb: "ImgBB (Image Hosting)",
  cloudinary: "Cloudinary (Video & Image Hosting)",
  gemini: "Google Gemini AI (Translation)",
  custom: "Custom REST API / Webhook",
};

export type IntegrationOrderable = {
  is_active: boolean;
  is_default: boolean;
  priority: number;
  created_at: string;
};

/** Active entries only: default first, then lowest priority number, then oldest. */
export function orderActiveIntegrations<T extends IntegrationOrderable>(list: T[]): T[] {
  return list
    .filter((i) => i.is_active)
    .sort((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.created_at.localeCompare(b.created_at);
    });
}

export function maskSecret(v: unknown): string {
  const s = typeof v === "string" ? v : "";
  if (!s) return "";
  if (s.length <= 6) return "••••";
  return `••••${s.slice(-4)}`;
}

/* ---------------- Languages ---------------- */

export const LANGUAGES = [
  { code: "orig", label: "Original", native: "मूल" },
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "ur", label: "Urdu", native: "اردو" },
] as const;
export type LangCode = (typeof LANGUAGES)[number]["code"];
export const TRANSLATABLE_LANGS = LANGUAGES.filter((l) => l.code !== "orig").map((l) => l.code);

export function isAsciiText(s: string): boolean {
  // eslint-disable-next-line no-control-regex -- ASCII range check
  return /^[\x00-\x7F]*$/.test(s);
}
