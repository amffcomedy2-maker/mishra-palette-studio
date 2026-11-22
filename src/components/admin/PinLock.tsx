import { useCallback, useEffect, useState } from "react";
import { Delete, Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { adminLogin } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

export function PinLock({ onUnlock }: { onUnlock: (token: string) => void }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = useCallback(async () => {
    if (pin.length < 4 || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await adminLogin({ data: { pin } });
      if (res.ok) {
        toast.success("Welcome Amit ji! Admin panel unlocked.");
        onUnlock(res.token);
      } else {
        setError(res.message);
        setPin("");
      }
    } catch {
      setError("Could not check PIN. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [pin, busy, onUnlock]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) setPin((p) => (p.length < 8 ? p + e.key : p));
      else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
      else if (e.key === "Enter") void submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submit]);

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass w-full max-w-sm rounded-3xl p-7 text-center animate-in fade-in zoom-in-95 duration-500">
        <span className="icon-tile mx-auto size-16">
          <LockKeyhole className="size-8" />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-gold-gradient">Admin Access</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter your PIN · अपना PIN डालें</p>

        <div className="mt-6 flex h-6 items-center justify-center gap-3" aria-live="polite">
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "size-3.5 rounded-full border-2 border-gold transition-all",
                i < pin.length ? "scale-110 bg-gold" : "bg-transparent",
              )}
            />
          ))}
        </div>
        <p className="mt-3 min-h-5 text-sm font-medium text-destructive">{error}</p>

        <div className="mt-3 grid grid-cols-3 gap-3">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              aria-label={k === "back" ? "Delete digit" : k === "clear" ? "Clear" : k}
              onClick={() => {
                setError("");
                if (k === "back") setPin((p) => p.slice(0, -1));
                else if (k === "clear") setPin("");
                else setPin((p) => (p.length < 8 ? p + k : p));
              }}
              className="btn-3d btn-glass grid h-14 place-items-center rounded-2xl text-xl font-bold"
            >
              {k === "back" ? (
                <Delete className="size-5" />
              ) : k === "clear" ? (
                <span className="text-xs font-semibold uppercase">Clear</span>
              ) : (
                k
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={pin.length < 4 || busy}
          onClick={() => void submit()}
          className="btn-3d btn-gold mt-6 inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold disabled:pointer-events-none disabled:opacity-60"
        >
          {busy && <Loader2 className="size-5 animate-spin" />}
          Unlock
        </button>
      </div>
    </div>
  );
}
