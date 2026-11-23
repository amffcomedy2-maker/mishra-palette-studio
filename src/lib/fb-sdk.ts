// Browser-only loader for Facebook's JS SDK, used for the Embedded Video Player API
// (end-of-video event, pause, volume). Never import from server code.

export type FbPlayer = {
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  mute: () => void;
  unmute: () => void;
  setVolume: (v: number) => void;
  subscribe: (event: string, cb: () => void) => { release?: () => void } | undefined;
};

type FbReadyMsg = { type: string; id: string; instance: FbPlayer };
type FbSdk = {
  init: (o: Record<string, unknown>) => void;
  XFBML: { parse: (el?: Element) => void };
  Event: { subscribe: (event: string, cb: (m: FbReadyMsg) => void) => void };
};

type FbWindow = Window & { FB?: FbSdk; fbAsyncInit?: () => void };

const readyCbs = new Map<string, (p: FbPlayer) => void>();
let loading: Promise<FbSdk> | null = null;

export function loadFbSdk(): Promise<FbSdk> {
  if (loading) return loading;
  const w = window as FbWindow;
  loading = new Promise<FbSdk>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Facebook player did not load")), 12000);
    const ready = (fb: FbSdk) => {
      clearTimeout(timer);
      fb.Event.subscribe("xfbml.ready", (m) => {
        if (m.type === "video") readyCbs.get(m.id)?.(m.instance);
      });
      resolve(fb);
    };
    w.fbAsyncInit = () => {
      const fb = w.FB;
      if (!fb) return reject(new Error("Facebook player missing"));
      fb.init({ xfbml: false, version: "v21.0" });
      ready(fb);
    };
    const s = document.createElement("script");
    s.src = "https://connect.facebook.net/en_US/sdk.js";
    s.async = true;
    s.defer = true;
    s.crossOrigin = "anonymous";
    s.onerror = () => {
      clearTimeout(timer);
      reject(new Error("Facebook player blocked"));
    };
    document.body.appendChild(s);
  }).catch((e: unknown) => {
    loading = null;
    throw e;
  });
  return loading;
}

/** Registers the callback that receives the player once Facebook renders the element id. */
export function onFbPlayerReady(id: string, cb: (p: FbPlayer) => void): () => void {
  readyCbs.set(id, cb);
  return () => {
    if (readyCbs.get(id) === cb) readyCbs.delete(id);
  };
}
