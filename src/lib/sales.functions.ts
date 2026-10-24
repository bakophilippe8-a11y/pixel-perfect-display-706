import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { GRAPH_URL } from './meta';
import { EDITABLE_CAMPAIGN_STATUSES } from './sales-rules';

const channel = z.enum(['telegram', 'whatsapp', 'meta', 'ai']);
export const getSalesSettings = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data, error } = await supabaseAdmin.from('seller_connections').select('id,channel,tested_at,test_error,enabled').eq('user_id', context.userId);
  if (error) throw error;
  const guidelines = await context.supabase.from('sales_guidelines').select('*').eq('user_id', context.userId).maybeSingle();
  if (guidelines.error) throw guidelines.error;
  return { connections: data, guidelines: guidelines.data };
});
export const saveSalesConnection = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ channel, token: z.string().trim().min(10).max(4096), identifier: z.string().trim().max(100).default(''), appSecret: z.string().trim().max(256).default(''), verifyToken: z.string().trim().max(256).default(''), pageId: z.string().trim().max(40).default('') }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.channel === 'ai') {
      // Clé API Google (Gemini) : aucun identifiant requis, juste la clé.
      const { encryptCredentials } = await import('./sales-crypto.server');
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const result = await supabaseAdmin.from('seller_connections').upsert({ user_id: context.userId, channel: 'ai', credentials_ciphertext: encryptCredentials({ token: data.token }, context.userId), tested_at: null, test_error: null, enabled: false }, { onConflict: 'user_id,channel' });
      if (result.error) throw result.error;
      const { resumeAi } = await import('./ai/pause');
      await resumeAi(supabaseAdmin as unknown as Parameters<typeof resumeAi>[0], context.userId);
      return { ok: true };
    }
    if (data.channel === 'telegram' && !/^\d{6,12}:[A-Za-z0-9_-]{30,}$/.test(data.token)) throw new Error('Format de jeton Telegram invalide (attendu : 123456789:AA…).');
    if (data.channel === 'meta' && data.pageId && !/^\d+$/.test(data.pageId)) throw new Error('L’identifiant de la Page Facebook doit être numérique.');
    const pageOnly = data.channel === 'meta' && !data.identifier && !!data.pageId;
    if (data.channel !== 'telegram' && !pageOnly && !/^\d+$/.test(data.identifier)) throw new Error('Renseignez l’identifiant numérique du numéro ou du compte publicitaire (ou, pour Meta, celui de votre Page).');
    if (data.channel === 'whatsapp' && (!data.appSecret || !data.verifyToken)) throw new Error('Le secret de l’application Meta et le jeton de vérification sont requis.');
    const { encryptCredentials } = await import('./sales-crypto.server');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const result = await supabaseAdmin.from('seller_connections').upsert({ user_id: context.userId, channel: data.channel, credentials_ciphertext: encryptCredentials({ token: data.token, identifier: data.identifier, appSecret: data.appSecret, verifyToken: data.verifyToken, pageId: data.pageId }, context.userId), tested_at: null, test_error: null, enabled: false }, { onConflict: 'user_id,channel' });
    if (result.error) throw result.error;
    return { ok: true };
  });
export const deleteSalesConnection = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ channel }).parse(input)).handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const result = await supabaseAdmin.from('seller_connections').delete().eq('user_id', context.userId).eq('channel', data.channel);
    if (result.error) throw result.error;
    return { ok: true };
  });
export const testSalesConnection = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ channel }).parse(input)).handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const saved = await supabaseAdmin.from('seller_connections').select('*').eq('user_id', context.userId).eq('channel', data.channel).single();
    if (saved.error) throw new Error('Enregistrez vos accès avant de les tester.');
    const { decryptCredentials } = await import('./sales-crypto.server');
    const credentials = decryptCredentials(saved.data.credentials_ciphertext, context.userId);
    if (data.channel === 'ai') {
      // Appel minimal côté serveur : liste des modèles. La clé n'est jamais renvoyée ni journalisée.
      const check = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'x-goog-api-key': credentials['token'] ?? '' } });
      const ok = check.ok;
      const message = ok ? null : check.status === 401 || check.status === 403 ? 'Google refuse cette clé. Vérifiez-la dans Google AI Studio.' : check.status === 429 ? 'Quota Google dépassé pour cette clé. Vérifiez votre compte Google AI Studio.' : 'Impossible de joindre Google. Réessayez dans un instant.';
      const updated = await supabaseAdmin.from('seller_connections').update({ tested_at: ok ? new Date().toISOString() : null, test_error: message, enabled: false }).eq('id', saved.data.id).eq('user_id', context.userId);
      if (updated.error) throw updated.error;
      if (ok) { const { resumeAi } = await import('./ai/pause'); await resumeAi(supabaseAdmin as unknown as Parameters<typeof resumeAi>[0], context.userId); }
      return { ok, message };
    }
    const response = data.channel === 'telegram'
      ? await fetch(`https://api.telegram.org/bot${credentials['token']}/getMe`, { method: 'POST' })
      : await fetch(`${GRAPH_URL}/${data.channel === 'meta' ? (credentials['identifier'] ? 'act_' + credentials['identifier'] : credentials['pageId']) : credentials['identifier']}?fields=id`, { headers: { Authorization: `Bearer ${credentials['token']}` } });
    const body = await response.json() as { ok?: boolean; error?: { message?: string }; description?: string };
    let ok = response.ok && body.ok !== false && !body.error;
    if (ok && data.channel === 'meta' && credentials['pageId']) {
      const page = await fetch(`${GRAPH_URL}/${credentials['pageId']}?fields=id`, { headers: { Authorization: `Bearer ${credentials['token']}` } });
      const pageBody = await page.json().catch(() => ({ error: {} })) as { error?: unknown };
      ok = page.ok && !pageBody.error;
    }
    const message = ok ? null : data.channel === 'telegram' ? 'Telegram refuse cet accès. Vérifiez le jeton du bot.' : 'Meta refuse cet accès. Vérifiez le jeton, l’identifiant et les autorisations.';
    const updated = await supabaseAdmin.from('seller_connections').update({ tested_at: ok ? new Date().toISOString() : null, test_error: message, enabled: false }).eq('id', saved.data.id).eq('user_id', context.userId);
    if (updated.error) throw updated.error;
    return { ok, message };
  });
export const saveSalesGuidelines = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ tone: z.string().max(2000), sales_info: z.string().max(10000), human_conditions: z.string().max(4000), daily_ai_limit: z.number().int().min(1).max(100000).default(300), daily_ads_limit: z.number().int().min(1).max(10000).default(30), daily_video_limit: z.number().int().min(1).max(1000).default(5) }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.from('sales_guidelines').upsert({ ...data, user_id: context.userId, updated_at: new Date().toISOString() });
    if (result.error) throw result.error;
    return { ok: true };
  });
export const createSalesConversation = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ name: z.string().trim().min(1).max(200) }).parse(input)).handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const result = await supabaseAdmin.from('sales_conversations').insert({ user_id: context.userId, channel: 'internal', contact_name: data.name, external_contact: crypto.randomUUID() }).select('id').single();
    if (result.error) throw result.error;
    return result.data;
  });
export const setSalesConversationStatus = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), status: z.enum(['active','human','closed']) }).parse(input)).handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const result = await supabaseAdmin.rpc('set_sales_mode', { owner_id: context.userId, conversation: data.id, next_status: data.status });
    if (result.error || !result.data) throw new Error('Impossible de changer le mode de cette conversation. Un contact opposé aux messages ne peut pas être réactivé.');
    return { ok: true };
  });
export const reviewSalesCampaign = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), approved: z.boolean() }).parse(input)).handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const result = await supabaseAdmin.from('sales_campaigns').update({ status: data.approved ? 'approved' : 'rejected', approved_at: data.approved ? new Date().toISOString() : null }).eq('id', data.id).eq('user_id', context.userId).in('status', [...EDITABLE_CAMPAIGN_STATUSES]);
    if (result.error) throw result.error;
    return { ok: true };
  });