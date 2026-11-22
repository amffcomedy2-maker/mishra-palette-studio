import { forwardRef } from "react";
import { Award, MapPin, PaintRoller, Phone } from "lucide-react";
import { WhatsAppIcon } from "./icons";
import { formatIndianPhone, isAsciiText, type SiteSettings } from "@/lib/site";
import { cn } from "@/lib/utils";

type Props = { settings: SiteSettings; t: (s: string) => string };

/** The luxury VIP card. Uses only fixed vc-* tokens so the PNG download looks identical in any theme. */
export const VisitingCard = forwardRef<HTMLDivElement, Props>(function VisitingCard(
  { settings: s, t },
  ref,
) {
  const rows = [
    {
      icon: <Phone className="size-4" />,
      label: t("Call"),
      value: formatIndianPhone(s.call_number),
    },
    {
      icon: <WhatsAppIcon className="size-4" />,
      label: t("WhatsApp"),
      value: formatIndianPhone(s.whatsapp_number),
    },
    { icon: <MapPin className="size-4" />, label: t("Address"), value: t(s.address) },
  ];
  return (
    <div ref={ref} className="vc-frame w-full">
      <div className="vc-panel relative overflow-hidden px-5 pb-6 pt-6 sm:px-10 sm:pb-9 sm:pt-8">
        <span className="vc-corner left-3 top-3 rounded-tl-lg border-l-2 border-t-2" />
        <span className="vc-corner right-3 top-3 rounded-tr-lg border-r-2 border-t-2" />
        <span className="vc-corner bottom-3 left-3 rounded-bl-lg border-b-2 border-l-2" />
        <span className="vc-corner bottom-3 right-3 rounded-br-lg border-b-2 border-r-2" />

        <p className="font-hindi vc-gold text-center text-sm font-semibold tracking-wide sm:text-base">
          ॥ {s.devotional_header} ॥
        </p>

        <div className="vc-badge mx-auto mt-4 grid size-14 place-items-center rounded-full sm:size-16">
          <PaintRoller className="size-7 sm:size-8" strokeWidth={2.2} />
        </div>

        <h1 className="font-display vc-emboss mt-4 text-center text-[2rem] font-bold uppercase leading-tight tracking-[0.08em] sm:text-5xl">
          {t(s.business_name)}
        </h1>
        <p className="font-serif-lux mt-1 text-center text-lg italic sm:text-xl">
          {t("Pro.")} {t(s.proprietor_name)}
        </p>

        <div
          className={cn(
            "vc-badge mx-auto mt-4 flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold sm:text-sm",
            isAsciiText(t(s.experience_text)) && "uppercase tracking-wider",
          )}
        >
          <Award className="size-4" />
          {t(s.experience_text)}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="vc-line flex-1" />
          <span className="vc-gold text-xs">◆</span>
          <div className="vc-line flex-1" />
        </div>

        <p className="font-hindi vc-ivory-muted mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed sm:text-lg">
          {t(s.services_text)}
        </p>

        <div className="mt-5 flex items-center gap-3">
          <div className="vc-line flex-1" />
          <span className="vc-gold text-xs">◆</span>
          <div className="vc-line flex-1" />
        </div>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
          {rows.map((r) => (
            <div key={r.label} className="vc-chip flex items-center gap-3 rounded-xl px-3 py-2.5">
              <span className="vc-badge grid size-8 shrink-0 place-items-center rounded-full">
                {r.icon}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "vc-gold block text-[10px] font-bold",
                    isAsciiText(r.label) && "uppercase tracking-[0.18em]",
                  )}
                >
                  {r.label}
                </span>
                <span className="block truncate text-sm font-semibold">{r.value}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
