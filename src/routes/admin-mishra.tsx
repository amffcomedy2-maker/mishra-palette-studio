import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Clapperboard,
  ExternalLink,
  ImagePlus,
  ListChecks,
  Lock,
  Moon,
  PaintRoller,
  Plug,
  Settings,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import { PinLock } from "@/components/admin/PinLock";
import { UploadPhotoTab } from "@/components/admin/UploadPhotoTab";
import { AddMediaTab } from "@/components/admin/AddMediaTab";
import { ManagePostsTab } from "@/components/admin/ManagePostsTab";
import { ApiManagerTab } from "@/components/admin/ApiManagerTab";
import { SettingsTab } from "@/components/admin/SettingsTab";
import { AdminCtx, useAdmin as useAdminCtx } from "@/components/admin/admin-context";
import { adminCheck, adminOverview } from "@/lib/admin.functions";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/admin-mishra")({
  head: () => ({
    meta: [
      { title: "Admin · Mishra Painters" },
      { name: "description", content: "Private admin panel for Mishra Painters." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin · Mishra Painters" },
      { property: "og:description", content: "Private admin panel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const TOKEN_KEY = "mp-admin-token";
type TabId = "upload" | "media" | "manage" | "apis" | "settings";

function readToken(): string {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}
function writeToken(t: string) {
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked */
  }
}

function AdminPage() {
  const [token, setTokenState] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const saved = readToken();
    if (!saved) {
      setChecking(false);
      return;
    }
    adminCheck({ data: { token: saved } })
      .then((r) => {
        if (r.ok) setTokenState(saved);
        else writeToken("");
      })
      .catch(() => writeToken(""))
      .finally(() => setChecking(false));
  }, []);

  const setToken = useCallback((t: string) => {
    writeToken(t);
    setTokenState(t);
  }, []);
  const logout = useCallback((msg?: string) => {
    writeToken("");
    setTokenState("");
    if (msg) toast.info(msg);
  }, []);
  const ctx = useMemo(() => ({ token, setToken, logout }), [token, setToken, logout]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="icon-tile size-14 animate-pulse">
          <PaintRoller className="size-7" />
        </span>
      </div>
    );
  }
  if (!token) return <PinLock onUnlock={setToken} />;
  return (
    <AdminCtx.Provider value={ctx}>
      <Dashboard />
    </AdminCtx.Provider>
  );
}

function Dashboard() {
  const [tab, setTab] = useState<TabId>("upload");
  const { theme, toggle } = useTheme();
  const { token, logout } = useAdminCtx();
  const overview = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => adminOverview({ data: { token } }),
  });

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "upload", label: "Upload Photo", icon: <ImagePlus className="size-4" /> },
    { id: "media", label: "Reel / Video", icon: <Clapperboard className="size-4" /> },
    { id: "manage", label: "Manage Posts", icon: <ListChecks className="size-4" /> },
    { id: "apis", label: "API Manager", icon: <Plug className="size-4" /> },
    { id: "settings", label: "Card & Settings", icon: <Settings className="size-4" /> },
  ];

  return (
    <div className="min-h-screen pb-16">
      <header className="glass sticky top-0 z-40 rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          <span className="icon-tile size-10 shrink-0">
            <PaintRoller className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-display truncate font-bold text-gold-gradient">Admin Panel</p>
            <p className="truncate text-xs text-muted-foreground">Mishra Painters</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener"
              className="chip size-10 justify-center p-0"
              aria-label="View live website"
            >
              <ExternalLink className="size-4 text-gold" />
            </a>
            <button
              type="button"
              onClick={toggle}
              className="chip size-10 justify-center p-0"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="size-4 text-gold" />
              ) : (
                <Moon className="size-4 text-gold" />
              )}
            </button>
            <button
              type="button"
              onClick={() => logout("Admin panel locked.")}
              className="chip h-10 px-3"
              aria-label="Lock admin panel"
            >
              <Lock className="size-4 text-gold" />
              <span className="hidden sm:inline">Lock</span>
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              data-active={tab === t.id}
              onClick={() => setTab(t.id)}
              className="chip px-3.5 py-2 text-sm"
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-6 animate-in fade-in duration-500" key={tab}>
        {tab === "upload" && (
          <UploadPhotoTab imgbbCount={overview.data?.imgbb} onGoToApis={() => setTab("apis")} />
        )}
        {tab === "media" && <AddMediaTab cloudinaryCount={overview.data?.cloudinary} />}
        {tab === "manage" && <ManagePostsTab />}
        {tab === "apis" && <ApiManagerTab />}
        {tab === "settings" && (
          <Suspense fallback={<div className="skeleton-gold h-96 rounded-3xl" />}>
            <SettingsTab />
          </Suspense>
        )}
      </main>
    </div>
  );
}
