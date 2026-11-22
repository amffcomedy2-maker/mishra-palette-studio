import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ImagePlus, Loader2, UploadCloud, X } from "lucide-react";
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
import { CATEGORIES } from "@/lib/site";
import { Field, Panel, goldBtn, inputLux } from "./ui";
import { useAdmin, xhrUpload } from "./admin-context";

export function UploadPhotoTab({
  imgbbCount,
  onGoToApis,
}: {
  imgbbCount: number | undefined;
  onGoToApis: () => void;
}) {
  const { token, logout } = useAdmin();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [stage, setStage] = useState("");

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function reset() {
    setFile(null);
    setTitle("");
    setNote("");
    setProgress(null);
    setStage("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a photo first (pehle photo chunein).");
      return;
    }
    if (!title.trim()) {
      toast.error("Please write the work title.");
      return;
    }
    if (file.size > 32 * 1024 * 1024) {
      toast.error("Photo is bigger than 32 MB.");
      return;
    }
    const form = new FormData();
    form.append("image", file);
    form.append("title", title.trim());
    form.append("category", category);
    if (note.trim()) form.append("note", note.trim());
    setProgress(0);
    setStage("Uploading photo…");
    try {
      const res = await xhrUpload(
        "/api/admin/upload-image",
        form,
        { Authorization: `Bearer ${token}` },
        (p) => {
          setProgress(Math.min(p, 95));
          if (p >= 100) setStage("Saving to ImgBB…");
        },
      );
      const json = (res.json ?? {}) as { error?: string; usedKey?: string; failedKeys?: string[] };
      if (res.status === 401) {
        logout("Session expired — please enter your PIN again.");
        return;
      }
      if (res.status >= 400) throw new Error(json.error || "Upload failed");
      setProgress(100);
      if (json.failedKeys?.length)
        toast.warning(`Primary key failed, used backup "${json.usedKey}".`);
      toast.success("Photo published! Ab yeh website par live hai ✅");
      void qc.invalidateQueries({ queryKey: ["admin", "posts"] });
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setProgress(null);
      setStage("");
    }
  }

  const uploading = progress !== null;

  return (
    <Panel
      title="Upload Photo Work"
      subtitle="Photo goes live on the website instantly"
      icon={<ImagePlus className="size-5" />}
    >
      {imgbbCount === 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-foreground">No ImgBB API key yet</p>
            <p className="text-muted-foreground">
              Add a free ImgBB key in the API Manager before uploading photos.
            </p>
            <button
              type="button"
              onClick={onGoToApis}
              className="mt-2 font-semibold text-gold underline underline-offset-4"
            >
              Open API Manager →
            </button>
          </div>
        </div>
      )}
      <form onSubmit={submit} className="space-y-5">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {preview ? (
          <div className="relative overflow-hidden rounded-2xl border border-border">
            <img
              src={preview}
              alt="Selected work"
              className="max-h-80 w-full object-contain bg-muted"
            />
            {!uploading && (
              <button
                type="button"
                onClick={reset}
                className="chip absolute right-3 top-3 size-9 justify-center p-0"
                aria-label="Remove photo"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="lift flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gold/40 bg-accent/40 px-4 py-10 text-center"
          >
            <span className="icon-tile size-14">
              <UploadCloud className="size-7" />
            </span>
            <span className="font-bold text-foreground">Select image from device</span>
            <span className="text-xs text-muted-foreground">
              JPG, PNG, WEBP · up to 32 MB · original quality kept
            </span>
          </button>
        )}

        <Field label="Work Title / Name *" htmlFor="p-title">
          <Input
            id="p-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Royal Play Living Room – DLF Phase 3"
            className={inputLux}
            maxLength={140}
            required
          />
        </Field>
        <Field label="Category">
          <Select value={category} onValueChange={setCategory}>
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
        <Field label="Short note (optional)" htmlFor="p-note">
          <Textarea
            id="p-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={400}
            className="rounded-xl bg-background/60"
            placeholder="Colour, finish, location…"
          />
        </Field>

        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-foreground">{stage}</span>
              <span className="font-bold text-gold">{progress}%</span>
            </div>
            <Progress value={progress ?? 0} className="h-2.5" />
          </div>
        )}

        <button type="submit" disabled={uploading} className={`${goldBtn} w-full`}>
          {uploading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <UploadCloud className="size-5" />
          )}
          {uploading ? "Uploading…" : "Upload & Publish Live"}
        </button>
      </form>
    </Panel>
  );
}
