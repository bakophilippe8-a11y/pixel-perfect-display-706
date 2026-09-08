import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { STAGES, fetchLeads, fetchProducts, type Lead, type Product } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import { RequireAuth } from "@/components/RequireAuth";

export const Route = createFileRoute("/statistiques")({
  head: () => ({
    meta: [
      { title: "Statistiques de ventes — Agents IA Maketou" },
      {
        name: "description",
        content:
          "Courbes d'évolution du chiffre d'affaires, des ventes conclues et des nouveaux leads dans le temps.",
      },
      { property: "og:title", content: "Statistiques de ventes — Agents IA Maketou" },
      {
        property: "og:description",
        content: "Évolution du chiffre d'affaires, des ventes conclues et des nouveaux leads.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Stats />
    </RequireAuth>
  ),
});

type Bucket = "day" | "week" | "month";
type RangeKey = "30" | "90" | "365";

function startOfBucket(d: Date, bucket: Bucket) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  if (bucket === "week") {
    const dow = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - dow);
  }
  if (bucket === "month") x.setDate(1);
  return x;
}

function buildBuckets(from: Date, to: Date, bucket: Bucket) {
  const out: Date[] = [];
  let cur = startOfBucket(from, bucket);
  const end = startOfBucket(to, bucket);
  while (cur <= end) {
    out.push(new Date(cur));
    const next = new Date(cur);
    if (bucket === "day") next.setDate(next.getDate() + 1);
    else if (bucket === "week") next.setDate(next.getDate() + 7);
    else next.setMonth(next.getMonth() + 1);
    cur = next;
  }
  return out;
}

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel p-5">
      <p className="label-eyebrow">{title}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children as any}
        </ResponsiveContainer>
      </div>
    </section>
  );
}

const axis = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

function tooltipStyle() {
  return {
    contentStyle: {
      background: "var(--popover)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      fontSize: 12,
      color: "var(--popover-foreground)",
    },
    labelStyle: { color: "var(--muted-foreground)" },
    cursor: { fill: "color-mix(in oklab, var(--muted) 45%, transparent)" },
  } as const;
}

function Stats() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const enabled = !!user;
  const [range, setRange] = useState<RangeKey>("90");

  const leadsQ = useQuery({ queryKey: ["leads"], queryFn: fetchLeads, enabled });
  const productsQ = useQuery({ queryKey: ["products"], queryFn: fetchProducts, enabled });

  const leads: Lead[] = leadsQ.data ?? [];
  const products: Product[] = productsQ.data ?? [];
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const priceOf = (l: Lead) => {
    const p = l.product_id ? productById.get(l.product_id) : undefined;
    return p ? Number(p.prix) : 0;
  };
  const devise = products[0]?.devise ?? "XOF";

  const days = Number(range);
  const bucket: Bucket = days <= 30 ? "day" : days <= 90 ? "week" : "month";
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days + 1);

  const locale = lang === "fr" ? "fr-FR" : "en-GB";
  const labelOf = (d: Date) =>
    bucket === "month"
      ? d.toLocaleDateString(locale, { month: "short", year: "2-digit" })
      : d.toLocaleDateString(locale, { day: "2-digit", month: "short" });

  const series = useMemo(() => {
    const buckets = buildBuckets(from, to, bucket);
    const index = new Map(buckets.map((b, i) => [b.getTime(), i]));
    const rows = buckets.map((b) => ({
      label: labelOf(b),
      ca: 0,
      ventes: 0,
      leads: 0,
      cumul: 0,
    }));
    const put = (dateStr: string, fn: (r: (typeof rows)[number]) => void) => {
      const d = startOfBucket(new Date(dateStr), bucket);
      const i = index.get(d.getTime());
      if (i !== undefined) fn(rows[i]!);
    };
    for (const l of leads) {
      put(l.created_at, (r) => (r.leads += 1));
      if (l.stage === "paye") {
        put(l.last_activity_at, (r) => {
          r.ventes += 1;
          r.ca += priceOf(l);
        });
      }
    }
    let acc = 0;
    for (const r of rows) {
      acc += r.ca;
      r.cumul = acc;
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, products, range, lang]);

  const inRange = (d: string) => new Date(d) >= startOfBucket(from, bucket);
  const paidLeads = leads.filter((l) => l.stage === "paye" && inRange(l.last_activity_at));
  const caTotal = paidLeads.reduce((s, l) => s + priceOf(l), 0);
  const newLeads = leads.filter((l) => inRange(l.created_at)).length;
  const panier = paidLeads.length ? Math.round(caTotal / paidLeads.length) : 0;
  const nf = new Intl.NumberFormat(locale);

  const byProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of paidLeads) {
      const p = l.product_id ? productById.get(l.product_id) : undefined;
      const key = p?.nom ?? t("statsUnassigned");
      map.set(key, (map.get(key) ?? 0) + priceOf(l));
    }
    return [...map.entries()]
      .map(([nom, ca]) => ({ nom, ca }))
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, products, range, lang]);

  const funnel = STAGES.filter((s) => s !== "perdu" && s !== "dormant").map((s) => ({
    stage: t(`stage_${s}`),
    count: leads.filter((l) => l.stage === s).length,
  }));

  const ranges: { key: RangeKey; label: string }[] = [
    { key: "30", label: t("range30") },
    { key: "90", label: t("range90") },
    { key: "365", label: t("range365") },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold">{t("statsTitle")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("statsSub")}</p>
        </div>
        <div className="flex items-center self-start overflow-x-auto rounded-full border border-border bg-surface-2 p-0.5 text-xs font-medium">

          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                range === r.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t("revenue"), value: `${nf.format(caTotal)} ${devise}` },
          { label: t("statsSalesCount"), value: nf.format(paidLeads.length) },
          { label: t("statsNewLeads"), value: nf.format(newLeads) },
          { label: t("statsAvgBasket"), value: panier ? `${nf.format(panier)} ${devise}` : "—" },
        ].map((s) => (
          <div key={s.label} className="panel p-5">
            <p className="label-eyebrow">{s.label}</p>
            <p className="stat-value mt-2">{s.value}</p>
          </div>
        ))}
      </div>

      <ChartCard title={t("statsRevenueOverTime")} hint={t("statsBucketHint")}>
        <AreaChart data={series} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="ca" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" {...axis} />
          <YAxis {...axis} width={54} />
          <Tooltip {...tooltipStyle()} />
          <Area
            type="monotone"
            dataKey="ca"
            name={t("revenue")}
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#ca)"
          />
        </AreaChart>
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t("statsCumulative")}>
          <LineChart data={series} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} width={54} />
            <Tooltip {...tooltipStyle()} />
            <Line
              type="monotone"
              dataKey="cumul"
              name={t("statsCumulative")}
              stroke="var(--chart-2)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartCard>

        <ChartCard title={t("statsLeadsVsSales")}>
          <BarChart data={series} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} width={32} allowDecimals={false} />
            <Tooltip {...tooltipStyle()} />
            <Bar dataKey="leads" name={t("statsNewLeads")} fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="ventes" name={t("statsSalesCount")} fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title={t("statsByProduct")}>
          <BarChart
            data={byProduct}
            layout="vertical"
            margin={{ left: 8, right: 12, top: 8, bottom: 0 }}
          >
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" {...axis} />
            <YAxis type="category" dataKey="nom" width={110} {...axis} />
            <Tooltip {...tooltipStyle()} />
            <Bar dataKey="ca" name={t("revenue")} fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title={t("statsFunnel")}>
          <BarChart data={funnel} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="stage" {...axis} interval={0} angle={-25} textAnchor="end" height={54} />
            <YAxis {...axis} width={32} allowDecimals={false} />
            <Tooltip {...tooltipStyle()} />
            <Bar dataKey="count" name={t("totalLeads")} fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      {leads.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("statsEmpty")}</p>
      ) : null}
    </div>
  );
}
