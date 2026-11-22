// Server-only helpers for the PIN-protected admin panel, uploads and translation.
// Only import this file dynamically from inside server function / server route handlers.
import { getRequestHeader } from "@tanstack/react-start/server";
import { generateChatCompletion } from "@lovable.dev/ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { DEFAULT_PIN, orderActiveIntegrations, type ServiceType } from "@/lib/site";

const enc = new TextEncoder();

/** Errors whose message is safe to show the admin. */
export class UserError extends Error {}

function b64url(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(str: string): string {
  const pad = str.length % 4 ? "=".repeat(4 - (str.length % 4)) : "";
  return atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
}
function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function hmac(data: string): Promise<string> {
  const secret = process.env["ADMIN_SESSION_SECRET"];
  if (!secret) throw new Error("ADMIN_SESSION_SECRET missing");
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data))));
}

export async function sha256Hex(s: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}
export async function sha1Hex(s: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-1", enc.encode(s)));
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 100000 },
    key,
    256,
  );
  return hex(bits);
}

async function getAuthRow() {
  const { data, error } = await supabaseAdmin.from("admin_auth").select("*").eq("id", 1).single();
  if (error || !data) throw new Error("admin_auth row missing");
  return data;
}

export async function checkPin(pin: string): Promise<boolean> {
  const row = await getAuthRow();
  if (!row.pin_hash || !row.pin_salt) return safeEqual(pin, DEFAULT_PIN);
  return safeEqual(await hashPin(pin, row.pin_salt), row.pin_hash);
}

export async function setPin(pin: string): Promise<number> {
  const row = await getAuthRow();
  const salt = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const nextVersion = row.session_version + 1;
  const { error } = await supabaseAdmin
    .from("admin_auth")
    .update({
      pin_hash: await hashPin(pin, salt),
      pin_salt: salt,
      session_version: nextVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  return nextVersion;
}

const SESSION_MS = 12 * 60 * 60 * 1000;

export async function issueToken(version?: number): Promise<string> {
  const v = version ?? (await getAuthRow()).session_version;
  const payload = b64url(enc.encode(JSON.stringify({ v, exp: Date.now() + SESSION_MS })));
  return `${payload}.${await hmac(payload)}`;
}

/** Throws UserError("SESSION_EXPIRED") unless the token is a valid, current admin session. */
export async function requireAdmin(token: string | undefined | null): Promise<void> {
  if (!token || typeof token !== "string") throw new UserError("SESSION_EXPIRED");
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(await hmac(payload), sig))
    throw new UserError("SESSION_EXPIRED");
  let parsed: { v: number; exp: number };
  try {
    parsed = JSON.parse(fromB64url(payload));
  } catch {
    throw new UserError("SESSION_EXPIRED");
  }
  if (!parsed.exp || parsed.exp < Date.now()) throw new UserError("SESSION_EXPIRED");
  const row = await getAuthRow();
  if (row.session_version !== parsed.v) throw new UserError("SESSION_EXPIRED");
}

/* ---------- Login rate limiting (per IP) ---------- */

function clientKey(): string {
  const ip =
    getRequestHeader("cf-connecting-ip") ||
    getRequestHeader("x-real-ip") ||
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  return `ip:${ip}`;
}

const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;

export async function loginWithPin(
  pin: string,
): Promise<{ ok: true; token: string } | { ok: false; message: string }> {
  const key = clientKey();
  const { data: attempt } = await supabaseAdmin
    .from("login_attempts")
    .select("*")
    .eq("key", key)
    .maybeSingle();
  const now = Date.now();
  if (attempt?.locked_until && new Date(attempt.locked_until).getTime() > now) {
    const mins = Math.ceil((new Date(attempt.locked_until).getTime() - now) / 60000);
    return {
      ok: false,
      message: `Too many wrong tries. Please wait ${mins} min. (Kuch der baad try karein)`,
    };
  }
  if (await checkPin(pin)) {
    await supabaseAdmin.from("login_attempts").delete().eq("key", key);
    return { ok: true, token: await issueToken() };
  }
  const fresh = !attempt || now - new Date(attempt.first_at).getTime() > WINDOW_MS;
  const attempts = fresh ? 1 : attempt.attempts + 1;
  const locked = attempts >= MAX_ATTEMPTS;
  await supabaseAdmin.from("login_attempts").upsert({
    key,
    attempts: locked ? 0 : attempts,
    first_at: fresh ? new Date(now).toISOString() : attempt!.first_at,
    locked_until: locked ? new Date(now + LOCK_MS).toISOString() : null,
  });
  if (locked) return { ok: false, message: "Too many wrong tries. Locked for 5 minutes." };
  return { ok: false, message: `Wrong PIN (galat PIN). ${MAX_ATTEMPTS - attempts} tries left.` };
}

/* ---------- Integrations ---------- */

export type IntegrationConfig = {
  api_key?: string;
  api_secret?: string;
  cloud_name?: string;
  upload_preset?: string;
  endpoint_url?: string;
  model?: string;
};

export async function activeIntegrations(service: ServiceType) {
  const { data, error } = await supabaseAdmin
    .from("api_integrations")
    .select("*")
    .eq("service", service);
  if (error) throw new Error(error.message);
  return orderActiveIntegrations(data ?? []).map((r) => ({
    ...r,
    config: (r.config ?? {}) as IntegrationConfig,
  }));
}

/* ---------- ImgBB with failover ---------- */

export async function uploadToImgbb(
  file: Blob,
  filename: string,
): Promise<{ url: string; label: string; failed: string[] }> {
  const list = (await activeIntegrations("imgbb")).filter((i) => i.config.api_key);
  if (!list.length)
    throw new UserError("No active ImgBB API key found. Please add one in the API Manager tab.");
  const failed: string[] = [];
  for (const it of list) {
    try {
      const fd = new FormData();
      fd.append("image", file, filename);
      const res = await fetch(
        `https://api.imgbb.com/1/upload?key=${encodeURIComponent(it.config.api_key!)}`,
        {
          method: "POST",
          body: fd,
          signal: AbortSignal.timeout(60000),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        data?: { url?: string };
        error?: { message?: string };
      } | null;
      if (res.ok && json?.success && json.data?.url)
        return { url: json.data.url, label: it.label, failed };
      failed.push(`${it.label}: ${json?.error?.message ?? `HTTP ${res.status}`}`);
    } catch (e) {
      failed.push(`${it.label}: ${e instanceof Error ? e.message : "network error"}`);
    }
  }
  throw new UserError(`Upload failed on all ImgBB keys. ${failed.join(" | ")}`);
}

const TINY_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export async function testIntegration(
  service: ServiceType,
  c: IntegrationConfig,
): Promise<{ ok: boolean; message: string }> {
  try {
    if (service === "imgbb") {
      if (!c.api_key) return { ok: false, message: "API key is empty" };
      const fd = new FormData();
      fd.append("image", TINY_PNG);
      const res = await fetch(
        `https://api.imgbb.com/1/upload?expiration=60&key=${encodeURIComponent(c.api_key)}`,
        { method: "POST", body: fd, signal: AbortSignal.timeout(20000) },
      );
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: { message?: string };
      } | null;
      return res.ok && json?.success
        ? { ok: true, message: "ImgBB key works ✓" }
        : { ok: false, message: json?.error?.message ?? `HTTP ${res.status}` };
    }
    if (service === "cloudinary") {
      if (!c.cloud_name) return { ok: false, message: "Cloud name is empty" };
      if (c.api_key && c.api_secret) {
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${encodeURIComponent(c.cloud_name)}/ping`,
          {
            headers: { Authorization: `Basic ${btoa(`${c.api_key}:${c.api_secret}`)}` },
            signal: AbortSignal.timeout(20000),
          },
        );
        if (res.ok) return { ok: true, message: "Cloudinary credentials work ✓ (signed uploads)" };
        const j = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        return { ok: false, message: j?.error?.message ?? `HTTP ${res.status}` };
      }
      if (!c.upload_preset)
        return { ok: false, message: "Add an Upload Preset (unsigned) or API Key + API Secret" };
      const fd = new FormData();
      fd.append("file", `data:image/png;base64,${TINY_PNG}`);
      fd.append("upload_preset", c.upload_preset);
      fd.append("tags", "connection-test");
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(c.cloud_name)}/image/upload`,
        { method: "POST", body: fd, signal: AbortSignal.timeout(20000) },
      );
      const j = (await res.json().catch(() => null)) as {
        secure_url?: string;
        error?: { message?: string };
      } | null;
      return res.ok && j?.secure_url
        ? { ok: true, message: "Cloudinary upload preset works ✓" }
        : { ok: false, message: j?.error?.message ?? `HTTP ${res.status}` };
    }
    if (service === "gemini") {
      if (!c.api_key) return { ok: false, message: "API key is empty" };
      const model = c.model?.trim() || "gemini-2.5-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`,
        {
          headers: { "x-goog-api-key": c.api_key },
          signal: AbortSignal.timeout(20000),
        },
      );
      if (res.ok) return { ok: true, message: `Gemini key works ✓ (model ${model})` };
      const j = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      return { ok: false, message: j?.error?.message ?? `HTTP ${res.status}` };
    }
    if (!c.endpoint_url || !/^https:\/\//i.test(c.endpoint_url))
      return { ok: false, message: "Endpoint URL must start with https://" };
    const res = await fetch(c.endpoint_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(c.api_key ? { Authorization: `Bearer ${c.api_key}` } : {}),
      },
      body: JSON.stringify({
        event: "test",
        source: "Mishra Painters",
        at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(15000),
    });
    return res.ok
      ? { ok: true, message: `Endpoint replied ${res.status} ✓` }
      : { ok: false, message: `Endpoint replied HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Connection failed" };
  }
}

/** Fire-and-forget notifications to active custom webhooks. Never throws. */
export async function notifyWebhooks(event: string, payload: unknown): Promise<void> {
  try {
    const hooks = (await activeIntegrations("custom")).filter(
      (h) => h.config.endpoint_url && /^https:\/\//i.test(h.config.endpoint_url),
    );
    await Promise.allSettled(
      hooks.map((h) =>
        fetch(h.config.endpoint_url!, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(h.config.api_key ? { Authorization: `Bearer ${h.config.api_key}` } : {}),
          },
          body: JSON.stringify({
            event,
            source: "Mishra Painters",
            data: payload,
            at: new Date().toISOString(),
          }),
          signal: AbortSignal.timeout(5000),
        }),
      ),
    );
  } catch (e) {
    console.error("webhook notify failed", e);
  }
}

/* ---------- Translation (Gemini keys with failover, Lovable AI as backup) ---------- */

function buildPrompt(langName: string, texts: string[]): string {
  return [
    `Translate every string in the JSON array below into ${langName} for a premium house-painting contractor's website.`,
    "Rules:",
    '- Return ONLY JSON of the form {"translations": [ ... ]} with exactly the same number of items, in the same order.',
    "- Transliterate proper names (business name, person names, place names like Sector 105, Gurgaon) into the target script instead of translating their meaning.",
    "- Keep digits, phone numbers, '+', URLs, emojis and symbols such as ॥ … unchanged.",
    "- Keep the tone warm, respectful and short. Do not add explanations.",
    "",
    JSON.stringify(texts),
  ].join("\n");
}

function parseTranslations(text: string | null | undefined, expected: number): string[] | null {
  if (!text) return null;
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as { translations?: unknown } | unknown[];
    const arr = Array.isArray(parsed)
      ? parsed
      : (parsed as { translations?: unknown }).translations;
    if (Array.isArray(arr) && arr.length === expected && arr.every((x) => typeof x === "string"))
      return arr as string[];
  } catch {
    /* fall through */
  }
  return null;
}

async function translateViaGemini(langName: string, texts: string[]): Promise<string[] | null> {
  const keys = (await activeIntegrations("gemini")).filter((k) => k.config.api_key);
  for (const k of keys) {
    const model = k.config.model?.trim() || "gemini-2.5-flash";
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": k.config.api_key! },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: buildPrompt(langName, texts) }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
          }),
          signal: AbortSignal.timeout(45000),
        },
      );
      if (!res.ok) {
        console.warn(`Gemini key "${k.label}" failed with HTTP ${res.status}`);
        continue;
      }
      const j = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const out = parseTranslations(
        j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join(""),
        texts.length,
      );
      if (out) return out;
    } catch (e) {
      console.warn(`Gemini key "${k.label}" error`, e);
    }
  }
  return null;
}

async function translateViaLovableAI(langName: string, texts: string[]): Promise<string[] | null> {
  try {
    const res = await generateChatCompletion({
      model: "google/gemini-3.1-flash-lite",
      messages: [{ role: "user", content: buildPrompt(langName, texts) }],
      response_format: { type: "json_object" },
    });
    const content = res.choices?.[0]?.message?.content;
    return parseTranslations(typeof content === "string" ? content : null, texts.length);
  } catch (e) {
    console.error("Lovable AI translation failed", e);
    return null;
  }
}

export async function translateBatch(
  lang: string,
  langName: string,
  texts: string[],
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(texts));
  const keyed = await Promise.all(
    unique.map(async (t) => ({ t, key: await sha256Hex(`${lang}\u0000${t}`) })),
  );
  const result: Record<string, string> = {};
  const { data: cached } = await supabaseAdmin
    .from("translation_cache")
    .select("key, translated")
    .in(
      "key",
      keyed.map((k) => k.key),
    );
  const cacheMap = new Map((cached ?? []).map((c) => [c.key, c.translated]));
  const missing = keyed.filter((k) => {
    const hit = cacheMap.get(k.key);
    if (hit !== undefined) result[k.t] = hit;
    return hit === undefined;
  });
  if (!missing.length) return result;

  const sources = missing.map((m) => m.t);
  const translated =
    (await translateViaGemini(langName, sources)) ??
    (await translateViaLovableAI(langName, sources));
  if (!translated) throw new UserError("Translation is not available right now. Please try again.");
  const rows = missing.map((m, i) => ({
    key: m.key,
    lang,
    source: m.t,
    translated: translated[i]!,
  }));
  rows.forEach((r) => (result[r.source] = r.translated));
  await supabaseAdmin.from("translation_cache").upsert(rows);
  return result;
}
