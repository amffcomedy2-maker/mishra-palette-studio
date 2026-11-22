import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImageUp, Loader2, RefreshCcw, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { adminClearCardImage } from "@/lib/admin.functions";
import { Panel, goldBtn } from "./ui";
import { reportError, useAdmin, xhrUpload } from "./admin-context";

/** Lets the admin upload a ready-made visiting card picture that replaces the designed card. */
export function ReplaceCardPanel({ currentUrl }: { currentUrl: string | null }) {
  const { token, logout } = useAdmin();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose a picture (JPG or PNG).");
      return;
    }
    if (f.size > 32 * 1024 * 1024) {
      toast.error("Picture is bigger than 32 MB.");
      return;
    }
    setFile(f);
  }

  async function replace() {
    if (!file) return;
    const form = new FormData();
    form.append("image", file);
    setProgress(0);
    try {
      const res = await xhrUpload(
        "/api/admin/upload-card",
        form,
        { Authorization: `Bearer ${token}` },
        (p) => setProgress(Math.min(p, 95)),
      );
      const json = (res.json ?? {}) as { error?: string; usedKey?: string; failedKeys?: string[] };
      if (res.status === 401) {
        logout("Session expired — please enter your PIN again.");
        return;
      }
      if (res.status >= 400) throw new Error(json.error || "Upload failed");
      setProgress(100);
      if (json.failedKeys?.length) toast.warning(`Primary key failed, used backup "${json.usedKey}".`);
      toast.success("New visiting card is live on the website ✅");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await qc.invalidateQueries({ queryKey: ["public-data"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setProgress(null);
    }
  }

  async function restore() {
    setRestoring(true);
    try {
      await adminClearCardImage({ data: { token } });
      toast.success("Designed visiting card is back on the website ✅");
      await qc.invalidateQueries({ queryKey: ["public-data"] });
    } catch (e) {
      reportError(e, logout);
    } finally {
      setRestoring(false);
    }
  }

  const uploading = progress !== null;
  const shown = preview ?? currentUrl;

  return (
    <Panel
      title="Replace Visiting Card"
      subtitle="Upload your own card picture — visitors will see and download it"
      icon={<ImageUp className="size-5" />}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {currentUrl
            ? "Your uploaded card is live right now."
            : "The designed card is live right now."}
        </p>
        {shown ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-muted/50 p-2">
            <img
              src={shown}
              alt={preview ? "New visiting card preview" : "Current visiting card"}
              className="mx-auto max-h-80 w-auto rounded-xl object-contain"
            />
            <p className="mt-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              {preview ? "New card — not live yet" : "Live now"}
            </p>
          </div>
        ) : null}

        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="lift flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-gold/40 bg-accent/40 px-4 py-6"
        >
          <span className="icon-tile size-11">
            <ImageUp className="size-5" />
          </span>
          <span className="font-bold text-foreground">
            {file ? file.name : "Choose new visiting card picture"}
          </span>
          <span className="text-xs text-muted-foreground">JPG or PNG, up to 32 MB</span>
        </button>

        {uploading && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span>Uploading card…</span>
              <span className="font-bold text-gold">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2.5" />
          </div>
        )}

        <button
          type="button"
          disabled={!file || uploading}
          onClick={() => void replace()}
          className={`${goldBtn} w-full`}
        >
          {uploading ? <Loader2 className="size-5 animate-spin" /> : <RefreshCcw className="size-5" />}
          Replace Visiting Card
        </button>

        {currentUrl && !file && (
          <button
            type="button"
            disabled={restoring}
            onClick={() => void restore()}
            className="chip w-full justify-center py-3"
          >
            {restoring ? <Loader2 className="size-4 animate-spin" /> : <Undo2 className="size-4 text-gold" />}
            Use the designed card again
          </button>
        )}
      </div>
    </Panel>
  );
}
