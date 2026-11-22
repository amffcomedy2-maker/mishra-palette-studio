import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { getRealtimeClient } from "@/lib/realtime-client";
import { getPublicData } from "@/lib/public.functions";
import { CardHero } from "@/components/site/CardHero";
import { Portfolio } from "@/components/site/Portfolio";
import { SiteHeader } from "@/components/site/SiteHeader";
import { FloatingContact } from "@/components/site/FloatingContact";
import { useT } from "@/lib/i18n";

const publicDataQuery = queryOptions({
  queryKey: ["public-data"],
  queryFn: () => getPublicData(),
  staleTime: 15_000,
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(publicDataQuery),
  head: () => ({
    meta: [
      { title: "Mishra Painters — Pro. Amit Mishra | Wall Painting in Gurgaon" },
      {
        name: "description",
        content:
          "Digital visiting card of Mishra Painters, Sector 105 Gurgaon. Painting, wall putty, plastic paint, royal play, wall texture & furniture polish. Call or WhatsApp now.",
      },
      { property: "og:title", content: "Mishra Painters — Pro. Amit Mishra" },
      {
        property: "og:description",
        content:
          "Painting, wall putty, royal play, wall texture & furniture polish in Gurgaon. See our original work and WhatsApp us.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function useLiveContent() {
  const qc = useQueryClient();
  useEffect(() => {
    const rt = getRealtimeClient();
    if (!rt) return;
    let channel: ReturnType<typeof rt.channel> | null = null;
    try {
      // Shared public broadcast room; the database trigger sends a data-free "changed" event.
      channel = rt
        .channel("site-content")
        .on("broadcast", { event: "changed" }, () => {
          void qc.invalidateQueries({ queryKey: ["public-data"] });
        })
        .subscribe();
    } catch {
      channel = null;
    }
    return () => {
      if (channel) void rt.removeChannel(channel);
    };
  }, [qc]);
}

function Home() {
  const { data } = useSuspenseQuery(publicDataQuery);
  const t = useT();
  useLiveContent();
  const s = data.settings;
  return (
    <div id="top" className="min-h-screen">
      <SiteHeader businessName={s.business_name} />
      <main>
        <CardHero settings={s} cardImageUrl={data.cardImageUrl} />
        <Portfolio posts={data.posts} settings={s} />
      </main>
      <footer className="border-t border-border px-4 pb-28 pt-8 text-center text-sm text-muted-foreground">
        <p className="font-display text-base font-semibold text-gold-gradient">
          {t(s.business_name)}
        </p>
        <p className="mt-1">
          {t("Pro.")} {t(s.proprietor_name)} · {t(s.address)}
        </p>
      </footer>
      <FloatingContact settings={s} />
    </div>
  );
}
