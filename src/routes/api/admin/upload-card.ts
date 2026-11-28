import { createFileRoute } from "@tanstack/react-router";

const MAX_BYTES = 32 * 1024 * 1024;

// Receives a new visiting card picture, uploads it to the chosen photo host (with failover) and makes it live.
export const Route = createFileRoute("/api/admin/upload-card")({
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
            return Response.json({ error: "Please choose the visiting card picture." }, { status: 400 });
          if (!file.type.startsWith("image/"))
            return Response.json({ error: "Only image files are allowed." }, { status: 400 });
          if (file.size > MAX_BYTES)
            return Response.json({ error: "Picture is larger than 32 MB." }, { status: 400 });

          const uploaded = await c.uploadImage(file, file.name || "visiting-card.jpg");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin
            .from("site_settings")
            .update({ card_image_url: uploaded.url, updated_at: new Date().toISOString() })
            .eq("id", 1);
          if (error) throw new Error(error.message);
          return Response.json({ url: uploaded.url, usedKey: uploaded.label, host: uploaded.host, failedKeys: uploaded.failed });
        } catch (e) {
          if (e instanceof c.UserError) {
            const status = e.message === "SESSION_EXPIRED" ? 401 : 400;
            return Response.json({ error: e.message }, { status });
          }
          console.error("upload-card failed", e);
          return Response.json({ error: "Upload failed. Please try again." }, { status: 500 });
        }
      },
    },
  },
});
