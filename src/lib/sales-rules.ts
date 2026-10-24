export function canSendFreeWhatsApp(lastInbound: string | null, now = Date.now()) {
  if (!lastInbound) return false;
  const elapsed = now - Date.parse(lastInbound);
  return elapsed >= 0 && elapsed < 24 * 60 * 60 * 1000;
}

export function canAutomate(status: string, optedOut: boolean) {
  return status === 'active' && !optedOut;
}

const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, ' ').replace(/\s+/g, ' ').trim();
const OPT_OUT_EXACT = new Set(['stop', 'stop.', 'stop !', 'arret', 'arretez', 'unsubscribe', 'desabonnement', 'non merci stop']);
const OPT_OUT_PHRASES = [
  /\b(arretez|arrete|cessez)\b.*\b(de )?(m|me|nous)?\s*(contacter|ecrire|envoyer|harceler|relancer)/,
  /ne (me |nous )?(contactez|contacte|ecrivez|ecris|envoyez|relancez) (plus|pas)/,
  /ne plus (me |nous )?(contacter|ecrire|envoyer|relancer)/,
  /\bdesabonn(e|ez|er|ement)\b/, /\bunsubscribe\b/, /\bstop (messages|sms|whatsapp|messaging)\b/,
  /(do not|don t|dont|never) (contact|message|text|write to) me/, /leave me alone|laissez( |-)moi tranquille|foutez( |-)moi la paix/,
  /supprimez (mon|mes) (numero|contact|donnees)/,
];

/** Détection déterministe d'une opposition : elle prime sur toute décision de l'IA. */
export function detectOptOut(message: string) {
  const text = normalize(message);
  return OPT_OUT_EXACT.has(text) || OPT_OUT_PHRASES.some(re => re.test(text));
}

/** Une publicité ne peut être publiée que si son contenu actuel a été validé (ou après un échec à relancer). */
export const canPublishCampaign = (status: string, approvedAt: string | null) => (status === 'approved' || status === 'failed') && !!approvedAt;
/** Statuts dans lesquels le contenu peut encore être modifié ou revalidé. */
export const EDITABLE_CAMPAIGN_STATUSES = ['draft', 'approved', 'rejected', 'failed'] as const;
