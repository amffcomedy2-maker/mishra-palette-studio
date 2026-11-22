import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Phone, UserPlus } from "lucide-react";
import { VisitingCard } from "./VisitingCard";
import { WhatsAppIcon } from "./icons";
import { useTilt } from "./motion";
import { useT } from "@/lib/i18n";
import {
  buildVCard,
  defaultEnquiryMessage,
  telLink,
  whatsappLink,
  type SiteSettings,
} from "@/lib/site";
import { cn } from "@/lib/utils";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const actionBase =
  "btn-3d inline-flex h-13 items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-3 text-sm font-bold sm:text-[15px]";

export function CardHero({
  settings,
  cardImageUrl,
}: {
  settings: SiteSettings;
  cardImageUrl: string | null;
}) {
  const t = useT();
  const cardRef = useRef<HTMLDivElement>(null);
  const tilt = useTilt<HTMLDivElement>(6);
  const [busy, setBusy] = useState(false);

  async function downloadCard() {
    if (busy) return;
    if (cardImageUrl) {
      setBusy(true);
      try {
        const res = await fetch(cardImageUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
        downloadBlob(blob, `Mishra-Painters-Visiting-Card.${ext}`);
        toast.success(t("Visiting card downloaded!"));
      } catch (e) {
        console.error(e);
        window.open(cardImageUrl, "_blank", "noopener");
      } finally {
        setBusy(false);
      }
      return;
    }
    const el = cardRef.current;
    if (!el) return;
    setBusy(true);
    try {
      tilt.reset();
      await document.fonts?.ready;
      const html2canvas = (await import("html2canvas-pro")).default;
      const canvas = await html2canvas(el, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
        logging: false,
      });
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("no blob");
      downloadBlob(blob, "Mishra-Painters-Visiting-Card.png");
      toast.success(t("Visiting card downloaded!"));
    } catch (e) {
      console.error(e);
      toast.error(t("Could not download the card. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  function saveContact() {
    const blob = new Blob([buildVCard(settings)], { type: "text/vcard;charset=utf-8" });
    downloadBlob(
      blob,
      `${settings.proprietor_name.replace(/\s+/g, "-")}-${settings.business_name.replace(/\s+/g, "-")}.vcf`,
    );
    toast.success(t("Contact file ready — open it to save the number."));
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pt-6 sm:pt-12">
      <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div
          ref={tilt.ref}
          className="group relative transition-transform duration-300 ease-out will-change-transform"
        >
          {cardImageUrl ? (
            <img
              src={cardImageUrl}
              alt={`${settings.business_name} — ${t("Visiting Card")}`}
              className="block w-full rounded-[22px] shadow-2xl"
              fetchPriority="high"
            />
          ) : (
            <VisitingCard ref={cardRef} settings={settings} t={t} />
          )}
          <div className="tilt-glare pointer-events-none absolute inset-0 rounded-[22px] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="animate-sheen pointer-events-none absolute inset-0 rounded-[22px]" />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={downloadCard}
          disabled={busy}
          className={cn(actionBase, "btn-gold col-span-2 sm:col-span-1")}
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <Download className="size-5" />}
          {t("Download Visiting Card")}
        </button>
        <a
          href={whatsappLink(
            settings.whatsapp_number,
            defaultEnquiryMessage(settings.proprietor_name),
          )}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(actionBase, "btn-whatsapp")}
        >
          <WhatsAppIcon className="size-5" />
          {t("WhatsApp Now")}
        </a>
        <a href={telLink(settings.call_number)} className={cn(actionBase, "btn-glass")}>
          <Phone className="size-5 text-gold" />
          {t("Call Now")}
        </a>
        <button
          type="button"
          onClick={saveContact}
          className={cn(actionBase, "btn-glass col-span-2 sm:col-span-1")}
        >
          <UserPlus className="size-5 text-gold" />
          {t("Save Contact")}
        </button>
      </div>
    </section>
  );
}
