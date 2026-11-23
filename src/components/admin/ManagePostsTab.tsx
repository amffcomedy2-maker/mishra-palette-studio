import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clapperboard,
  Eye,
  EyeOff,
  Film,
  Images,
  ListChecks,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminDeletePost, adminListPosts, adminUpdatePost } from "@/lib/admin.functions";
import {
  CATEGORIES,
  facebookVideoHref,
  type Category,
  type Orientation,
  type Post,
} from "@/lib/site";
import { InlineVolume } from "./VolumeControl";
import { Field, Panel, glassBtn, goldBtn, inputLux } from "./ui";
import { reportError, useAdmin } from "./admin-context";

type Filter = "all" | "photo" | "facebook" | "video";

export function ManagePostsTab() {
  const { token, logout } = useAdmin();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState<Post | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin", "posts"],
    queryFn: () => adminListPosts({ data: { token } }),
  });
  useEffect(() => {
    if (q.error) reportError(q.error, logout);
  }, [q.error, logout]);
  const posts = (q.data ?? []).filter((p) => filter === "all" || p.kind === filter);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "posts"] });

  async function toggleVisible(p: Post, v: boolean) {
    setSavingId(p.id);
    try {
      await adminUpdatePost({ data: { token, id: p.id, patch: { is_visible: v } } });
      toast.success(v ? "Now visible on website" : "Hidden from website");
      await refresh();
    } catch (e) {
      reportError(e, logout);
    } finally {
      setSavingId(null);
    }
  }

  async function saveVolume(p: Post, volume: number) {
    setSavingId(p.id);
    try {
      await adminUpdatePost({ data: { token, id: p.id, patch: { volume } } });
      toast.success(volume === 0 ? "Muted on website" : `Volume set to ${volume}%`);
      await refresh();
    } catch (e) {
      reportError(e, logout);
    } finally {
      setSavingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await adminDeletePost({ data: { token, id: deleting.id } });
      toast.success("Post deleted permanently");
      setDeleting(null);
      await refresh();
    } catch (e) {
      reportError(e, logout);
    }
  }

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: `All (${q.data?.length ?? 0})` },
    { id: "photo", label: "Photos" },
    { id: "facebook", label: "Facebook" },
    { id: "video", label: "Videos" },
  ];

  return (
    <Panel
      title="Manage Live Posts"
      subtitle="Edit, hide or delete — changes show instantly"
      icon={<ListChecks className="size-5" />}
    >
      <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            data-active={filter === f.id}
            onClick={() => setFilter(f.id)}
            className="chip px-3 py-1.5 text-xs"
          >
            {f.label}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-gold h-20 rounded-2xl" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="rounded-2xl bg-muted p-8 text-center text-sm text-muted-foreground">
          No posts here yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 p-3"
            >
              {p.kind === "photo" && p.image_url ? (
                <img
                  src={p.image_url}
                  alt=""
                  className="size-16 shrink-0 rounded-xl object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="icon-tile size-16 shrink-0 rotate-0 rounded-xl">
                  {p.kind === "facebook" ? (
                    <Clapperboard className="size-6" />
                  ) : (
                    <Film className="size-6" />
                  )}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{p.title}</p>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                  <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">
                    {p.category}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                    {p.kind === "photo" ? "Photo" : p.kind === "facebook" ? "Facebook" : "Video"}
                  </span>
                  {!p.is_visible && (
                    <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-destructive">
                      Hidden
                    </span>
                  )}
                </div>
                {(p.kind === "video" || facebookVideoHref(p.embed_url)) && (
                  <InlineVolume
                    value={p.volume ?? 100}
                    saving={savingId === p.id}
                    onSave={(v) => void saveVolume(p, v)}
                  />
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {savingId === p.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : p.is_visible ? (
                    <Eye className="size-3.5" />
                  ) : (
                    <EyeOff className="size-3.5" />
                  )}
                  <Switch
                    checked={p.is_visible}
                    onCheckedChange={(v) => void toggleVisible(p, v)}
                    aria-label="Show on website"
                  />
                </label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className={`${glassBtn} size-9 px-0`}
                    onClick={() => setEditing(p)}
                    aria-label="Edit"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    className={`${glassBtn} size-9 px-0 text-destructive`}
                    onClick={() => setDeleting(p)}
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && <EditDialog post={editing} onClose={() => setEditing(null)} onSaved={refresh} />}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="glass">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.title}" will be removed from the website permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  );
}

function EditDialog({
  post,
  onClose,
  onSaved,
}: {
  post: Post;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  const { token, logout } = useAdmin();
  const [title, setTitle] = useState(post.title);
  const [category, setCategory] = useState<Category>(
    (CATEGORIES as readonly string[]).includes(post.category)
      ? (post.category as Category)
      : CATEGORIES[0],
  );
  const [note, setNote] = useState(post.note ?? "");
  const [orientation, setOrientation] = useState<Orientation>(post.orientation);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim()) {
      toast.error("Title can't be empty");
      return;
    }
    setBusy(true);
    try {
      await adminUpdatePost({
        data: {
          token,
          id: post.id,
          patch: { title: title.trim(), category, note: note.trim() || null, orientation },
        },
      });
      toast.success("Post updated ✅");
      await onSaved();
      onClose();
    } catch (e) {
      reportError(e, logout);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Work Title / Name">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputLux}
              maxLength={140}
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
          {post.kind !== "photo" && (
            <Field label="Display shape">
              <Select value={orientation} onValueChange={(v) => setOrientation(v as Orientation)}>
                <SelectTrigger className={inputLux}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vertical">Vertical Reel (9:16)</SelectItem>
                  <SelectItem value="horizontal">Horizontal Video (16:9)</SelectItem>
                  <SelectItem value="square">Post / Square</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Short note">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={400}
              className="rounded-xl bg-background/60"
            />
          </Field>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className={`${goldBtn} w-full`}
          >
            {busy && <Loader2 className="size-5 animate-spin" />}
            Save changes
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
