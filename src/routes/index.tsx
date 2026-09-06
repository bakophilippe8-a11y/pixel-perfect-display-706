import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { STAGES, fetchEvents, fetchLeads, fetchProducts, type Stage } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Agents IA de prospection Maketou" },
      {
        name: "description",
        content:
          "Vue d'ensemble du pipeline : leads suivis, taux de réponse, conversion par étape et relances à faire.",
      },
      { property: "og:title", content: "Tableau de bord — Agents IA de prospection Maketou" },
      {
        property: "og:description",
        content: "Leads suivis, taux de réponse, conversion par étape et relances à faire.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Overview />
    </RequireAuth>
  ),
});

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="panel p-5">
      <p className="label-eyebrow">{label}</p>
      <p className="stat-value mt-2">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Overview() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const enabled = !!user;

  const leads = useQuery({ queryKey: ["leads"], queryFn: fetchLeads, enabled });
  const products = useQuery({ queryKey: ["products"], queryFn: fetchProducts, enabled });
  const events = useQuery({ queryKey: ["events"], queryFn: () => fetchEvents(12), enabled });

  const rows = leads.data ?? [];
  const total = rows.length;
  const replied = rows.filter(
    (l) => !["nouveau", "contacte"].includes(l.stage),
  ).length;
  const paid = rows.filter((l) => l.stage === "paye");
  const productById = new Map((products.data ?? []).map((p) => [p.id, p]));
  const revenue = paid.reduce((sum, l) => {
    const p = l.product_id ? productById.get(l.product_id) : undefined;
    return sum + (p ? Number(p.prix) : 0);
  }, 0);
  const pct = (n: number) => (total ? `${Math.round((n / total) * 100)} %` : "—");
  const toQualify = rows.filter((l) => l.stage === "a_qualifier");
  const dueFollowups = rows.filter(
    (l) => l.next_followup_at && new Date(l.next_followup_at) <= new Date(),
  );

  const stageCounts = STAGES.map((s) => ({
    stage: s as Stage,
    count: rows.filter((l) => l.stage === s).length,
  }));
  const max = Math.max(1, ...stageCounts.map((s) => s.count));

  const fmtDate = (d: string) =>
    new Date(d).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-eyebrow">{t("brandSub")}</p>
          <h1 className="mt-1 text-3xl font-semibold">{t("heroTitle")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("heroSub")}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link to="/catalogue">{t("navCatalog")}</Link>
          </Button>
          <Button asChild>
            <Link to="/leads">{t("navLeads")}</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("totalLeads")} value={String(total)} />
        <Stat label={t("replyRate")} value={pct(replied)} hint={`${replied}/${total || 0}`} />
        <Stat label={t("conversionRate")} value={pct(paid.length)} hint={`${paid.length}/${total || 0}`} />
        <Stat
          label={t("revenue")}
          value={revenue.toLocaleString(lang === "fr" ? "fr-FR" : "en-GB")}
          hint={(products.data?.[0]?.devise ?? "XOF")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel p-6">
          <h2 className="text-lg font-semibold">{t("pipeline")}</h2>
          <div className="mt-5 space-y-3">
            {stageCounts.map(({ stage, count }) => (
              <div key={stage} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-sm text-muted-foreground">
                  {t(`stage_${stage}`)}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right font-mono text-sm">{count}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="panel p-6">
            <h2 className="text-lg font-semibold">{t("toQualify")}</h2>
            {toQualify.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("toQualifyEmpty")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {toQualify.slice(0, 6).map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm"
                  >
                    <span>{l.nom}</span>
                    <span className="font-mono text-xs text-muted-foreground">{l.telephone}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel p-6">
            <h2 className="text-lg font-semibold">{t("followupsDue")}</h2>
            <p className="stat-value mt-2">{dueFollowups.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("activeProducts")}:{" "}
              {(products.data ?? []).filter((p) => p.statut === "actif").length}
            </p>
          </section>
        </div>
      </div>

      <section className="panel p-6">
        <h2 className="text-lg font-semibold">{t("recentActivity")}</h2>
        {(events.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("noActivity")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {(events.data ?? []).map((e) => (
              <li key={e.id} className="flex gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                <span className="label-eyebrow w-28 shrink-0 pt-0.5">{e.agent}</span>
                <span className="flex-1 text-sm">{e.contenu || e.type}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {fmtDate(e.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
