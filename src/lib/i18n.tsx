import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { translateTexts } from "@/lib/public.functions";
import { isAsciiText, LANGUAGES, type LangCode } from "@/lib/site";

type Dict = Record<string, string>;
type Ctx = {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  dict: Dict;
  request: (texts: string[]) => void;
  translating: boolean;
};

const LangCtx = createContext<Ctx>({
  lang: "orig",
  setLang: () => {},
  dict: {},
  request: () => {},
  translating: false,
});
const LANG_KEY = "mp-lang";
const dictKey = (l: string) => `mp-tr-${l}`;

function readStore(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStore(key: string, v: string) {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* ignore */
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("orig");
  const [dicts, setDicts] = useState<Record<string, Dict>>({});
  const [busy, setBusy] = useState(0);
  const langRef = useRef<LangCode>("orig");
  const dictsRef = useRef(dicts);
  dictsRef.current = dicts;
  const pending = useRef(new Set<string>());
  const inflight = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorShown = useRef(false);

  const loadDict = useCallback((l: LangCode) => {
    if (l === "orig" || dictsRef.current[l]) return;
    const raw = readStore(dictKey(l));
    let parsed: Dict = {};
    try {
      parsed = raw ? (JSON.parse(raw) as Dict) : {};
    } catch {
      parsed = {};
    }
    setDicts((d) => ({ ...d, [l]: parsed }));
  }, []);

  const setLang = useCallback(
    (l: LangCode) => {
      langRef.current = l;
      errorShown.current = false;
      loadDict(l);
      setLangState(l);
      writeStore(LANG_KEY, l);
      document.documentElement.lang = l === "orig" ? "en" : l;
    },
    [loadDict],
  );

  useEffect(() => {
    const saved = readStore(LANG_KEY) as LangCode | null;
    if (saved && LANGUAGES.some((x) => x.code === saved) && saved !== "orig") setLang(saved);
  }, [setLang]);

  const flush = useCallback(async () => {
    timer.current = null;
    const l = langRef.current;
    if (l === "orig") return;
    const texts = Array.from(pending.current).filter((t) => !dictsRef.current[l]?.[t]);
    pending.current.clear();
    if (!texts.length) return;
    const chunks: string[][] = [];
    for (let i = 0; i < texts.length; i += 40) chunks.push(texts.slice(i, i + 40));
    setBusy((b) => b + 1);
    try {
      await Promise.all(
        chunks.map(async (chunk) => {
          chunk.forEach((t) => inflight.current.add(`${l}|${t}`));
          try {
            const res = await translateTexts({ data: { lang: l, texts: chunk } });
            if (!res.ok && !errorShown.current) {
              errorShown.current = true;
              toast.error(res.error ?? "Translation failed");
            }
            if (Object.keys(res.translations).length) {
              setDicts((d) => {
                const next = { ...(d[l] ?? {}), ...res.translations };
                writeStore(dictKey(l), JSON.stringify(next));
                return { ...d, [l]: next };
              });
            }
          } finally {
            chunk.forEach((t) => inflight.current.delete(`${l}|${t}`));
          }
        }),
      );
    } catch {
      if (!errorShown.current) {
        errorShown.current = true;
        toast.error("Translation is not available right now.");
      }
    } finally {
      setBusy((b) => b - 1);
    }
  }, []);

  const request = useCallback(
    (texts: string[]) => {
      const l = langRef.current;
      if (l === "orig") return;
      let added = false;
      for (const t of texts) {
        if (dictsRef.current[l]?.[t] || inflight.current.has(`${l}|${t}`)) continue;
        pending.current.add(t);
        added = true;
      }
      if (added && !timer.current) timer.current = setTimeout(() => void flush(), 120);
    },
    [flush],
  );

  return (
    <LangCtx.Provider
      value={{
        lang,
        setLang,
        dict: lang === "orig" ? {} : (dicts[lang] ?? {}),
        request,
        translating: busy > 0,
      }}
    >
      {children}
    </LangCtx.Provider>
  );
}

export const useLanguage = () => useContext(LangCtx);

/** Returns t(text): the translated text for the visitor's chosen language (or the original while loading). */
export function useT() {
  const { lang, dict, request } = useContext(LangCtx);
  const missing = useRef<string[]>([]);
  missing.current = [];
  const t = (text: string): string => {
    if (!text || lang === "orig") return text;
    if (lang === "en" && isAsciiText(text)) return text;
    const hit = dict[text];
    if (hit) return hit;
    missing.current.push(text);
    return text;
  };
  useEffect(() => {
    if (missing.current.length) request(missing.current);
  });
  return t;
}
