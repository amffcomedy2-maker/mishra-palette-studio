import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize, Minimize, RotateCcw } from "lucide-react";
import { claimPlayback, registerPlayer } from "@/lib/media-bus";
import { loadFbSdk, onFbPlayerReady, type FbPlayer } from "@/lib/fb-sdk";
import { cloudinaryPoster, facebookVideoHref, volumeFraction, type Post } from "@/lib/site";
import { cn } from "@/lib/utils";

const aspect: Record<Post["orientation"], string> = {
  vertical: "aspect-[9/16]",
  horizontal: "aspect-video",
  square: "aspect-[4/5]",
};

type FsElement = HTMLElement & { webkitRequestFullscreen?: () => void };
type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};
type IosVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

/** Real fullscreen where supported; iPhone videos use the native player; otherwise fills the window. */
function useFullscreen() {
  const ref = useRef<HTMLDivElement>(null);
  const [real, setReal] = useState(false);
  const [pseudo, setPseudo] = useState(false);

  useEffect(() => {
    const d = document as FsDocument;
    const on = () =>
      setReal(
        !!ref.current &&
          (d.fullscreenElement === ref.current || d.webkitFullscreenElement === ref.current),
      );
    document.addEventListener("fullscreenchange", on);
    document.addEventListener("webkitfullscreenchange", on);
    return () => {
      document.removeEventListener("fullscreenchange", on);
      document.removeEventListener("webkitfullscreenchange", on);
    };
  }, []);

  useEffect(() => {
    if (!pseudo) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPseudo(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [pseudo]);

  const toggle = useCallback(
    async (video?: HTMLVideoElement | null) => {
      if (pseudo) return setPseudo(false);
      const d = document as FsDocument;
      if (d.fullscreenElement || d.webkitFullscreenElement) {
        if (d.exitFullscreen) await d.exitFullscreen().catch(() => {});
        else d.webkitExitFullscreen?.();
        return;
      }
      const el = ref.current as FsElement | null;
      if (!el) return;
      try {
        if (el.requestFullscreen) return await el.requestFullscreen();
        if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
      } catch {
        /* fall through */
      }
      const iv = video as IosVideo | null | undefined;
      if (iv?.webkitEnterFullscreen) return iv.webkitEnterFullscreen();
      setPseudo(true);
    },
    [pseudo],
  );

  return { ref, active: real || pseudo, pseudo, toggle };
}

function FullscreenButton({
  active,
  onClick,
  below,
  t,
}: {
  active: boolean;
  onClick: () => void;
  /** Sits under Facebook's own Share button. */
  below: boolean;
  t: (s: string) => string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "chip absolute right-2 z-10 size-9 justify-center p-0",
        below ? "top-16" : "top-2",
      )}
      aria-label={active ? t("Exit full screen") : t("Full screen")}
      title={active ? t("Exit full screen") : t("Full screen")}
    >
      {active ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
    </button>
  );
}

function NativeVideo({
  post,
  onVideo,
}: {
  post: Post;
  onVideo: (v: HTMLVideoElement | null) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const id = `v-${post.id}`;

  useEffect(() => {
    const v = ref.current;
    onVideo(v);
    if (!v) return;
    return registerPlayer(id, () => v.pause());
  }, [id, onVideo]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const vol = volumeFraction(post.volume);
    v.volume = vol;
    v.muted = vol === 0;
  }, [post.volume]);

  return (
    <video
      ref={ref}
      src={post.video_url ?? undefined}
      poster={post.video_url ? cloudinaryPoster(post.video_url) : undefined}
      controls
      playsInline
      preload="metadata"
      controlsList="nodownload"
      onPlay={() => claimPlayback(id)}
      className="absolute inset-0 size-full object-cover group-data-[fs=true]/player:object-contain"
    />
  );
}

/** Facebook reel/video through Facebook's player SDK so we can cover the "up next" screen. */
function FacebookVideo({ post, href, t }: { post: Post; href: string; t: (s: string) => string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<FbPlayer | null>(null);
  const [mode, setMode] = useState<"sdk" | "iframe">("sdk");
  const [ended, setEnded] = useState(false);
  const id = `fbv-${post.id}`;
  const vol = volumeFraction(post.volume);
  const volRef = useRef(vol);
  volRef.current = vol;

  const applyVolume = useCallback((p: FbPlayer) => {
    try {
      if (volRef.current === 0) p.mute();
      else {
        p.unmute();
        p.setVolume(volRef.current);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (playerRef.current) applyVolume(playerRef.current);
  }, [vol, applyVolume]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || mode !== "sdk") return;
    let cancelled = false;
    const subs: Array<{ release?: () => void } | undefined> = [];
    let unregister = () => {};
    const offReady = onFbPlayerReady(id, (p) => {
      if (cancelled) return;
      playerRef.current = p;
      applyVolume(p);
      unregister = registerPlayer(id, () => p.pause());
      subs.push(
        p.subscribe("startedPlaying", () => {
          setEnded(false);
          applyVolume(p);
          claimPlayback(id);
        }),
        p.subscribe("finishedPlaying", () => {
          setEnded(true);
          try {
            p.pause();
          } catch {
            /* ignore */
          }
        }),
      );
    });

    host.innerHTML = "";
    const el = document.createElement("div");
    el.className = "fb-video";
    el.id = id;
    el.setAttribute("data-href", href);
    el.setAttribute("data-width", String(Math.max(220, Math.round(host.clientWidth || 320))));
    el.setAttribute("data-show-text", "false");
    el.setAttribute("data-allowfullscreen", "true");
    el.setAttribute("data-autoplay", "false");
    host.appendChild(el);

    loadFbSdk()
      .then((fb) => {
        if (!cancelled) fb.XFBML.parse(host);
      })
      .catch(() => {
        if (!cancelled) setMode("iframe");
      });

    return () => {
      cancelled = true;
      offReady();
      unregister();
      subs.forEach((s) => s?.release?.());
      playerRef.current = null;
      host.innerHTML = "";
    };
  }, [id, href, mode, applyVolume]);

  function replay() {
    const p = playerRef.current;
    setEnded(false);
    if (!p) return;
    try {
      p.seek(0);
      p.play();
    } catch {
      /* ignore */
    }
  }

  if (mode === "iframe" && post.embed_url) {
    return (
      <iframe
        src={post.embed_url}
        title={post.title}
        loading="lazy"
        className="absolute inset-0 size-full border-0"
        scrolling="no"
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"
        allowFullScreen
      />
    );
  }

  return (
    <>
      <div ref={hostRef} className="fb-host absolute inset-0" />
      {ended && (
        <div className="overlay-scrim absolute inset-0 z-[5] flex flex-col items-center justify-center gap-3 p-4 text-center animate-in fade-in">
          <p className="font-serif-lux text-lg font-semibold text-foreground">{t(post.title)}</p>
          <button
            type="button"
            onClick={replay}
            className="btn-3d btn-gold inline-flex h-12 items-center gap-2 rounded-2xl px-6 font-bold"
          >
            <RotateCcw className="size-5" />
            {t("Watch again")}
          </button>
        </div>
      )}
    </>
  );
}

/** Reel / video player with full screen, single-playback and admin volume. */
export function MediaPlayer({ post, t }: { post: Post; t: (s: string) => string }) {
  const fs = useFullscreen();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const setVideo = useCallback((v: HTMLVideoElement | null) => {
    videoRef.current = v;
  }, []);
  const fbHref = post.kind === "facebook" ? facebookVideoHref(post.embed_url) : null;
  const playable = post.kind === "video" ? !!post.video_url : !!fbHref;

  return (
    <div
      ref={fs.ref}
      data-fs={fs.active}
      data-pseudo-fs={fs.pseudo}
      className={cn(
        "group/player relative w-full overflow-hidden bg-muted",
        fs.pseudo ? "fixed inset-0 z-[80] bg-background" : aspect[post.orientation],
      )}
    >
      {post.kind === "video" && post.video_url ? (
        <NativeVideo post={post} onVideo={setVideo} />
      ) : fbHref ? (
        <FacebookVideo post={post} href={fbHref} t={t} />
      ) : post.embed_url ? (
        <iframe
          src={post.embed_url}
          title={post.title}
          loading="lazy"
          className="absolute inset-0 size-full border-0"
          scrolling="no"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"
          allowFullScreen
        />
      ) : null}
      {playable && (
        <FullscreenButton
          active={fs.active}
          onClick={() => void fs.toggle(videoRef.current)}
          below={!!fbHref}
          t={t}
        />
      )}
    </div>
  );
}
