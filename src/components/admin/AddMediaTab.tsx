import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Clapperboard, Facebook, Film, Loader2, Rocket, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminCloudinaryTargets, adminCreateMedia } from "@/lib/admin.functions";
import { CATEGORIES, parseFacebookInput, type Category, type Orientation } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Field, Panel, goldBtn, inputLux } from "./ui";
import { reportError, useAdmin, xhrUpload } from "./admin-context";

const ORIENTATIONS: { v: Orientation; label: string }[] = [
  { v: "vertical", label: "Vertical Reel (9:16)" },
  { v: "horizontal", label: "Horizontal Video (16:9)" },
  { v: "square", label: "Post / Square" },
];

const aspect: Record<Orientation, string> = {
  vertical: "aspect-[9/16] max-w-[300px]",
  horizontal: "aspect-video",
  square: "aspect-[4/5] max-w-[420px]",
};

export function AddMediaTab({ cloudinaryCount }: { cloudinaryCount: number | undefined }) {
  const { token, logout } = useAdmin();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"facebook" | "video">("facebook");
  const [fbInput, setFbInput] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>(CATEGORIES[0]);
  const [note, setNote] = useState("");
  const [orientation, setOrientation] = useState<Orientation | "auto">("auto");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fb = useMemo(() => parseFacebookInput(fbInput), [fbInput]);
  const finalOrientation: Orientation =
    orientation === "auto"
      ? mode === "facebook"
        ? (fb?.orientation ?? "vertical")
        : "vertical"
      : orientation;

  async function uploadVideo(file: File) {
    if (!file.type.startsWith("video/")) {
      toast.error("Please choose a video file.");
      return;
    }
    setProgress(0);
    try {
      const targets = await adminCloudinaryTargets({ data: { token } });
      if (!targets.length) throw new Error("No active Cloudinary account. Add one in API Manager.");
      for (const t of targets) {
        const form = new FormData();
        form.append("file", file);
        Object.entries(t.fields).forEach(([k, v]) => form.append(k, v));
        const res = await xhrUpload(
          `https://api.cloudinary.com/v1_1/${encodeURIComponent(t.cloudName)}/video/upload`,
          form,
          {},
          setProgress,
        );
        const json = (res.json ?? {}) as { secure_url?: string; error?: { message?: string } };
        if (res.status < 300 && json.secure_url) {
          setVideoUrl(json.secure_url);
          toast.success(`Video uploaded via "${t.label}". Now press Publish Live.`);
          return;
        }
        toast.warning(`"${t.label}" failed: ${json.error?.message ?? res.status}. Trying next…`);
        setProgress(0);
      }
      throw new Error("Video upload failed on all Cloudinary accounts.");
    } catch (e) {
      reportError(e, logout);
    } finally {
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function publish() {
    if (!title.trim()) {
      toast.error("Please write the work title.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "facebook") {
        if (!fb) throw new Error("Paste a valid Facebook reel/post link or embed code.");
        await adminCreateMedia({
          data: {
            token,
            post: {
              kind: "facebook",
              title: title.trim(),
              category,
              note: note.trim() || undefined,
              embed_url: fb.embedUrl,
              source_url: fb.sourceUrl,
              orientation: finalOrientation,
            },
          },
        });
      } else {
        if (!/^https:\/\//i.test(videoUrl.trim()))
          throw new Error("Upload a video or paste an https:// video link.");
        await adminCreateMedia({
          data: {
            token,
            post: {
              kind: "video",
              title: title.trim(),
              category,
              note: note.trim() || undefined,
              video_url: videoUrl.trim(),
              orientation: finalOrientation,
            },
          },
        });
      }
      toast.success("Published live! Website par dikh raha hai ✅");
      setFbInput("");
      setVideoUrl("");
      setTitle("");
      setNote("");
      setOrientation("auto");
      void qc.invalidateQueries({ queryKey: ["admin", "posts"] });
    } catch (e) {
      reportError(e, logout);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Add Facebook Reel / Post / Video"
      subtitle="Paste a link, preview it, then publish"
      icon={<Clapperboard className="size-5" />}
    >
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1.5">
        {(
          [
            {
              id: "facebook",
              label: "Facebook Reel / Post",
              icon: <Facebook className="size-4" />,
            },
            { id: "video", label: "Direct Video", icon: <Film className="size-4" /> },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            data-active={mode === m.id}
            onClick={() => setMode(m.id)}
            className={cn("chip justify-center rounded-xl", mode !== m.id && "shadow-none")}
          >
            {m.icon}
            <span className="truncate">{m.label}</span>
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {mode === "facebook" ? (
          <Field
            label="Facebook link or <iframe> embed code"
            hint="Works with Reel, Video, Watch, fb.watch and Post links, or the full embed code from Facebook."
          >
            <Textarea
              value={fbInput}
              onChange={(e) => setFbInput(e.target.value)}
              rows={4}
              className="rounded-xl bg-background/60 font-mono text-xs"
              placeholder="https://www.facebook.com/reel/123456789…"
            />
            {fbInput && !fb && (
              <p className="text-xs font-medium text-destructive">
                This doesn't look like a Facebook link or embed code.
              </p>
            )}
          </Field>
        ) : (
          <div className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && void uploadVideo(e.target.files[0])}
            />
            {cloudinaryCount ? (
              <button
                type="button"
                disabled={progress !== null}
                onClick={() => fileRef.current?.click()}
                className="lift flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-gold/40 bg-accent/40 px-4 py-8"
              >
                <span className="icon-tile size-12">
                  <UploadCloud className="size-6" />
                </span>
                <span className="font-bold text-foreground">Upload video from device</span>
                <span className="text-xs text-muted-foreground">
                  Uploads to your connected Cloudinary account
                </span>
              </button>
            ) : (
              <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
                Connect a Cloudinary account in API Manager to upload videos directly. You can still
                paste a hosted video link below.
              </p>
            )}
            {progress !== null && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span>Uploading video…</span>
                  <span className="font-bold text-gold">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2.5" />
              </div>
            )}
            <Field label="Video link (https://)">
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className={inputLux}
                placeholder="https://res.cloudinary.com/…/video.mp4"
              />
            </Field>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Work Title / Name *">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputLux}
              maxLength={140}
              placeholder="e.g. Wall Texture Bedroom"
            />
          </Field>
          <Field label="Category">
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger className={inputLux}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Display shape">
          <Select
            value={orientation}
            onValueChange={(v) => setOrientation(v as Orientation | "auto")}
          >
            <SelectTrigger className={inputLux}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                Auto-detect ({ORIENTATIONS.find((o) => o.v === finalOrientation)?.label})
              </SelectItem>
              {ORIENTATIONS.map((o) => (
                <SelectItem key={o.v} value={o.v}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Short note (optional)">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={400}
            className="rounded-xl bg-background/60"
          />
        </Field>

        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Live preview</p>
          <div className="rounded-2xl border border-border bg-muted/50 p-3">
            {(mode === "facebook" ? fb : videoUrl) ? (
              <div
                className={cn(
                  "relative mx-auto w-full overflow-hidden rounded-xl bg-muted",
                  aspect[finalOrientation],
                )}
              >
                {mode === "facebook" && fb ? (
                  <iframe
                    key={fb.embedUrl}
                    src={fb.embedUrl}
                    title="Preview"
                    className="absolute inset-0 size-full border-0"
                    scrolling="no"
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <video
                    key={videoUrl}
                    src={videoUrl}
                    controls
                    playsInline
                    className="absolute inset-0 size-full object-cover"
                  />
                )}
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Preview will appear here
              </p>
            )}
            {title && (
              <p className="font-serif-lux mt-3 text-center font-semibold text-foreground">
                {title}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={busy || progress !== null}
          onClick={() => void publish()}
          className={`${goldBtn} w-full`}
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <Rocket className="size-5" />}
          Publish Live
        </button>
      </div>
    </Panel>
  );
}
