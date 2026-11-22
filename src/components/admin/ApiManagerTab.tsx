import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  KeyRound,
  Languages,
  Loader2,
  Pencil,
  Plug,
  Plus,
  Star,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  adminDeleteIntegration,
  adminListIntegrations,
  adminPatchIntegration,
  adminSaveIntegration,
  adminTestIntegration,
  type AdminIntegration,
} from "@/lib/admin.functions";
import { SERVICE_LABELS, type ServiceType } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Field, Panel, glassBtn, goldBtn, inputLux } from "./ui";
import { reportError, useAdmin } from "./admin-context";

const SERVICES: ServiceType[] = ["imgbb", "cloudinary", "gemini", "custom"];
const SERVICE_HELP: Record<ServiceType, string> = {
  imgbb:
    "Free image hosting for work photos. Get a key at api.imgbb.com. Add several keys — if one fails, the next one is used automatically.",
  cloudinary:
    "Video (and image) hosting. Use Cloud Name + an unsigned Upload Preset, or Cloud Name + API Key + API Secret.",
  gemini:
    "Powers the website language switch. Get a free key at aistudio.google.com. Add several keys for automatic backup.",
  custom:
    "Any HTTPS endpoint. It receives a JSON POST whenever you publish new work (great for automations).",
};

type FormState = {
  label: string;
  service: ServiceType;
  is_active: boolean;
  is_default: boolean;
  priority: number;
  api_key: string;
  api_secret: string;
  cloud_name: string;
  upload_preset: string;
  endpoint_url: string;
  model: string;
};

const emptyForm = (service: ServiceType = "imgbb"): FormState => ({
  label: "",
  service,
  is_active: true,
  is_default: false,
  priority: 1,
  api_key: "",
  api_secret: "",
  cloud_name: "",
  upload_preset: "",
  endpoint_url: "",
  model: service === "gemini" ? "gemini-2.5-flash" : "",
});

export function ApiManagerTab() {
  const { token, logout } = useAdmin();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "integrations"],
    queryFn: () => adminListIntegrations({ data: { token } }),
  });
  useEffect(() => {
    if (q.error) reportError(q.error, logout);
  }, [q.error, logout]);
  const [editing, setEditing] = useState<{
    id?: string;
    form: FormState;
    existing?: AdminIntegration;
  } | null>(null);
  const [deleting, setDeleting] = useState<AdminIntegration | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "integrations"] });
    void qc.invalidateQueries({ queryKey: ["admin", "overview"] });
  };

  async function patch(
    it: AdminIntegration,
    p: { is_active?: boolean; is_default?: boolean; priority?: number },
  ) {
    try {
      await adminPatchIntegration({ data: { token, id: it.id, patch: p } });
      refresh();
    } catch (e) {
      reportError(e, logout);
    }
  }

  async function test(it: AdminIntegration) {
    setTesting(it.id);
    try {
      const r = await adminTestIntegration({ data: { token, id: it.id } });
      if (r.ok) toast.success(r.message);
      else toast.error(`Test failed: ${r.message}`);
      refresh();
    } catch (e) {
      reportError(e, logout);
    } finally {
      setTesting(null);
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await adminDeleteIntegration({ data: { token, id: deleting.id } });
      toast.success("API removed");
      setDeleting(null);
      refresh();
    } catch (e) {
      reportError(e, logout);
    }
  }

  const list = q.data ?? [];

  return (
    <div className="space-y-6">
      <section className="glass relative overflow-hidden rounded-3xl p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="icon-tile size-12 shrink-0">
            <Languages className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-foreground">
              Google Gemini — Website Translation
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Visitors can switch the website language. Add one or more Gemini API keys; they are
              tried in priority order. Until a key is added, a built-in backup translator is used.
            </p>
            <p className="mt-2 text-xs font-semibold text-gold">
              {list.filter((i) => i.service === "gemini" && i.is_active).length} active Gemini
              key(s)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            setEditing({
              form: {
                ...emptyForm("gemini"),
                label: `Gemini Key ${list.filter((i) => i.service === "gemini").length + 1}`,
              },
            })
          }
          className={`${glassBtn} mt-4`}
        >
          <Plus className="size-4" /> Add Gemini API key
        </button>
      </section>

      <Panel
        title="API Integrations Manager"
        subtitle="Add, test, switch on/off and set priority — no coding"
        icon={<Plug className="size-5" />}
      >
        <button
          type="button"
          onClick={() => setEditing({ form: emptyForm() })}
          className={`${goldBtn} mb-5 w-full sm:w-auto`}
        >
          <Plus className="size-5" /> Add New API
        </button>

        {q.isLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="skeleton-gold h-28 rounded-2xl" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <p className="rounded-2xl bg-muted p-8 text-center text-sm text-muted-foreground">
            No APIs added yet. Start with an ImgBB key for photo uploads.
          </p>
        ) : (
          <div className="space-y-6">
            {SERVICES.filter((s) => list.some((i) => i.service === s)).map((s) => (
              <div key={s}>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gold">
                  {SERVICE_LABELS[s]}
                </h4>
                <ul className="space-y-3">
                  {list
                    .filter((i) => i.service === s)
                    .map((it) => (
                      <li
                        key={it.id}
                        className={cn(
                          "rounded-2xl border border-border bg-card/60 p-4",
                          !it.is_active && "opacity-70",
                        )}
                      >
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-2 font-semibold text-foreground">
                              {it.label}
                              {it.is_default && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-accent-foreground">
                                  <Star className="size-3" /> Default
                                </span>
                              )}
                            </p>
                            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                              {it.service === "cloudinary"
                                ? `${it.config.cloud_name}${it.config.upload_preset ? ` · preset ${it.config.upload_preset}` : ""}${it.config.api_key_masked ? ` · key ${it.config.api_key_masked}` : ""}`
                                : it.service === "custom"
                                  ? it.config.endpoint_url
                                  : `key ${it.config.api_key_masked}${it.config.model ? ` · ${it.config.model}` : ""}`}
                            </p>
                            {it.last_tested_at && (
                              <p
                                className={cn(
                                  "mt-1.5 flex items-center gap-1 text-xs font-medium",
                                  it.last_test_ok ? "text-success" : "text-destructive",
                                )}
                              >
                                {it.last_test_ok ? (
                                  <CheckCircle2 className="size-3.5" />
                                ) : (
                                  <XCircle className="size-3.5" />
                                )}
                                {it.last_test_message}
                              </p>
                            )}
                          </div>
                          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                            {it.is_active ? "Active" : "Inactive"}
                            <Switch
                              checked={it.is_active}
                              onCheckedChange={(v) => void patch(it, { is_active: v })}
                            />
                          </label>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            Priority
                            <Input
                              type="number"
                              min={1}
                              max={99}
                              defaultValue={it.priority}
                              className="h-9 w-16 rounded-lg bg-background/60 text-center"
                              onBlur={(e) => {
                                const v = Math.max(1, Math.min(99, Number(e.target.value) || 1));
                                if (v !== it.priority) void patch(it, { priority: v });
                              }}
                            />
                          </label>
                          {!it.is_default && (
                            <button
                              type="button"
                              className={glassBtn}
                              onClick={() => void patch(it, { is_default: true })}
                            >
                              <Star className="size-4" /> Make default
                            </button>
                          )}
                          <button
                            type="button"
                            className={glassBtn}
                            disabled={testing === it.id}
                            onClick={() => void test(it)}
                          >
                            {testing === it.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Zap className="size-4 text-gold" />
                            )}{" "}
                            Test Connection
                          </button>
                          <button
                            type="button"
                            className={`${glassBtn} size-10 px-0`}
                            aria-label="Edit"
                            onClick={() =>
                              setEditing({
                                id: it.id,
                                existing: it,
                                form: {
                                  ...emptyForm(it.service),
                                  label: it.label,
                                  is_active: it.is_active,
                                  is_default: it.is_default,
                                  priority: it.priority,
                                  cloud_name: it.config.cloud_name,
                                  upload_preset: it.config.upload_preset,
                                  endpoint_url: it.config.endpoint_url,
                                  model: it.config.model,
                                },
                              })
                            }
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            className={`${glassBtn} size-10 px-0 text-destructive`}
                            aria-label="Delete"
                            onClick={() => setDeleting(it)}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {editing && (
        <IntegrationDialog state={editing} onClose={() => setEditing(null)} onSaved={refresh} />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="glass">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleting?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This API connection will be removed. Uploads will use your other active APIs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void remove()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function IntegrationDialog({
  state,
  onClose,
  onSaved,
}: {
  state: { id?: string; form: FormState; existing?: AdminIntegration };
  onClose: () => void;
  onSaved: () => void;
}) {
  const { token, logout } = useAdmin();
  const [f, setF] = useState<FormState>(state.form);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((x) => ({ ...x, [k]: v }));
  const keyHint = state.existing?.config.api_key_masked
    ? `Saved: ${state.existing.config.api_key_masked} — leave empty to keep it`
    : undefined;
  const secretHint = state.existing?.config.api_secret_masked
    ? `Saved: ${state.existing.config.api_secret_masked} — leave empty to keep it`
    : undefined;

  async function save() {
    if (!f.label.trim()) {
      toast.error("Please give this API a label");
      return;
    }
    setBusy(true);
    try {
      await adminSaveIntegration({
        data: {
          token,
          ...(state.id ? { id: state.id } : {}),
          item: {
            label: f.label.trim(),
            service: f.service,
            is_active: f.is_active,
            is_default: f.is_default,
            priority: f.priority,
            config: {
              api_key: f.api_key,
              ...(f.service === "cloudinary"
                ? {
                    api_secret: f.api_secret,
                    cloud_name: f.cloud_name,
                    upload_preset: f.upload_preset,
                  }
                : {}),
              ...(f.service === "custom" ? { endpoint_url: f.endpoint_url } : {}),
              ...(f.service === "gemini" ? { model: f.model || "gemini-2.5-flash" } : {}),
            },
          },
        },
      });
      toast.success(
        state.id ? "API updated ✅" : "API added ✅ — press Test Connection to check it",
      );
      onSaved();
      onClose();
    } catch (e) {
      reportError(e, logout);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-gold" /> {state.id ? "Edit API" : "Add New API"}
          </DialogTitle>
          <DialogDescription>{SERVICE_HELP[f.service]}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Service type">
            <Select
              value={f.service}
              onValueChange={(v) =>
                setF((x) => ({
                  ...x,
                  service: v as ServiceType,
                  model: v === "gemini" ? x.model || "gemini-2.5-flash" : x.model,
                }))
              }
              disabled={!!state.id}
            >
              <SelectTrigger className={inputLux}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SERVICE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Custom label">
            <Input
              value={f.label}
              onChange={(e) => set("label", e.target.value)}
              className={inputLux}
              placeholder="e.g. ImgBB Account 1"
              maxLength={80}
            />
          </Field>

          {f.service === "cloudinary" && (
            <>
              <Field label="Cloud name *">
                <Input
                  value={f.cloud_name}
                  onChange={(e) => set("cloud_name", e.target.value)}
                  className={inputLux}
                  autoComplete="off"
                />
              </Field>
              <Field
                label="Upload preset (unsigned)"
                hint="Recommended. Create one in Cloudinary → Settings → Upload → Upload presets (mode: Unsigned)."
              >
                <Input
                  value={f.upload_preset}
                  onChange={(e) => set("upload_preset", e.target.value)}
                  className={inputLux}
                  autoComplete="off"
                />
              </Field>
            </>
          )}
          {f.service === "custom" && (
            <Field label="Endpoint URL *">
              <Input
                value={f.endpoint_url}
                onChange={(e) => set("endpoint_url", e.target.value)}
                className={inputLux}
                placeholder="https://example.com/webhook"
              />
            </Field>
          )}
          <Field
            label={
              f.service === "custom"
                ? "Bearer token (optional)"
                : f.service === "cloudinary"
                  ? "API Key (optional)"
                  : "API Key *"
            }
            hint={keyHint}
          >
            <Input
              type="password"
              value={f.api_key}
              onChange={(e) => set("api_key", e.target.value)}
              className={inputLux}
              autoComplete="new-password"
            />
          </Field>
          {f.service === "cloudinary" && (
            <Field
              label="API Secret (optional)"
              hint={secretHint ?? "Only needed for signed uploads."}
            >
              <Input
                type="password"
                value={f.api_secret}
                onChange={(e) => set("api_secret", e.target.value)}
                className={inputLux}
                autoComplete="new-password"
              />
            </Field>
          )}
          {f.service === "gemini" && (
            <Field label="Model" hint="Default: gemini-2.5-flash">
              <Input
                value={f.model}
                onChange={(e) => set("model", e.target.value)}
                className={inputLux}
              />
            </Field>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Field label="Priority">
              <Input
                type="number"
                min={1}
                max={99}
                value={f.priority}
                onChange={(e) =>
                  set("priority", Math.max(1, Math.min(99, Number(e.target.value) || 1)))
                }
                className={inputLux}
              />
            </Field>
            <Field label="Active">
              <div className="flex h-11 items-center">
                <Switch checked={f.is_active} onCheckedChange={(v) => set("is_active", v)} />
              </div>
            </Field>
            <Field label="Default">
              <div className="flex h-11 items-center">
                <Switch checked={f.is_default} onCheckedChange={(v) => set("is_default", v)} />
              </div>
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Order used: Default first, then lowest priority number. Keys are stored privately and
            never shown on the website.
          </p>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className={`${goldBtn} w-full`}
          >
            {busy && <Loader2 className="size-5 animate-spin" />} Save API
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
