import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CATEGORIES } from "@/lib/site";

const MAX_BYTES = 32 * 1024 * 1024;

const meta = z.object({
  title: z.string().trim().min(1).max(140),
  category: z.enum(CATEGORIES),
  note: z.string().trim().max(400).optional(),
});

// Receives the admin's photo, uploads it to the chosen photo host (with failover) and publishes the post.
export const Route = createFileRoute("/api/admin/upload-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const c = await import("@/lib/admin-core.server");
        try {
          const auth = request.headers.get("authorization") ?? "";
          await c.requireAdmin(auth.replace(/^Bearer\s+/i, ""));
          const form = await request.formData();
          const file = form.get("image");
          if (!(file instanceof File) || !file.size)
            return Response.json({ error: "Please choose a photo." }, { status: 400 });
          if (!file.type.startsWith("image/"))
            return Response.json({ error: "Only image files are allowed." }, { status: 400 });
          if (file.size > MAX_BYTES)
            return Response.json({ error: "Photo is larger than 32 MB." }, { status: 400 });
          const parsed = meta.safeParse({
            title: form.get("title"),
            category: form.get("category"),
            note: (form.get("note") as string | null) || undefined,
          });
          if (!parsed.success)
            return Response.json(
              { error: "Work title and category are required." },
              { status: 400 },
            );

          const uploaded = await c.uploadImage(file, file.name || "work.jpg");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: row, error } = await supabaseAdmin
            .from("posts")
            .insert({
              kind: "photo",
              title: parsed.data.title,
              category: parsed.data.category,
              note: parsed.data.note || null,
              image_url: uploaded.url,
              orientation: "square",
            })
            .select("*")
            .single();
          if (error) throw new Error(error.message);
          await c.notifyWebhooks("post.published", row);
          return Response.json({ post: row, usedKey: uploaded.label, host: uploaded.host, failedKeys: uploaded.failed });
        } catch (e) {
          if (e instanceof c.UserError) {
            const status = e.message === "SESSION_EXPIRED" ? 401 : 400;
            return Response.json({ error: e.message }, { status });
          }
          console.error("upload-image failed", e);
          return Response.json({ error: "Upload failed. Please try again." }, { status: 500 });
        }
      },
    },
  },
});
