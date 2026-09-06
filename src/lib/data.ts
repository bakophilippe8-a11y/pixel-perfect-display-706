import { supabase } from "@/integrations/supabase/client";

export const STAGES = [
  "nouveau",
  "contacte",
  "repondu",
  "a_qualifier",
  "matche",
  "en_negociation",
  "paye",
  "perdu",
  "dormant",
] as const;

export type Stage = (typeof STAGES)[number];

export type Product = {
  id: string;
  code: string;
  nom: string;
  mots_cles_interet: string[];
  argument_cle: string;
  prix: number;
  devise: string;
  lien_maketou: string;
  statut: string;
  created_at: string;
};

export type Lead = {
  id: string;
  nom: string;
  telephone: string;
  source: string;
  stage: Stage;
  product_id: string | null;
  score_confiance: number | null;
  notes: string;
  last_activity_at: string;
  next_followup_at: string | null;
  created_at: string;
};

export type LeadEvent = {
  id: string;
  lead_id: string;
  agent: string;
  type: string;
  contenu: string;
  created_at: string;
};

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("last_activity_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Lead[];
}

export async function fetchEvents(limit = 50): Promise<LeadEvent[]> {
  const { data, error } = await supabase
    .from("lead_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as LeadEvent[];
}

export const SAMPLE_PRODUCTS = [
  {
    code: "forex",
    nom: "Formation Forex",
    mots_cles_interet: ["investir", "trading", "forex", "bourse", "argent"],
    argument_cle: "Apprendre à lire le marché et placer ses premiers trades en 30 jours.",
    prix: 50000,
    devise: "XOF",
    lien_maketou: "https://maketou.com/forex",
    statut: "actif",
  },
  {
    code: "alibaba",
    nom: "Sourcing Alibaba",
    mots_cles_interet: ["import", "alibaba", "commerce", "boutique", "fournisseur"],
    argument_cle: "Trouver un fournisseur fiable et importer sans se faire arnaquer.",
    prix: 35000,
    devise: "XOF",
    lien_maketou: "https://maketou.com/alibaba",
    statut: "actif",
  },
  {
    code: "tiktok",
    nom: "Monétisation TikTok",
    mots_cles_interet: ["tiktok", "contenu", "vidéo", "créateur", "monétisation"],
    argument_cle: "Transformer une audience TikTok en revenus réguliers.",
    prix: 25000,
    devise: "XOF",
    lien_maketou: "https://maketou.com/tiktok",
    statut: "actif",
  },
];
