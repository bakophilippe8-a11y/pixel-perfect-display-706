import type { supabaseAdmin } from '@/integrations/supabase/client.server';

type Db = typeof supabaseAdmin;
const since = () => new Date(Date.now() - 24 * 3600 * 1000).toISOString();

/** Plafonds quotidiens : réglages du vendeur (sales_guidelines), avec valeurs par défaut raisonnables. */
export const DEFAULT_DAILY_AI_LIMIT = 300;
export const DEFAULT_DAILY_ADS_LIMIT = 30;
export const DEFAULT_DAILY_VIDEO_LIMIT = 5;

const sane = (value: unknown, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

/** Plafond glissant sur 24 h pour protéger le budget IA du vendeur (il paie Google directement). */
export async function decisionQuotaExceeded(db: Db, userId: string, dailyLimit?: number) {
  const result = await db.from('sales_messages').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('direction', 'inbound').eq('author', 'client').gte('created_at', since());
  if (result.error) throw result.error;
  return (result.count ?? 0) >= sane(dailyLimit, DEFAULT_DAILY_AI_LIMIT);
}

export async function campaignQuotaExceeded(db: Db, userId: string, dailyLimit?: number) {
  const result = await db.from('sales_campaigns').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', since());
  if (result.error) throw result.error;
  return (result.count ?? 0) >= sane(dailyLimit, DEFAULT_DAILY_ADS_LIMIT);
}

export async function videoQuotaExceeded(db: Db, userId: string, dailyLimit?: number) {
  const result = await db.from('sales_campaigns').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('video_started_at', since());
  if (result.error) throw result.error;
  return (result.count ?? 0) >= sane(dailyLimit, DEFAULT_DAILY_VIDEO_LIMIT);
}
