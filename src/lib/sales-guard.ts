// Garde-fou déterministe : une réponse IA ne peut citer que des prix, liens et conditions connus.
export type GuardProduct = { nom?: string | null; prix: number | string | null; devise?: string | null; lien_maketou?: string | null };

const CURRENCY = '(?:fcfa|f\\s?cfa|xof|cfa|francs?|€|eur|euros?|usd|\\$|dollars?|mad|dh|dirhams?)';
const AMOUNT = '\\d{1,3}(?:[\\s\\u00a0\\u202f.,]\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d+)?';
const AFTER = new RegExp(`(${AMOUNT})\\s*${CURRENCY}(?![a-z])`, 'gi');
const BEFORE = new RegExp(`(?:€|\\$)\\s*(${AMOUNT})`, 'gi');
const PERCENT = /\d+(?:[.,]\d+)?\s*%/g;
const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const PAYMENT_CLAIM = /(paiement|payment)\s+(bien\s+)?(re[çc]u|confirm[ée]|received|confirmed)|commande\s+confirm[ée]e|order\s+confirmed|vous avez bien pay[ée]/i;

export function parseAmount(raw: string) {
  const s = raw.replace(/[\s\u00a0\u202f]/g, '');
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ''));
  const grouped = /^(\d{1,3}(?:[.,]\d{3})+)[.,](\d{1,2})$/.exec(s);
  if (grouped) return Number(grouped[1]!.replace(/[.,]/g, '') + '.' + grouped[2]);
  return Number(s.replace(',', '.'));
}

export function extractAmounts(text: string) {
  const found: number[] = [];
  for (const re of [AFTER, BEFORE]) { re.lastIndex = 0; for (const m of text.matchAll(re)) { const value = parseAmount(m[1]!); if (Number.isFinite(value)) found.push(value); } }
  return found;
}

const normalizeUrl = (url: string) => url.replace(/[.,;:!?]+$/, '').replace(/\/+$/, '').toLowerCase();
const normalizePercent = (value: string) => value.replace(/\s+/g, '').replace(',', '.');

export function validateSalesMessage(message: string, products: GuardProduct[], salesInfo = '') {
  const violations: string[] = [];
  const prices = new Set<number>(products.map(p => Number(p.prix)).filter(Number.isFinite));
  for (const value of extractAmounts(salesInfo)) prices.add(value);
  for (const amount of extractAmounts(message)) if (![...prices].some(price => Math.abs(price - amount) < 0.005)) { violations.push(`montant non référencé (${amount})`); break; }

  const links = new Set(products.map(p => p.lien_maketou?.trim()).filter(Boolean).map(l => normalizeUrl(l!)));
  for (const url of (salesInfo.match(URL_RE) ?? [])) links.add(normalizeUrl(url));
  for (const url of (message.match(URL_RE) ?? [])) if (!links.has(normalizeUrl(url))) { violations.push('lien non référencé'); break; }

  const allowedPercents = new Set((salesInfo.match(PERCENT) ?? []).map(normalizePercent));
  for (const percent of (message.match(PERCENT) ?? [])) if (!allowedPercents.has(normalizePercent(percent))) { violations.push(`remise non référencée (${percent.trim()})`); break; }

  if (PAYMENT_CLAIM.test(message)) violations.push('confirmation de paiement ou de commande non vérifiable');
  return { ok: violations.length === 0, violations };
}
