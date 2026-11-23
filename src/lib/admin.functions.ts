import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CATEGORIES, isFacebookEmbedUrl, maskSecret, type Post } from "@/lib/site";

const token = z.string().min(10).max(2000);
const orientation = z.enum(["vertical", "horizontal", "square"]);
const category = z.enum(CATEGORIES);
const service = z.enum(["imgbb", "cloudinary", "gemini", "custom"]);
const volume = z.number().int().min(0).max(100);

/** Drops undefined keys so partial updates satisfy exactOptionalPropertyTypes. */
function defined<T extends object>(o: T): { [K in keyof T]?: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };
}

async function core() {
  return import("@/lib/admin-core.server");
}
async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

/** Converts known errors to a safe message; everything else is logged and generic. */
function fail(e: unknown, UserError: new (...a: never[]) => Error): never {
  if (e instanceof UserError) throw new Error(e.message);
  console.error(e);
  throw new Error("Something went wrong. Please try again.");
}

/* ---------- Auth ---------- */

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ pin: z.string().regex(/^\d{4,8}$/) }).parse(i))
  .handler(async ({ data }) => {
    const { loginWithPin } = await core();
    return loginWithPin(data.pin);
  });

export const adminCheck = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ token }).parse(i))
  .handler(async ({ data }) => {
    const { requireAdmin } = await core();
    try {
      await requireAdmin(data.token);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

export const adminChangePin = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        token,
        currentPin: z.string().regex(/^\d{4,8}$/),
        newPin: z.string().regex(/^\d{4,8}$/),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const c = await core();
    try {
      await c.requireAdmin(data.token);
      if (!(await c.checkPin(data.currentPin)))
        throw new c.UserError("Current PIN is wrong (purana PIN galat hai).");
      const v = await c.setPin(data.newPin);
      return { token: await c.issueToken(v) };
    } catch (e) {
      fail(e, c.UserError);
    }
  });

/* ---------- Site settings ---------- */

const settingsShape = z.object({
  devotional_header: z.string().trim().min(1).max(80),
  business_name: z.string().trim().min(1).max(80),
  proprietor_name: z.string().trim().min(1).max(80),
  experience_text: z.string().trim().min(1).max(80),
  services_text: z.string().trim().min(1).max(600),
  call_number: z
    .string()
    .trim()
    .regex(/^[+\d\s-]{10,16}$/, "Enter a valid phone number"),
  whatsapp_number: z
    .string()
    .trim()
    .regex(/^[+\d\s-]{10,16}$/, "Enter a valid phone number"),
  address: z.string().trim().min(1).max(160),
  watermark_text: z.string().trim().min(1, "Watermark can't be empty").max(60),
});

export const adminSaveSettings = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ token, settings: settingsShape }).parse(i))
  .handler(async ({ data }) => {
    const c = await core();
    try {
      await c.requireAdmin(data.token);
      const sb = await admin();
      const { error } = await sb
        .from("site_settings")
        .update({ ...data.settings, updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (error) throw new Error(error.message);
      return { ok: true };
    } catch (e) {
      fail(e, c.UserError);
    }
  });

/* ---------- Posts ---------- */

export const adminListPosts = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ token }).parse(i))
  .handler(async ({ data }) => {
    const c = await core();
    try {
      await c.requireAdmin(data.token);
      const sb = await admin();
      const { data: rows, error } = await sb
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw new Error(error.message);
      return (rows ?? []) as Post[];
    } catch (e) {
      fail(e, c.UserError);
    }
  });

const createMedia = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("facebook"),
    title: z.string().trim().min(1).max(140),
    category,
    note: z.string().trim().max(400).optional(),
    embed_url: z.string().url().refine(isFacebookEmbedUrl, "Not a valid Facebook embed"),
    source_url: z.string().url().max(2000),
    orientation,
    volume: volume.default(100),
  }),
  z.object({
    kind: z.literal("video"),
    title: z.string().trim().min(1).max(140),
    category,
    note: z.string().trim().max(400).optional(),
    video_url: z
      .string()
      .url()
      .max(2000)
      .refine((u) => u.startsWith("https://"), "Video link must start with https://"),
    orientation,
    volume: volume.default(100),
  }),
]);

export const adminCreateMedia = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ token, post: createMedia }).parse(i))
  .handler(async ({ data }) => {
    const c = await core();
    try {
      await c.requireAdmin(data.token);
      const sb = await admin();
      const { data: row, error } = await sb
        .from("posts")
        .insert({ ...data.post, note: data.post.note || null })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      await c.notifyWebhooks("post.published", row);
      return row as Post;
    } catch (e) {
      fail(e, c.UserError);
    }
  });

export const adminUpdatePost = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        token,
        id: z.string().uuid(),
        patch: z.object({
          title: z.string().trim().min(1).max(140).optional(),
          category: category.optional(),
          note: z.string().trim().max(400).nullable().optional(),
          orientation: orientation.optional(),
          is_visible: z.boolean().optional(),
          volume: volume.optional(),
        }),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const c = await core();
    try {
      await c.requireAdmin(data.token);
      const sb = await admin();
      const { error } = await sb
        .from("posts")
        .update({ ...defined(data.patch), updated_at: new Date().toISOString() })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    } catch (e) {
      fail(e, c.UserError);
    }
  });

export const adminDeletePost = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ token, id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const c = await core();
    try {
      await c.requireAdmin(data.token);
      const sb = await admin();
      const { error } = await sb.from("posts").delete().eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    } catch (e) {
      fail(e, c.UserError);
    }
  });

/* ---------- Facebook link resolver ---------- */

/** Follows a Facebook share link on the server and returns the final canonical URL. */
export const adminResolveFacebookUrl = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({ token, url: z.string().trim().min(4).max(2000) }).parse(i),
  )
  .handler(async ({ data }) => {
    const c = await core();
    try {
      await c.requireAdmin(data.token);
      return await c.resolveFacebookUrl(data.url);
    } catch (e) {
      fail(e, c.UserError);
    }
  });

/* ---------- Uploaded visiting card ---------- */

/** Removes the uploaded card picture so the designed visiting card shows again. */
export const adminClearCardImage = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ token }).parse(i))
  .handler(async ({ data }) => {
    const c = await core();
    try {
      await c.requireAdmin(data.token);
      const sb = await admin();
      const { error } = await sb
        .from("site_settings")
        .update({ card_image_url: null, updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (error) throw new Error(error.message);
      return { ok: true };
    } catch (e) {
      fail(e, c.UserError);
    }
  });

/* ---------- API integrations ---------- */

export type AdminIntegration = {
  id: string;
  label: string;
  service: "imgbb" | "cloudinary" | "gemini" | "custom";
  is_active: boolean;
  is_default: boolean;
  priority: number;
  created_at: string;
  last_test_ok: boolean | null;
  last_test_message: string | null;
  last_tested_at: string | null;
  config: {
    api_key_masked: string;
    api_secret_masked: string;
    cloud_name: string;
    upload_preset: string;
    endpoint_url: string;
    model: string;
  };
};

export const adminListIntegrations = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ token }).parse(i))
  .handler(async ({ data }): Promise<AdminIntegration[]> => {
    const c = await core();
    try {
      await c.requireAdmin(data.token);
      const sb = await admin();
      const { data: rows, error } = await sb
        .from("api_integrations")
        .select("*")
        .order("service")
        .order("priority")
        .order("created_at");
      if (error) throw new Error(error.message);
      return (rows ?? []).map((r) => {
        const cfg = (r.config ?? {}) as Record<string, string | undefined>;
        return {
          id: r.id,
          label: r.label,
          service: r.service as AdminIntegration["service"],
          is_active: r.is_active,
          is_default: r.is_default,
          priority: r.priority,
          created_at: r.created_at,
          last_test_ok: r.last_test_ok,
          last_test_message: r.last_test_message,
          last_tested_at: r.last_tested_at,
          config: {
            api_key_masked: maskSecret(cfg["api_key"]),
            api_secret_masked: maskSecret(cfg["api_secret"]),
            cloud_name: cfg["cloud_name"] ?? "",
            upload_preset: cfg["upload_preset"] ?? "",
            endpoint_url: cfg["endpoint_url"] ?? "",
            model: cfg["model"] ?? "",
          },
        };
      });
    } catch (e) {
      fail(e, c.UserError);
    }
  });

const integrationInput = z.object({
  label: z.string().trim().min(1).max(80),
  service,
  is_active: z.boolean(),
  is_default: z.boolean(),
  priority: z.number().int().min(1).max(99),
  // Empty secret fields on edit mean "keep the saved value".
  config: z.object({
    api_key: z.string().trim().max(500).optional(),
    api_secret: z.string().trim().max(500).optional(),
    cloud_name: z.string().trim().max(120).optional(),
    upload_preset: z.string().trim().max(120).optional(),
    endpoint_url: z.string().trim().max(1000).optional(),
    model: z.string().trim().max(80).optional(),
  }),
});

export const adminSaveIntegration = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({ token, id: z.string().uuid().optional(), item: integrationInput }).parse(i),
  )
  .handler(async ({ data }) => {
    const c = await core();
    try {
      await c.requireAdmin(data.token);
      const sb = await admin();
      let existing: Record<string, string> = {};
      if (data.id) {
        const { data: row } = await sb
          .from("api_integrations")
          .select("config")
          .eq("id", data.id)
          .single();
        existing = (row?.config ?? {}) as Record<string, string>;
      }
      const merged: Record<string, string> = { ...existing };
      for (const [k, v] of Object.entries(data.item.config)) {
        if (v === undefined) continue;
        if ((k === "api_key" || k === "api_secret") && v === "") continue;
        merged[k] = v;
      }
      const s = data.item.service;
      if ((s === "imgbb" || s === "gemini") && !merged["api_key"])
        throw new c.UserError("API key is required.");
      if (s === "cloudinary" && !merged["cloud_name"])
        throw new c.UserError("Cloud name is required.");
      if (
        s === "cloudinary" &&
        !merged["upload_preset"] &&
        !(merged["api_key"] && merged["api_secret"])
      )
        throw new c.UserError("Add an Upload Preset, or both API Key and API Secret.");
      if (s === "custom" && !/^https:\/\//i.test(merged["endpoint_url"] ?? ""))
        throw new c.UserError("Endpoint URL must start with https://");

      if (data.item.is_default) {
        await sb.from("api_integrations").update({ is_default: false }).eq("service", s);
      }
      const row = {
        label: data.item.label,
        service: s,
        is_active: data.item.is_active,
        is_default: data.item.is_default,
        priority: data.item.priority,
        config: merged,
        updated_at: new Date().toISOString(),
      };
      const res = data.id
        ? await sb.from("api_integrations").update(row).eq("id", data.id)
        : await sb.from("api_integrations").insert(row);
      if (res.error) throw new Error(res.error.message);
      return { ok: true };
    } catch (e) {
      fail(e, c.UserError);
    }
  });

export const adminPatchIntegration = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        token,
        id: z.string().uuid(),
        patch: z.object({
          is_active: z.boolean().optional(),
          is_default: z.boolean().optional(),
          priority: z.number().int().min(1).max(99).optional(),
        }),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const c = await core();
    try {
      await c.requireAdmin(data.token);
      const sb = await admin();
      if (data.patch.is_default) {
        const { data: row } = await sb
          .from("api_integrations")
          .select("service")
          .eq("id", data.id)
          .single();
        if (row)
          await sb
            .from("api_integrations")
            .update({ is_default: false })
            .eq("service", row.service);
      }
      const { error } = await sb
        .from("api_integrations")
        .update({ ...defined(data.patch), updated_at: new Date().toISOString() })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    } catch (e) {
      fail(e, c.UserError);
    }
  });

export const adminDeleteIntegration = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ token, id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const c = await core();
    try {
      await c.requireAdmin(data.token);
      const sb = await admin();
      const { error } = await sb.from("api_integrations").delete().eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    } catch (e) {
      fail(e, c.UserError);
    }
  });

export const adminTestIntegration = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ token, id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const c = await core();
    try {
      await c.requireAdmin(data.token);
      const sb = await admin();
      const { data: row, error } = await sb
        .from("api_integrations")
        .select("*")
        .eq("id", data.id)
        .single();
      if (error || !row) throw new c.UserError("API entry not found.");
      const result = await c.testIntegration(
        row.service as "imgbb",
        (row.config ?? {}) as Record<string, string>,
      );
      await sb
        .from("api_integrations")
        .update({
          last_test_ok: result.ok,
          last_test_message: result.message.slice(0, 300),
          last_tested_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      return result;
    } catch (e) {
      fail(e, c.UserError);
    }
  });

/** Upload targets for direct-to-Cloudinary video uploads, in failover order. */
export const adminCloudinaryTargets = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ token }).parse(i))
  .handler(async ({ data }) => {
    const c = await core();
    try {
      await c.requireAdmin(data.token);
      const list = await c.activeIntegrations("cloudinary");
      const targets: { label: string; cloudName: string; fields: Record<string, string> }[] = [];
      for (const it of list) {
        const cfg = it.config;
        if (!cfg.cloud_name) continue;
        if (cfg.api_key && cfg.api_secret) {
          const timestamp = String(Math.floor(Date.now() / 1000));
          const folder = "mishra-painters";
          const signature = await c.sha1Hex(
            `folder=${folder}&timestamp=${timestamp}${cfg.api_secret}`,
          );
          targets.push({
            label: it.label,
            cloudName: cfg.cloud_name,
            fields: { api_key: cfg.api_key, timestamp, folder, signature },
          });
        } else if (cfg.upload_preset) {
          targets.push({
            label: it.label,
            cloudName: cfg.cloud_name,
            fields: { upload_preset: cfg.upload_preset },
          });
        }
      }
      return targets;
    } catch (e) {
      fail(e, c.UserError);
    }
  });

export const adminOverview = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ token }).parse(i))
  .handler(async ({ data }) => {
    const c = await core();
    try {
      await c.requireAdmin(data.token);
      const [imgbb, cloudinary, gemini] = await Promise.all([
        c.activeIntegrations("imgbb"),
        c.activeIntegrations("cloudinary"),
        c.activeIntegrations("gemini"),
      ]);
      return { imgbb: imgbb.length, cloudinary: cloudinary.length, gemini: gemini.length };
    } catch (e) {
      fail(e, c.UserError);
    }
  });
