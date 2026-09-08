import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";

function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex items-center rounded-full border border-border bg-surface-2 p-0.5 text-xs font-medium">
      {(["fr", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`rounded-full px-2.5 py-1 uppercase transition-colors ${
            lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const nav = [
    { to: "/", label: t("navOverview") },
    { to: "/catalogue", label: t("navCatalog") },
    { to: "/leads", label: t("navLeads") },
    { to: "/statistiques", label: t("navStats") },
  ] as const;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:flex sm:flex-wrap sm:gap-4 sm:px-5">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground">
              AI
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-sm font-semibold">{t("brand")}</span>
              <span className="label-eyebrow block truncate">{t("brandSub")}</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:order-3 sm:ml-auto sm:gap-3">
            <LangToggle />
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                className="px-2 sm:px-3"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/auth" });
                }}
              >
                {t("signOut")}
              </Button>
            ) : null}
          </div>

          <nav className="col-span-2 -mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 sm:order-2 sm:col-span-1 sm:mx-0 sm:overflow-visible sm:px-0">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "bg-surface-2 text-foreground" }}
                inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
                className="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-5 sm:py-8">{children}</main>

    </div>
  );
}
