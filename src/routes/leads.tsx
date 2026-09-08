import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  STAGES,
  bulkInsertLeads,
  fetchLeads,
  fetchProducts,
  type Lead,
  type Stage,
} from "@/lib/data";
import { parseContactsFile, type ImportedContact } from "@/lib/contacts-import";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title: "Suivi des leads — Agents IA Maketou" },
      {
        name: "description",
        content:
          "Chaque contact WhatsApp, son étape dans le pipeline, le produit associé et son historique.",
      },
      { property: "og:title", content: "Suivi des leads — Agents IA Maketou" },
      {
        property: "og:description",
        content: "Pipeline de prospection : étapes, produit matché, relances et historique.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <LeadsPage />
    </RequireAuth>
  ),
});

const stageTone: Record<Stage, string> = {
  nouveau: "bg-surface-2 text-muted-foreground",
  contacte: "bg-surface-2 text-foreground",
  repondu: "bg-chart-2/15 text-chart-2",
  a_qualifier: "bg-warning/15 text-warning",
  matche: "bg-chart-4/15 text-chart-4",
  en_negociation: "bg-chart-2/20 text-chart-2",
  paye: "bg-primary/20 text-primary",
  perdu: "bg-destructive/15 text-destructive",
  dormant: "bg-surface-2 text-muted-foreground",
};

function LeadsPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const [creating, setCreating] = useState(false);
  const [newLead, setNewLead] = useState({ nom: "", telephone: "" });
  const [note, setNote] = useState("");
  const [importing, setImporting] = useState(false);
  const [importedContacts, setImportedContacts] = useState<ImportedContact[]>([]);
  const [importFileName, setImportFileName] = useState("");

  const leads = useQuery({ queryKey: ["leads"], queryFn: fetchLeads, enabled: !!user });
  const products = useQuery({ queryKey: ["products"], queryFn: fetchProducts, enabled: !!user });

  const events = useQuery({
    queryKey: ["lead-events", openLead?.id],
    enabled: !!openLead,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_events")
        .select("*")
        .eq("lead_id", openLead!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createLead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("leads").insert({
        user_id: user!.id,
        nom: newLead.nom.trim(),
        telephone: newLead.telephone.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setCreating(false);
      setNewLead({ nom: "", telephone: "" });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importContacts = useMutation({
    mutationFn: () => bulkInsertLeads(user!.id, importedContacts),
    onSuccess: ({ inserted, skipped }) => {
      toast.success(
        t("importSuccess")
          .replace("{inserted}", String(inserted))
          .replace("{skipped}", String(skipped)),
      );
      setImporting(false);
      setImportedContacts([]);
      setImportFileName("");
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleImportFile = async (file: File) => {
    const content = await file.text();
    const contacts = parseContactsFile(file.name, content);
    setImportFileName(file.name);
    setImportedContacts(contacts);
  };

  const updateLead = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("leads")
        .update({ ...patch, last_activity_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addNote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lead_events").insert({
        user_id: user!.id,
        lead_id: openLead!.id,
        agent: "manuel",
        type: "note",
        contenu: note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNote("");
      qc.invalidateQueries({ queryKey: ["lead-events", openLead?.id] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setOpenLead(null);
      toast.success(t("deleted"));
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const productName = (id: string | null) =>
    (products.data ?? []).find((p) => p.id === id)?.nom ?? t("none");

  const rows = (leads.data ?? []).filter(
    (l) =>
      (filter === "all" || l.stage === filter) &&
      (l.nom + l.telephone).toLowerCase().includes(search.toLowerCase()),
  );

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="label-eyebrow">{t("navLeads")}</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{t("leadsTitle")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("leadsSub")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setImporting(true)}>
            {t("importContacts")}
          </Button>
          <Button className="flex-1 sm:flex-none" onClick={() => setCreating(true)}>{t("addLead")}</Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Input
          className="w-full sm:max-w-xs"
          placeholder={t("search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStages")}</SelectItem>
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`stage_${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>


      <div className="panel overflow-x-auto">
        {rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">{t("noLeads")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="label-eyebrow p-4">{t("contact")}</th>
                <th className="label-eyebrow p-4">{t("stage")}</th>
                <th className="label-eyebrow p-4">{t("product")}</th>
                <th className="label-eyebrow p-4">{t("confidence")}</th>
                <th className="label-eyebrow p-4">{t("lastActivity")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => setOpenLead(l)}
                  className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-surface-2"
                >
                  <td className="p-4">
                    <span className="font-medium">{l.nom}</span>
                    <span className="block font-mono text-xs text-muted-foreground">
                      {l.telephone}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${stageTone[l.stage]}`}
                    >
                      {t(`stage_${l.stage}`)}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">{productName(l.product_id)}</td>
                  <td className="p-4 font-mono text-xs">
                    {l.score_confiance != null
                      ? `${Math.round(Number(l.score_confiance) * 100)} %`
                      : "—"}
                  </td>
                  <td className="p-4 text-xs text-muted-foreground">{fmt(l.last_activity_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New lead */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addLead")}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              createLead.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label>{t("contact")}</Label>
              <Input
                required
                value={newLead.nom}
                onChange={(e) => setNewLead({ ...newLead, nom: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("phone")}</Label>
              <Input
                value={newLead.telephone}
                onChange={(e) => setNewLead({ ...newLead, telephone: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit">{t("save")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import contacts */}
      <Dialog
        open={importing}
        onOpenChange={(o) => {
          setImporting(o);
          if (!o) {
            setImportedContacts([]);
            setImportFileName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("importContactsTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("importContactsHint")}</p>

            <div className="space-y-1.5">
              <Label>{t("importFileLabel")}</Label>
              <Input
                type="file"
                accept=".vcf,.csv,text/vcard,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                }}
              />
            </div>

            {importFileName && (
              <p className="text-sm">
                {importedContacts.length > 0
                  ? t("importPreviewCount").replace("{count}", String(importedContacts.length))
                  : t("importNoneFound")}
              </p>
            )}

            {importedContacts.length > 0 && (
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border bg-surface-2 p-2 text-xs">
                {importedContacts.slice(0, 50).map((c, i) => (
                  <li key={i} className="flex justify-between gap-3 px-2 py-1">
                    <span className="truncate">{c.nom}</span>
                    <span className="font-mono text-muted-foreground">{c.telephone}</span>
                  </li>
                ))}
                {importedContacts.length > 50 && (
                  <li className="px-2 py-1 text-muted-foreground">
                    … {importedContacts.length - 50} {t("importContacts").toLowerCase()}
                  </li>
                )}
              </ul>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setImporting(false)}>
                {t("cancel")}
              </Button>
              <Button
                disabled={importedContacts.length === 0 || importContacts.isPending}
                onClick={() => importContacts.mutate()}
              >
                {importContacts.isPending ? t("importing") : t("importConfirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead detail */}
      <Dialog open={!!openLead} onOpenChange={(o) => !o && setOpenLead(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{openLead?.nom}</DialogTitle>
          </DialogHeader>
          {openLead ? (
            <div className="space-y-5">
              <p className="font-mono text-xs text-muted-foreground">{openLead.telephone}</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("stage")}</Label>
                  <Select
                    value={openLead.stage}
                    onValueChange={(v) => {
                      setOpenLead({ ...openLead, stage: v as Stage });
                      updateLead.mutate({ id: openLead.id, patch: { stage: v } });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(`stage_${s}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("product")}</Label>
                  <Select
                    value={openLead.product_id ?? "none"}
                    onValueChange={(v) => {
                      const val = v === "none" ? null : v;
                      setOpenLead({ ...openLead, product_id: val });
                      updateLead.mutate({ id: openLead.id, patch: { product_id: val } });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("none")}</SelectItem>
                      {(products.data ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t("notes")}</Label>
                <Textarea
                  rows={3}
                  defaultValue={openLead.notes}
                  onBlur={(e) =>
                    updateLead.mutate({ id: openLead.id, patch: { notes: e.target.value } })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>{t("history")}</Label>
                <div className="flex gap-2">
                  <Input value={note} onChange={(e) => setNote(e.target.value)} />
                  <Button
                    onClick={() => note.trim() && addNote.mutate()}
                    disabled={addNote.isPending}
                  >
                    {t("addNote")}
                  </Button>
                </div>
                <ul className="mt-2 space-y-2">
                  {(events.data ?? []).map((e) => (
                    <li
                      key={e.id}
                      className="flex items-start gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
                    >
                      <Badge variant="secondary" className="shrink-0">
                        {e.agent}
                      </Badge>
                      <span className="flex-1">{e.contenu}</span>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                        {fmt(e.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-end">
                <Button variant="ghost" onClick={() => removeLead.mutate(openLead.id)}>
                  {t("delete")}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
