import { createFileRoute } from "@tanstack/react-router";
import { isProxyableImageUrl } from "@/lib/site";

const MAX_BYTES = 40 * 1024 * 1024;

// Backup route for work photos: when a visitor's network blocks the photo host (ImgBB is blocked
// or "service unavailable" on some mobile networks), the browser asks this website instead.
// Only https photos from the allowed photo hosts are fetched; nothing private is returned.
export const Route = createFileRoute("/api/public/img")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const target = new URL(request.url).searchParams.get("u") ?? "";
        if (!isProxyableImageUrl(target)) return new Response("Not allowed", { status: 400 });
        let upstream: Response | null = null;
        for (let attempt = 0; attempt < 2 && !upstream; attempt++) {
          try {
            const res = await fetch(target, {
              headers: { Accept: "image/*" },
              signal: AbortSignal.timeout(25000),
            });
            if (res.ok) upstream = res;
            else void res.body?.cancel();
          } catch {
            /* retry once */
          }
        }
        if (!upstream || !isProxyableImageUrl(upstream.url || target))
          return new Response("Photo unavailable", { status: 502 });
        const type = upstream.headers.get("content-type") ?? "";
        const length = Number(upstream.headers.get("content-length") ?? 0);
        if (!type.startsWith("image/") || length > MAX_BYTES) {
          void upstream.body?.cancel();
          return new Response("Not a photo", { status: 415 });
        }
        const headers = new Headers({
          "Content-Type": type,
          "Cache-Control": "public, max-age=2592000, immutable",
          "Access-Control-Allow-Origin": "*",
          "X-Content-Type-Options": "nosniff",
        });
        if (length) headers.set("Content-Length", String(length));
        return new Response(upstream.body, { status: 200, headers });
      },
    },
  },
});
