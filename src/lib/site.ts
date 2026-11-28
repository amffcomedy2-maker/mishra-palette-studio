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
  watermark_text: string;
  /** False hides the calling number and every Call button. */
  show_call: boolean;
  /** False hides the WhatsApp number and every WhatsApp button. */
  show_whatsapp: boolean;
  /** False hides the private chat button. */
  chat_enabled: boolean;
};

/** The text fields of the settings (everything except the on/off switches). */
export type TextSettingKey = Exclude<
  keyof SiteSettings,
  "show_call" | "show_whatsapp" | "chat_enabled"
>;

export type ImageHost = "imgbb" | "cloudinary";
export const IMAGE_HOST_LABELS: Record<ImageHost, string> = {
  imgbb: "ImgBB",
  cloudinary: "Cloudinary",
};

/** Upload order: the admin's chosen host first, the other one as automatic backup. */
export function imageHostOrder(preferred: ImageHost): ImageHost[] {
  return preferred === "cloudinary" ? ["cloudinary", "imgbb"] : ["imgbb", "cloudinary"];
}

export const DEFAULT_WATERMARK = "painter.rf.gd";

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
  watermark_text: DEFAULT_WATERMARK,
  show_call: true,
  show_whatsapp: true,
  chat_enabled: true,
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
  /** Playback volume set by the admin, 0–100. */
  volume: number;
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
  const note = [s.show_call ? `Call: ${call}` : "", s.show_whatsapp ? `WhatsApp: ${wa}` : ""]
    .filter(Boolean)
    .join(" | ");
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${vcEscape(last)};${vcEscape(first)};;;`,
    `FN:${vcEscape(`${name} - ${s.business_name}`)}`,
    `ORG:${vcEscape(s.business_name)}`,
    "TITLE:Proprietor",
    ...(s.show_call ? [`TEL;TYPE=CELL,VOICE:${call}`] : []),
    ...(s.show_whatsapp ? [`item1.TEL;TYPE=CELL:${wa}`, "item1.X-ABLabel:WhatsApp"] : []),
    `ADR;TYPE=WORK:;;${vcEscape(s.address)};;;;India`,
    ...(note ? [`NOTE:${vcEscape(note)}`] : []),
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
  const isReel =
    /\/(reel|reels|share\/r)(\/|$)/i.test(u.pathname) || u.hostname.endsWith("fb.watch");
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

/* ---------------- Backup route for photos ---------------- */

/** Photo hosts our own server may fetch on a visitor's behalf when their network blocks the host. */
export function isProxyableImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    return h === "i.ibb.co" || h === "image.ibb.co" || h === "res.cloudinary.com";
  } catch {
    return false;
  }
}

/** Same photo served through this website's own address; null when the host is not allowed. */
export function proxiedImageUrl(url: string | null | undefined): string | null {
  return url && isProxyableImageUrl(url) ? `/api/public/img?u=${encodeURIComponent(url)}` : null;
}

/** Cloudinary re-encodes the video to plain H.264 MP4, which every phone can play. */
export function cloudinaryCompatibleVideo(videoUrl: string | null): string | null {
  if (!videoUrl) return null;
  try {
    const u = new URL(videoUrl);
    const marker = "/video/upload/";
    const at = u.pathname.indexOf(marker);
    if (u.protocol !== "https:" || u.hostname !== "res.cloudinary.com" || at < 0) return null;
    const rest = u.pathname.slice(at + marker.length).replace(/\.[a-z0-9]+$/i, ".mp4");
    return `${u.origin}${u.pathname.slice(0, at + marker.length)}f_mp4,vc_h264,ac_aac,q_auto/${rest}`;
  } catch {
    return null;
  }
}

/** The reel/video URL inside a stored video.php embed, for Facebook's video player SDK. */
export function facebookVideoHref(embedUrl: string | null): string | null {
  if (!embedUrl || !isFacebookEmbedUrl(embedUrl)) return null;
  const u = new URL(embedUrl);
  if (!u.pathname.includes("/plugins/video.php")) return null;
  const href = u.searchParams.get("href");
  if (!href) return null;
  try {
    const h = new URL(href);
    return isFacebookHost(h.hostname) ? h.toString() : null;
  } catch {
    return null;
  }
}

/** Admin volume (0–100) as a 0–1 player volume. */
export function volumeFraction(volume: number | null | undefined): number {
  const v = typeof volume === "number" && Number.isFinite(volume) ? volume : 100;
  return Math.min(100, Math.max(0, Math.round(v))) / 100;
}

/** A filename-safe version of a work title, e.g. "Wall Texture Bedroom" -> "Wall-Texture-Bedroom". */
export function safeFileName(title: string, fallback = "Mishra-Painters"): string {
  const s = (title || "")
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || fallback;
}

/** Escapes text for a Cloudinary l_text overlay (commas and slashes are double-escaped). */
export function cloudinaryOverlayText(text: string): string {
  return encodeURIComponent(text)
    .replace(/%2C/gi, "%252C")
    .replace(/%2F/gi, "%252F")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

/**
 * Download link for a Cloudinary video with the watermark burned into the bottom-left corner
 * (Cloudinary renders it on its servers). Null for videos not hosted on Cloudinary.
 */
export function cloudinaryDownloadUrl(
  videoUrl: string | null,
  watermark: string,
  fileName: string,
): string | null {
  if (!videoUrl) return null;
  let u: URL;
  try {
    u = new URL(videoUrl);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || !u.hostname.endsWith("res.cloudinary.com")) return null;
  const marker = "/video/upload/";
  const at = u.pathname.indexOf(marker);
  if (at < 0) return null;
  const text = (watermark || DEFAULT_WATERMARK).trim().slice(0, 60) || DEFAULT_WATERMARK;
  // Watermark width grows with the text length, relative to the video width.
  const ratio = Math.min(0.7, Math.max(0.2, text.length * 0.03)).toFixed(2);
  const layer = [
    `l_text:Arial_80_bold_stroke:${cloudinaryOverlayText(text)},co_white,bo_6px_solid_black,o_85`,
    `c_scale,fl_relative,w_${ratio}`,
    "fl_layer_apply,g_south_west,x_0.04,y_0.03",
    `fl_attachment:${safeFileName(fileName)}`,
  ].join("/");
  const head = u.pathname.slice(0, at + marker.length);
  const rest = u.pathname.slice(at + marker.length);
  return `${u.origin}${head}${layer}/${rest}`;
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
