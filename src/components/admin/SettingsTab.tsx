import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { IdCard, KeyRound, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VisitingCard } from "@/components/site/VisitingCard";
import { adminChangePin, adminSaveSettings } from "@/lib/admin.functions";
import { getPublicData } from "@/lib/public.functions";
import type { SiteSettings } from "@/lib/site";
import { Field, Panel, goldBtn, inputLux } from "./ui";
import { ReplaceCardPanel } from "./ReplaceCardPanel";
import { reportError, useAdmin } from "./admin-context";

const FIELDS: { key: keyof SiteSettings; label: string; hint?: string; long?: boolean }[] = [
  {
    key: "devotional_header",
    label: "Devotional header",
    hint: "Shown as ॥ … ॥ at the top of the card",
  },
  { key: "business_name", label: "Business name" },
  { key: "proprietor_name", label: "Proprietor name", hint: "Shown as “Pro. …”" },
  { key: "experience_text", label: "Experience text", hint: "e.g. 20+ Years of Experience" },
  { key: "services_text", label: "Services / works text", long: true },
  { key: "call_number", label: "Calling number" },
  { key: "whatsapp_number", label: "WhatsApp number" },
  { key: "address", label: "Address" },
  {
    key: "watermark_text",
    label: "Download watermark",
    hint: "Printed bottom-left on photos and videos visitors download, e.g. painter.rf.gd",
  },
];

export function SettingsTab() {
  const { token, setToken, logout } = useAdmin();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery({ queryKey: ["public-data"], queryFn: () => getPublicData() });
  const [s, setS] = useState<SiteSettings>(data.settings);
  const [busy, setBusy] = useState(false);
  const [pins, setPins] = useState({ current: "", next: "", confirm: "" });
  const [pinBusy, setPinBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await adminSaveSettings({ data: { token, settings: s } });
      toast.success("Visiting card updated! Website par turant live ✅");
      void qc.invalidateQueries({ queryKey: ["public-data"] });
    } catch (err) {
      reportError(err, logout);
    } finally {
      setBusy(false);
    }
  }

  async function changePin(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(pins.next)) {
      toast.error("New PIN must be 4 to 8 digits.");
      return;
    }
    if (pins.next !== pins.confirm) {
      toast.error("New PIN and confirm PIN do not match.");
      return;
    }
    setPinBusy(true);
    try {
      const res = await adminChangePin({
        data: { token, currentPin: pins.current, newPin: pins.next },
      });
      setToken(res.token);
      setPins({ current: "", next: "", confirm: "" });
      toast.success("PIN changed ✅ Please remember your new PIN.");
    } catch (err) {
      reportError(err, logout);
    } finally {
      setPinBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <ReplaceCardPanel currentUrl={data.cardImageUrl} />
      <Panel
        title="Visiting Card & Site Settings"
        subtitle={
          data.cardImageUrl
            ? "These details are used for Save Contact and WhatsApp. The designed card shows again if you remove the uploaded one."
            : "Changes update the live card and the downloadable PNG"
        }
        icon={<IdCard className="size-5" />}
      >
        <div className="mb-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gold">
            Live preview
          </p>
          <div className="pointer-events-none origin-top scale-[0.92]">
            <VisitingCard settings={s} t={(x) => x} />
          </div>
        </div>
        <form onSubmit={save} className="space-y-4">
          {FIELDS.map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint}>
              {f.long ? (
                <Textarea
                  value={s[f.key]}
                  onChange={(e) => setS({ ...s, [f.key]: e.target.value })}
                  rows={4}
                  maxLength={600}
                  className="font-hindi rounded-xl bg-background/60"
                />
              ) : (
                <Input
                  value={s[f.key]}
                  onChange={(e) => setS({ ...s, [f.key]: e.target.value })}
                  className={inputLux}
                  inputMode={f.key.endsWith("number") ? "tel" : undefined}
                  maxLength={f.key === "address" ? 160 : f.key === "watermark_text" ? 60 : 80}
                />
              )}
            </Field>
          ))}
          <button type="submit" disabled={busy} className={`${goldBtn} w-full`}>
            {busy ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />} Save
            & Update Live
          </button>
        </form>
      </Panel>

      <Panel
        title="Change Admin PIN"
        subtitle="4 to 8 digits. Other logged-in devices will be signed out."
        icon={<KeyRound className="size-5" />}
      >
        <form onSubmit={changePin} className="grid gap-4 sm:grid-cols-3">
          {(
            [
              ["current", "Current PIN"],
              ["next", "New PIN"],
              ["confirm", "Confirm new PIN"],
            ] as const
          ).map(([k, label]) => (
            <Field key={k} label={label}>
              <Input
                type="password"
                inputMode="numeric"
                pattern="\d*"
                maxLength={8}
                value={pins[k]}
                onChange={(e) => setPins({ ...pins, [k]: e.target.value.replace(/\D/g, "") })}
                className={inputLux}
                autoComplete="off"
              />
            </Field>
          ))}
          <button
            type="submit"
            disabled={pinBusy || !pins.current}
            className={`${goldBtn} sm:col-span-3`}
          >
            {pinBusy && <Loader2 className="size-5 animate-spin" />} Change PIN
          </button>
        </form>
      </Panel>
    </div>
  );
}
