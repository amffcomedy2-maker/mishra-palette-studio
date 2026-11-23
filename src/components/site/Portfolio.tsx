import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Download,
  Expand,
  Images,
  LayoutGrid,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { WhatsAppIcon } from "./icons";
import { MediaPlayer } from "./MediaPlayer";
import { Reveal } from "./motion";
import { useT } from "@/lib/i18n";
import { downloadBlob, downloadUrl } from "@/lib/download";
import { watermarkedPhoto } from "@/lib/watermark";
import {
  CATEGORIES,
  cloudinaryDownloadUrl,
  DEFAULT_WATERMARK,
  defaultEnquiryMessage,
  safeFileName,
  whatsappLink,
  workEnquiryMessage,
  type Post,
  type SiteSettings,
} from "@/lib/site";
import { cn } from "@/lib/utils";

type Tab = "all" | "photos" | "reels";

const smallBtn = "chip h-9 shrink-0 gap-1.5 px-3 text-xs font-bold disabled:opacity-60";

/** Downloads the photo with the watermark drawn bottom-left. */
function usePhotoDownload(watermark: string, t: (s: string) => string) {
  const [busyId, setBusyId] = useState<string | null>(null);
  async function download(post: Post) {
    if (!post.image_url || busyId) return;
    setBusyId(post.id);
    try {
      const blob = await watermarkedPhoto(post.image_url, watermark || DEFAULT_WATERMARK);
      downloadBlob(blob, `${safeFileName(post.title)}-Mishra-Painters.jpg`);
      toast.success(t("Photo downloaded!"));
    } catch (e) {
      console.error(e);
      toast.error(t("Could not download the photo. Please try again."));
    } finally {
      setBusyId(null);
    }
  }
  return { busyId, download };
}

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
  onDownload,
  downloading,
  t,
}: {
  post: Post;
  onOpen: () => void;
  onDownload: () => void;
  downloading: boolean;
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
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
            {t(post.category)}
          </span>
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            className={smallBtn}
            aria-label={`${t("Download")} ${post.title}`}
          >
            {downloading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            {t("Download")}
          </button>
        </div>
        {post.note && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{t(post.note)}</p>
        )}
      </div>
    </article>
  );
}

function MediaCard({
  post,
  watermark,
  t,
}: {
  post: Post;
  watermark: string;
  t: (s: string) => string;
}) {
  const dl =
    post.kind === "video"
      ? cloudinaryDownloadUrl(post.video_url, watermark, `${post.title}-Mishra-Painters`)
      : null;
  return (
    <article className="lift glass overflow-hidden rounded-2xl">
      <MediaPlayer post={post} t={t} />
      <div className="border-t border-border px-4 py-3.5">
        <h3 className="font-serif-lux text-lg font-semibold leading-snug text-foreground">
          {t(post.title)}
        </h3>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
            {t(post.category)}
          </span>
          {dl && (
            <button
              type="button"
              onClick={() => {
                downloadUrl(dl);
                toast.success(t("Download starting — please wait a few seconds."));
              }}
              className={smallBtn}
              aria-label={`${t("Download")} ${post.title}`}
            >
              <Download className="size-3.5" />
              {t("Download")}
            </button>
          )}
        </div>
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
  onDownload,
  downloadingId,
  t,
}: {
  photos: Post[];
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
  settings: SiteSettings;
  onDownload: (p: Post) => void;
  downloadingId: string | null;
  t: (s: string) => string;
}) {
  const post = index !== null ? photos[index] : undefined;
  // Prepare the watermarked file while the photo is open so Download is instant.
  useEffect(() => {
    if (post?.image_url)
      void watermarkedPhoto(post.image_url, settings.watermark_text || DEFAULT_WATERMARK).catch(
        () => {},
      );
  }, [post?.image_url, settings.watermark_text]);
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
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <a
                    href={whatsappLink(
                      settings.whatsapp_number,
                      workEnquiryMessage(settings.proprietor_name, post.title),
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-3d btn-whatsapp inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 font-bold"
                  >
                    <WhatsAppIcon className="size-5" />
                    {t("Ask About This Work on WhatsApp")}
                  </a>
                  <button
                    type="button"
                    onClick={() => onDownload(post)}
                    disabled={downloadingId === post.id}
                    className="btn-3d btn-glass inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 font-bold"
                  >
                    {downloadingId === post.id ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <Download className="size-5 text-gold" />
                    )}
                    {t("Download Photo")}
                  </button>
                </div>
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
  const photoDl = usePhotoDownload(settings.watermark_text, t);

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
                    <PhotoCard
                      post={p}
                      t={t}
                      onOpen={() => setOpen(i)}
                      onDownload={() => void photoDl.download(p)}
                      downloading={photoDl.busyId === p.id}
                    />
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
                      <MediaCard post={p} watermark={settings.watermark_text} t={t} />
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
        onDownload={(p) => void photoDl.download(p)}
        downloadingId={photoDl.busyId}
        t={t}
      />
    </section>
  );
}
