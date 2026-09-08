import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchProducts, type Product } from "@/lib/data";
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

export const Route = createFileRoute("/catalogue")({
  head: () => ({
    meta: [
      { title: "Catalogue produit — Agents IA Maketou" },
      {
        name: "description",
        content:
          "Ajoutez ou modifiez vos offres : mots-clés d'intérêt, argument clé, prix et lien de paiement.",
      },
      { property: "og:title", content: "Catalogue produit — Agents IA Maketou" },
      {
        property: "og:description",
        content: "Le référentiel qui pilote les agents de matching et de closing, sans code.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <CataloguePage />
    </RequireAuth>
  ),
});

type Draft = {
  id?: string;
  code: string;
  nom: string;
  keywords: string;
  argument_cle: string;
  prix: string;
  devise: string;
  lien_maketou: string;
  statut: string;
};

const emptyDraft: Draft = {
  code: "",
  nom: "",
  keywords: "",
  argument_cle: "",
  prix: "0",
  devise: "XOF",
  lien_maketou: "",
  statut: "actif",
};

function CataloguePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const products = useQuery({ queryKey: ["products"], queryFn: fetchProducts, enabled: !!user });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const payload = {
        user_id: user!.id,
        code: d.code.trim() || d.nom.toLowerCase().replace(/\s+/g, "-"),
        nom: d.nom.trim(),
        mots_cles_interet: d.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        argument_cle: d.argument_cle,
        prix: Number(d.prix) || 0,
        devise: d.devise,
        lien_maketou: d.lien_maketou,
        statut: d.statut,
      };
      const { error } = d.id
        ? await supabase.from("products").update(payload).eq("id", d.id)
        : await supabase.from("products").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toDraft = (p: Product): Draft => ({
    id: p.id,
    code: p.code,
    nom: p.nom,
    keywords: p.mots_cles_interet.join(", "),
    argument_cle: p.argument_cle,
    prix: String(p.prix),
    devise: p.devise,
    lien_maketou: p.lien_maketou,
    statut: p.statut,
  });

  const list = products.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="label-eyebrow">{t("navCatalog")}</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{t("catalogTitle")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("catalogSub")}</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setDraft({ ...emptyDraft })}>{t("addProduct")}</Button>
      </div>


      {list.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="text-sm text-muted-foreground">{t("noProducts")}</p>
          <Button className="mt-4" onClick={() => setDraft({ ...emptyDraft })}>
            {t("addProduct")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <article key={p.id} className="panel flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{p.nom}</h2>
                  <p className="label-eyebrow">{p.code}</p>
                </div>
                <Badge variant={p.statut === "actif" ? "default" : "secondary"}>
                  {p.statut === "actif" ? t("active") : t("inactive")}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{p.argument_cle}</p>
              <div className="flex flex-wrap gap-1.5">
                {p.mots_cles_interet.map((k) => (
                  <span
                    key={k}
                    className="rounded-full border border-border bg-surface-2 px-2 py-0.5 font-mono text-[11px]"
                  >
                    {k}
                  </span>
                ))}
              </div>
              <p className="font-display text-xl font-semibold">
                {Number(p.prix).toLocaleString()} <span className="text-sm">{p.devise}</span>
              </p>
              {p.lien_maketou ? (
                <a
                  href={p.lien_maketou}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-xs text-primary underline-offset-4 hover:underline"
                >
                  {p.lien_maketou}
                </a>
              ) : null}
              <div className="mt-auto flex gap-2 pt-2">
                <Button size="sm" variant="secondary" onClick={() => setDraft(toDraft(p))}>
                  {t("editProduct")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(p.id)}>
                  {t("delete")}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? t("editProduct") : t("addProduct")}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(draft);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("name")}</Label>
                  <Input
                    required
                    value={draft.nom}
                    onChange={(e) => setDraft({ ...draft, nom: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("code")}</Label>
                  <Input
                    value={draft.code}
                    onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("keywords")}</Label>
                <Input
                  value={draft.keywords}
                  onChange={(e) => setDraft({ ...draft, keywords: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">{t("keywordsHint")}</p>
              </div>
              <div className="space-y-1.5">
                <Label>{t("keyArgument")}</Label>
                <Textarea
                  rows={3}
                  value={draft.argument_cle}
                  onChange={(e) => setDraft({ ...draft, argument_cle: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>{t("price")}</Label>
                  <Input
                    type="number"
                    value={draft.prix}
                    onChange={(e) => setDraft({ ...draft, prix: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("currency")}</Label>
                  <Input
                    value={draft.devise}
                    onChange={(e) => setDraft({ ...draft, devise: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("status")}</Label>
                  <Select
                    value={draft.statut}
                    onValueChange={(v) => setDraft({ ...draft, statut: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actif">{t("active")}</SelectItem>
                      <SelectItem value="inactif">{t("inactive")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("payLink")}</Label>
                <Input
                  value={draft.lien_maketou}
                  onChange={(e) => setDraft({ ...draft, lien_maketou: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={save.isPending}>
                  {t("save")}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
