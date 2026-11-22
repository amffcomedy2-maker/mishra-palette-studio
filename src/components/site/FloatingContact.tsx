import { Phone } from "lucide-react";
import { WhatsAppIcon } from "./icons";
import { defaultEnquiryMessage, telLink, whatsappLink, type SiteSettings } from "@/lib/site";

export function FloatingContact({ settings }: { settings: SiteSettings }) {
  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-50 flex flex-col gap-3">
      <a
        href={whatsappLink(
          settings.whatsapp_number,
          defaultEnquiryMessage(settings.proprietor_name),
        )}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="btn-3d btn-whatsapp pulse-ring relative isolate grid size-14 place-items-center rounded-full"
      >
        <WhatsAppIcon className="size-7" />
      </a>
      <a
        href={telLink(settings.call_number)}
        aria-label="Call now"
        className="btn-3d btn-gold grid size-14 place-items-center rounded-full"
      >
        <Phone className="size-6" />
      </a>
    </div>
  );
}
