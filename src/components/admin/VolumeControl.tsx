import { useEffect, useState } from "react";
import { Loader2, Volume1, Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Field } from "./ui";

function VolumeIcon({ v, className }: { v: number; className?: string }) {
  if (v === 0) return <VolumeX className={className} />;
  if (v < 50) return <Volume1 className={className} />;
  return <Volume2 className={className} />;
}

/** Volume slider for the Add Media form. */
export function VolumeField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Field label="Sound volume" hint="How loud this reel/video plays on the website. 0 = muted.">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-3">
        <VolumeIcon v={value} className="size-5 shrink-0 text-gold" />
        <Slider
          value={[value]}
          min={0}
          max={100}
          step={5}
          onValueChange={(x) => onChange(x[0] ?? 0)}
          aria-label="Sound volume"
        />
        <span className="w-11 shrink-0 text-right text-sm font-bold tabular-nums">{value}%</span>
      </div>
    </Field>
  );
}

/** Inline volume slider for a published reel/video; saves when the admin lets go. */
export function InlineVolume({
  value,
  saving,
  onSave,
}: {
  value: number;
  saving: boolean;
  onSave: (v: number) => void;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <div className="mt-2 flex items-center gap-2.5">
      <button
        type="button"
        onClick={() => {
          const next = v === 0 ? 100 : 0;
          setV(next);
          onSave(next);
        }}
        className="shrink-0 text-gold"
        aria-label={v === 0 ? "Unmute" : "Mute"}
        title={v === 0 ? "Unmute" : "Mute"}
      >
        <VolumeIcon v={v} className="size-4" />
      </button>
      <Slider
        value={[v]}
        min={0}
        max={100}
        step={5}
        onValueChange={(x) => setV(x[0] ?? 0)}
        onValueCommit={(x) => onSave(x[0] ?? 0)}
        className="max-w-[220px]"
        aria-label="Sound volume"
      />
      <span className="flex w-12 shrink-0 items-center gap-1 text-xs font-bold tabular-nums text-muted-foreground">
        {saving ? <Loader2 className="size-3.5 animate-spin" /> : `${v}%`}
      </span>
    </div>
  );
}
