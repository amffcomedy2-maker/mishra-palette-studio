import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Expand,
  Images,
  LayoutGrid,
  Sparkles,
  X,
} from "lucide-react";
import { WhatsAppIcon } from "./icons";
import { Reveal } from "./motion";
import { useT } from "@/lib/i18n";
import {
  CATEGORIES,
  cloudinaryPoster,
  defaultEnquiryMessage,
  whatsappLink,
  workEnquiryMessage,
  type Post,
  type SiteSettings,
} from "@/lib/site";
import { cn } from "@/lib/utils";

type Tab = "all" | "photos" | "reels";

const aspect: Record<Post["orientation"], string> = {
  vertical: "aspect-[9/16]",
  horizontal: "aspect-video",
  square: "aspect-[4/5]",
};

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="icon-tile size-12 shrink-0">{icon}</span>
      <div>
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function PhotoCard({
  post,
  onOpen,
  t,
}: {
  post: Post;
  onOpen: () => void;
  t: (s: string) => string;
}) {
  return (
    <article className="lift glass group overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={onOpen}
        className="relative block w-full overflow-hidden"
        aria-label={`Open ${post.title}`}
      >
        <img
          src={post.image_url ?? ""}
          alt={post.title}
          loading="lazy"
          decoding="async"
          className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <span className="media-shade pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <span className="btn-gold absolute right-3 top-3 grid size-10 place-items-center rounded-xl opacity-0 transition-all duration-300 group-hover:opacity-100">
          <Expand className="size-4" />
        </span>
      </button>
      <div className="border-t border-border px-4 py-3.5">
        <h3 className="font-serif-lux text-lg font-semibold leading-snug text-foreground">
          {t(post.title)}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
            {t(post.category)}
          </span>
        </div>
        {post.note && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{t(post.note)}</p>
        )}
      </div>
    </article>
  );
}

function MediaCard({ post, t }: { post: Post; t: (s: string) => string }) {
  return (
    <article className="lift glass overflow-hidden rounded-2xl">
      <div className={cn("relative w-full overflow-hidden bg-muted", aspect[post.orientation])}>
        {post.kind === "facebook" && post.embed_url ? (
          <iframe
            src={post.embed_url}
            title={post.title}
            loading="lazy"
            className="absolute inset-0 size-full border-0"
            scrolling="no"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : post.video_url ? (
          <video
            src={post.video_url}
            poster={cloudinaryPoster(post.video_url)}
            controls
            playsInline
            preload="metadata"
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
      </div>
      <div className="border-t border-border px-4 py-3.5">
        <h3 className="font-serif-lux text-lg font-semibold leading-snug text-foreground">
          {t(post.title)}
        </h3>
        <span className="mt-1.5 inline-block rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
          {t(post.category)}
        </span>
        {post.note && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{t(post.note)}</p>
        )}
      </div>
    </article>
  );
}

function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
  settings,
  t,
}: {
  photos: Post[];
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
  settings: SiteSettings;
  t: (s: string) => string;
}) {
  const post = index !== null ? photos[index] : undefined;
  const go = (d: number) =>
    index !== null && photos.length && onIndex((index + d + photos.length) % photos.length);
  return (
    <Dialog.Root open={!!post} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay-scrim fixed inset-0 z-[60] animate-in fade-in" />
        <Dialog.Content
          className="fixed inset-0 z-[61] flex flex-col outline-none animate-in fade-in zoom-in-95"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(1);
            if (e.key === "ArrowLeft") go(-1);
          }}
        >
          {post && (
            <>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <Dialog.Title className="font-serif-lux truncate text-lg font-semibold text-foreground">
                  {t(post.title)}
                </Dialog.Title>
                <Dialog.Close className="chip size-10 justify-center p-0" aria-label="Close">
                  <X className="size-5" />
                </Dialog.Close>
              </div>
              <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
                <img
                  src={post.image_url ?? ""}
                  alt={post.title}
                  className="max-h-full max-w-full rounded-xl object-contain shadow-lux-3"
                />
                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => go(-1)}
                      className="chip absolute left-2 top-1/2 size-11 -translate-y-1/2 justify-center p-0"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => go(1)}
                      className="chip absolute right-2 top-1/2 size-11 -translate-y-1/2 justify-center p-0"
                      aria-label="Next photo"
                    >
                      <ChevronRight className="size-5" />
                    </button>
                  </>
                )}
              </div>
              <div className="mx-auto w-full max-w-2xl px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 text-center">
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                  {t(post.category)}
                </span>
                <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                  {post.note ? t(post.note) : t("Original work by Mishra Painters")}
                </Dialog.Description>
                <a
                  href={whatsappLink(
                    settings.whatsapp_number,
                    workEnquiryMessage(settings.proprietor_name, post.title),
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-3d btn-whatsapp mt-4 inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 font-bold"
                >
                  <WhatsAppIcon className="size-5" />
                  {t("Ask About This Work on WhatsApp")}
                </a>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Portfolio({
  posts,
  settings,
  loading,
}: {
  posts: Post[];
  settings: SiteSettings;
  loading?: boolean;
}) {
  const t = useT();
  const [tab, setTab] = useState<Tab>("all");
  const [cat, setCat] = useState<string>("all");
  const [open, setOpen] = useState<number | null>(null);

  const filtered = useMemo(
    () => posts.filter((p) => cat === "all" || p.category === cat),
    [posts, cat],
  );
  const photos = filtered.filter((p) => p.kind === "photo" && p.image_url);
  const media = filtered.filter((p) => p.kind !== "photo");
  const showPhotos = tab !== "reels";
  const showMedia = tab !== "photos";
  const nothing = (!showPhotos || !photos.length) && (!showMedia || !media.length);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: t("All Work"), icon: <LayoutGrid className="size-4" /> },
    { id: "photos", label: t("Work Photos"), icon: <Images className="size-4" /> },
    { id: "reels", label: t("Reels & Videos"), icon: <Clapperboard className="size-4" /> },
  ];

  return (
    <section id="work" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pb-32 pt-16 sm:pt-24">
      <Reveal>
        <SectionTitle
          icon={<Sparkles className="size-6" />}
          title={t("Our Original Work")}
          subtitle={t("Real homes, real finishes — straight from our sites")}
        />
      </Reveal>

      <Reveal delay={80} className="mt-7">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          {tabs.map((x) => (
            <button
              key={x.id}
              type="button"
              data-active={tab === x.id}
              onClick={() => setTab(x.id)}
              className="chip"
            >
              {x.icon}
              {x.label}
            </button>
          ))}
        </div>
        <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          <button
            type="button"
            data-active={cat === "all"}
            onClick={() => setCat("all")}
            className="chip px-3 py-1.5 text-xs"
          >
            {t("All")}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              data-active={cat === c}
              onClick={() => setCat(c)}
              className="chip px-3 py-1.5 text-xs"
            >
              {t(c)}
            </button>
          ))}
        </div>
      </Reveal>

      {loading ? (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-gold aspect-[4/5] rounded-2xl" />
          ))}
        </div>
      ) : nothing ? (
        <Reveal className="mt-10">
          <div className="glass mx-auto max-w-xl rounded-3xl p-8 text-center">
            <span className="icon-tile mx-auto size-14 animate-float">
              <Images className="size-7" />
            </span>
            <h3 className="mt-5 text-xl font-bold text-foreground">
              {t("New work is being added")}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(
                "Photos and reels of our latest sites will appear here soon. Ask us on WhatsApp for recent work photos.",
              )}
            </p>
            <a
              href={whatsappLink(
                settings.whatsapp_number,
                defaultEnquiryMessage(settings.proprietor_name),
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-3d btn-whatsapp mt-6 inline-flex h-12 items-center gap-2 rounded-2xl px-6 font-bold"
            >
              <WhatsAppIcon className="size-5" />
              {t("WhatsApp Now")}
            </a>
          </div>
        </Reveal>
      ) : (
        <>
          {showPhotos && photos.length > 0 && (
            <div className="mt-8">
              {tab === "all" && (
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gold">
                  <Images className="size-5" />
                  {t("Work Photos")}
                </h3>
              )}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {photos.map((p, i) => (
                  <Reveal key={p.id} delay={(i % 3) * 80}>
                    <PhotoCard post={p} t={t} onOpen={() => setOpen(i)} />
                  </Reveal>
                ))}
              </div>
            </div>
          )}
          {showMedia && media.length > 0 && (
            <div className="mt-12">
              {tab === "all" && (
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gold">
                  <Clapperboard className="size-5" />
                  {t("Reels & Videos")}
                </h3>
              )}
              <div className="-mx-4 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-4">
                {media.map((p, i) => (
                  <div
                    key={p.id}
                    className={cn(
                      "shrink-0 snap-center",
                      p.orientation === "horizontal"
                        ? "w-[88vw] md:col-span-2 md:w-auto"
                        : "w-[74vw] max-w-[340px] md:w-auto md:max-w-none",
                    )}
                  >
                    <Reveal delay={(i % 4) * 70}>
                      <MediaCard post={p} t={t} />
                    </Reveal>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Lightbox
        photos={photos}
        index={open}
        onIndex={setOpen}
        onClose={() => setOpen(null)}
        settings={settings}
        t={t}
      />
    </section>
  );
}
