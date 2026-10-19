import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const channel = z.enum(['telegram', 'whatsapp', 'meta']);
export const getSalesSettings = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data, error } = await supabaseAdmin.from('seller_connections').select('id,channel,tested_at,test_error,enabled').eq('user_id', context.userId);
  if (error) throw error;
  const guidelines = await context.supabase.from('sales_guidelines').select('*').eq('user_id', context.userId).maybeSingle();
  if (guidelines.error) throw guidelines.error;
  return { connections: data, guidelines: guidelines.data };
});
export const saveSalesConnection = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ channel, token: z.string().trim().min(10).max(4096), identifier: z.string().trim().max(100).default(''), appSecret: z.string().trim().max(256).default(''), verifyToken: z.string().trim().max(256).default('') }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.channel !== 'telegram' && !/^\d+$/.test(data.identifier)) throw new Error('Renseignez l’identifiant numérique du numéro ou du compte publicitaire.');
    if (data.channel === 'whatsapp' && (!data.appSecret || !data.verifyToken)) throw new Error('Le secret de l’application Meta et le jeton de vérification sont requis.');
    const { encryptCredentials } = await import('./sales-crypto.server');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const result = await supabaseAdmin.from('seller_connections').upsert({ user_id: context.userId, channel: data.channel, credentials_ciphertext: encryptCredentials({ token: data.token, identifier: data.identifier, appSecret: data.appSecret, verifyToken: data.verifyToken }, context.userId), tested_at: null, test_error: null, enabled: false }, { onConflict: 'user_id,channel' });
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
    const response = data.channel === 'telegram'
      ? await fetch(`https://api.telegram.org/bot${credentials.token}/getMe`, { method: 'POST' })
      : await fetch(`https://graph.facebook.com/v25.0/${data.channel === 'meta' ? 'act_' : ''}${credentials.identifier}?fields=id`, { headers: { Authorization: `Bearer ${credentials.token}` } });
    const body = await response.json() as { ok?: boolean; error?: { message?: string }; description?: string };
    const ok = response.ok && body.ok !== false && !body.error;
    const message = ok ? null : data.channel === 'telegram' ? 'Telegram refuse cet accès. Vérifiez le jeton du bot.' : 'Meta refuse cet accès. Vérifiez le jeton, l’identifiant et les autorisations.';
    const updated = await supabaseAdmin.from('seller_connections').update({ tested_at: ok ? new Date().toISOString() : null, test_error: message, enabled: false }).eq('id', saved.data.id).eq('user_id', context.userId);
    if (updated.error) throw updated.error;
    return { ok, message };
  });
export const saveSalesGuidelines = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ tone: z.string().max(2000), sales_info: z.string().max(10000), human_conditions: z.string().max(4000) }).parse(input))
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
    const result = await supabaseAdmin.from('sales_conversations').update({ status: data.status }).eq('id', data.id).eq('user_id', context.userId);
    if (result.error) throw result.error;
    return { ok: true };
  });
export const reviewSalesCampaign = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), approved: z.boolean() }).parse(input)).handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const result = await supabaseAdmin.from('sales_campaigns').update({ status: data.approved ? 'approved' : 'rejected', approved_at: data.approved ? new Date().toISOString() : null }).eq('id', data.id).eq('user_id', context.userId);
    if (result.error) throw result.error;
    return { ok: true };
  });