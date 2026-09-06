import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "fr" | "en";

type Dict = Record<string, { fr: string; en: string }>;

const dict: Dict = {
  brand: { fr: "Agents IA — Prospection", en: "AI Agents — Prospecting" },
  brandSub: { fr: "Bladers × Maketou", en: "Bladers × Maketou" },
  navOverview: { fr: "Vue d'ensemble", en: "Overview" },
  navCatalog: { fr: "Catalogue", en: "Catalog" },
  navLeads: { fr: "Leads", en: "Leads" },
  signOut: { fr: "Se déconnecter", en: "Sign out" },
  signIn: { fr: "Se connecter", en: "Sign in" },
  signUp: { fr: "Créer un compte", en: "Create account" },
  email: { fr: "Adresse e-mail", en: "Email address" },
  password: { fr: "Mot de passe", en: "Password" },
  continueGoogle: { fr: "Continuer avec Google", en: "Continue with Google" },
  authTitle: { fr: "Accès au pilotage", en: "Control access" },
  authSub: {
    fr: "Connectez-vous pour piloter le catalogue et le pipeline de vente.",
    en: "Sign in to manage your catalog and sales pipeline.",
  },
  noAccount: { fr: "Pas encore de compte ?", en: "No account yet?" },
  haveAccount: { fr: "Déjà un compte ?", en: "Already have an account?" },
  checkEmail: {
    fr: "Compte créé. Ouvrez l'e-mail de confirmation puis revenez vous connecter.",
    en: "Account created. Open the confirmation email, then come back and sign in.",
  },
  passwordHint: {
    fr: "8 caractères minimum, évitez un mot de passe courant.",
    en: "At least 8 characters, avoid common passwords.",
  },

  heroTitle: { fr: "Le cerveau de vos agents de vente", en: "The brain of your sales agents" },
  heroSub: {
    fr: "Catalogue pilotable sans code, suivi des leads WhatsApp et taux de conversion par étape du pipeline.",
    en: "A no-code product catalog, WhatsApp lead tracking, and conversion rates at every pipeline step.",
  },
  heroCta: { fr: "Ouvrir le tableau de bord", en: "Open the dashboard" },

  totalLeads: { fr: "Leads suivis", en: "Tracked leads" },
  replyRate: { fr: "Taux de réponse", en: "Reply rate" },
  conversionRate: { fr: "Taux de conversion", en: "Conversion rate" },
  revenue: { fr: "Ventes encaissées", en: "Collected sales" },
  pipeline: { fr: "Pipeline par étape", en: "Pipeline by stage" },
  activeProducts: { fr: "Produits actifs", en: "Active products" },
  toQualify: { fr: "À qualifier manuellement", en: "Needs manual review" },
  toQualifyEmpty: { fr: "Aucun lead en attente. ", en: "Nothing waiting. " },
  recentActivity: { fr: "Activité récente", en: "Recent activity" },
  noActivity: { fr: "Aucune activité pour le moment.", en: "No activity yet." },
  followupsDue: { fr: "Relances à faire", en: "Follow-ups due" },

  catalogTitle: { fr: "Catalogue produit", en: "Product catalog" },
  catalogSub: {
    fr: "Ajoutez une offre ici et les agents la prennent en compte immédiatement, sans toucher au code.",
    en: "Add an offer here and the agents pick it up immediately, with no code change.",
  },
  addProduct: { fr: "Nouveau produit", en: "New product" },
  editProduct: { fr: "Modifier le produit", en: "Edit product" },
  code: { fr: "Identifiant", en: "Identifier" },
  name: { fr: "Nom commercial", en: "Product name" },
  keywords: { fr: "Mots-clés d'intérêt", en: "Interest keywords" },
  keywordsHint: {
    fr: "Séparés par des virgules — ex : investir, trading, bourse",
    en: "Comma separated — e.g. invest, trading, markets",
  },
  keyArgument: { fr: "Argument clé", en: "Key argument" },
  price: { fr: "Prix", en: "Price" },
  currency: { fr: "Devise", en: "Currency" },
  payLink: { fr: "Lien de paiement", en: "Payment link" },
  status: { fr: "Statut", en: "Status" },
  active: { fr: "Actif", en: "Active" },
  inactive: { fr: "Inactif", en: "Inactive" },
  save: { fr: "Enregistrer", en: "Save" },
  cancel: { fr: "Annuler", en: "Cancel" },
  delete: { fr: "Supprimer", en: "Delete" },
  noProducts: { fr: "Le catalogue est vide.", en: "The catalog is empty." },
  loadSamples: { fr: "Charger les 3 offres de départ", en: "Load the 3 starter offers" },

  leadsTitle: { fr: "Suivi des leads", en: "Lead tracking" },
  leadsSub: {
    fr: "Chaque contact, son étape, le produit associé et son historique.",
    en: "Every contact, its stage, matched product and history.",
  },
  addLead: { fr: "Nouveau lead", en: "New lead" },
  contact: { fr: "Contact", en: "Contact" },
  phone: { fr: "Téléphone", en: "Phone" },
  stage: { fr: "Étape", en: "Stage" },
  product: { fr: "Produit", en: "Product" },
  confidence: { fr: "Confiance", en: "Confidence" },
  lastActivity: { fr: "Dernière activité", en: "Last activity" },
  notes: { fr: "Notes", en: "Notes" },
  history: { fr: "Historique", en: "History" },
  addNote: { fr: "Ajouter au journal", en: "Add to log" },
  noLeads: { fr: "Aucun lead enregistré.", en: "No leads yet." },
  allStages: { fr: "Toutes les étapes", en: "All stages" },
  search: { fr: "Rechercher un contact", en: "Search a contact" },
  none: { fr: "Aucun", en: "None" },
  saved: { fr: "Enregistré", en: "Saved" },
  deleted: { fr: "Supprimé", en: "Deleted" },
  error: { fr: "Une erreur est survenue", en: "Something went wrong" },
  loading: { fr: "Chargement…", en: "Loading…" },

  stage_nouveau: { fr: "Nouveau", en: "New" },
  stage_contacte: { fr: "Contacté", en: "Contacted" },
  stage_repondu: { fr: "A répondu", en: "Replied" },
  stage_a_qualifier: { fr: "À qualifier", en: "To qualify" },
  stage_matche: { fr: "Produit matché", en: "Matched" },
  stage_en_negociation: { fr: "En négociation", en: "Negotiating" },
  stage_paye: { fr: "Payé", en: "Paid" },
  stage_perdu: { fr: "Perdu", en: "Lost" },
  stage_dormant: { fr: "Dormant", en: "Dormant" },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof dict | string) => string };

const I18nContext = createContext<Ctx>({ lang: "fr", setLang: () => {}, t: (k) => String(k) });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    const stored = window.localStorage.getItem("lang");
    if (stored === "fr" || stored === "en") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("lang", l);
  };

  const t = (k: string) => dict[k]?.[lang] ?? k;

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
