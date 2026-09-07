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

/**
 * Insère en masse des leads importés (contacts téléphone), en ignorant ceux
 * dont le numéro existe déjà pour cet utilisateur. Envoi par lots de 500
 * pour rester dans les limites raisonnables d'une requête Supabase.
 */
export async function bulkInsertLeads(
  userId: string,
  contacts: { nom: string; telephone: string }[],
): Promise<{ inserted: number; skipped: number }> {
  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("telephone")
    .eq("user_id", userId);
  if (fetchError) throw fetchError;

  const existingPhones = new Set((existing ?? []).map((l) => l.telephone));
  const toInsert = contacts.filter((c) => !existingPhones.has(c.telephone));
  const skipped = contacts.length - toInsert.length;

  const CHUNK = 500;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK).map((c) => ({
      user_id: userId,
      nom: c.nom,
      telephone: c.telephone,
      source: "whatsapp",
    }));
    const { error } = await supabase.from("leads").insert(chunk);
    if (error) throw error;
  }

  return { inserted: toInsert.length, skipped };
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
