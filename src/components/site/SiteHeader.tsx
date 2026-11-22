import { Check, Languages, Loader2, Moon, PaintRoller, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, useT } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { LANGUAGES } from "@/lib/site";

export function SiteHeader({ businessName }: { businessName: string }) {
  const t = useT();
  const { theme, toggle } = useTheme();
  const { lang, setLang, translating } = useLanguage();
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
  return (
    <header className="glass sticky top-0 z-40 rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <a href="#top" className="group flex min-w-0 items-center gap-2.5">
          <span className="icon-tile size-10 shrink-0 group-hover:rotate-0 group-hover:scale-105">
            <PaintRoller className="size-5" strokeWidth={2.4} />
          </span>
          <span className="font-display truncate text-lg font-bold tracking-wide text-gold-gradient sm:text-xl">
            {t(businessName)}
          </span>
        </a>
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="chip h-10 px-3" aria-label="Change language">
              {translating ? (
                <Loader2 className="size-4 animate-spin text-gold" />
              ) : (
                <Languages className="size-4 text-gold" />
              )}
              <span className="max-w-20 truncate">{current.native}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass w-52">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Language · भाषा
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LANGUAGES.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onSelect={() => setLang(l.code)}
                  className="flex items-center justify-between gap-2"
                >
                  <span>
                    <span className="font-semibold">{l.native}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{l.label}</span>
                  </span>
                  {l.code === lang && <Check className="size-4 text-gold" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={toggle}
            className="chip size-10 justify-center p-0"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? (
              <Sun className="size-4 text-gold" />
            ) : (
              <Moon className="size-4 text-gold" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
