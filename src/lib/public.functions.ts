import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import {
  DEFAULT_SETTINGS,
  LANGUAGES,
  TRANSLATABLE_LANGS,
  type Post,
  type SiteSettings,
} from "@/lib/site";

function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type PublicData = { settings: SiteSettings; posts: Post[] };

export const getPublicData = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicData> => {
    const sb = publicClient();
    const [s, p] = await Promise.all([
      sb.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      sb
        .from("posts")
        .select("*")
        .eq("is_visible", true)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    if (s.error) console.error("settings read failed", s.error);
    if (p.error) console.error("posts read failed", p.error);
    const row = s.data;
    const settings: SiteSettings = row
      ? {
          devotional_header: row.devotional_header,
          business_name: row.business_name,
          proprietor_name: row.proprietor_name,
          experience_text: row.experience_text,
          services_text: row.services_text,
          call_number: row.call_number,
          whatsapp_number: row.whatsapp_number,
          address: row.address,
        }
      : DEFAULT_SETTINGS;
    return { settings, posts: (p.data ?? []) as Post[] };
  },
);

const translateInput = z.object({
  lang: z.enum(TRANSLATABLE_LANGS as [string, ...string[]]),
  texts: z.array(z.string().min(1).max(1500)).min(1).max(80),
});

export const translateTexts = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const parsed = translateInput.parse(input);
    if (parsed.texts.reduce((n, t) => n + t.length, 0) > 20000) throw new Error("Too much text");
    return parsed;
  })
  .handler(async ({ data }) => {
    const { translateBatch, UserError } = await import("@/lib/admin-core.server");
    const langName = LANGUAGES.find((l) => l.code === data.lang)?.label ?? "English";
    try {
      return {
        ok: true as const,
        translations: await translateBatch(data.lang, langName, data.texts),
      };
    } catch (e) {
      console.error("translate failed", e);
      return {
        ok: false as const,
        translations: {} as Record<string, string>,
        error: e instanceof UserError ? e.message : "Translation failed",
      };
    }
  });
