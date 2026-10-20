import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const getConversations = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const result = await context.supabase.from('sales_conversations').select('*').order('updated_at', { ascending: false });
  if (result.error) throw new Error('Impossible de charger les conversations.');
  return result.data;
});

export const getConversationHistory = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const conversation = await context.supabase.from('sales_conversations').select('*').eq('id', data.id).single();
    if (conversation.error) throw new Error('Conversation introuvable.');
    // Page through the history rather than silently truncating at the Data API limit.
    const messages: import('@/integrations/supabase/types').Database['public']['Tables']['sales_messages']['Row'][] = [];
    for (let offset = 0; ; offset += 500) {
      const page = await context.supabase.from('sales_messages').select('*').eq('conversation_id', data.id).order('created_at').order('id').range(offset, offset + 499);
      if (page.error) throw new Error('Impossible de charger l’historique.');
      messages.push(...page.data);
      if (page.data.length < 500) break;
    }
    const views = await context.supabase.from('sales_product_views').select('product_id,viewed_at').eq('conversation_id', data.id).order('viewed_at', { ascending: false });
    if (views.error) throw new Error('Impossible de charger les produits consultés.');
    const ids = views.data.map(view => view.product_id);
    const products = ids.length ? await context.supabase.from('products').select('id,nom,prix,devise').in('id', ids) : { data: [], error: null };
    if (products.error) throw new Error('Impossible de charger les produits.');
    return { conversation: conversation.data, messages, products: products.data || [] };
  });

export const sendManualMessage = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), content: z.string().trim().min(1).max(4000), requestId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const conversation = await context.supabase.from('sales_conversations').select('*').eq('id', data.id).single();
    if (conversation.error) throw new Error('Conversation introuvable.');
    if (conversation.data.status === 'closed') throw new Error('Cette conversation est terminée.');
    if (conversation.data.opted_out) throw new Error('Ce contact a refusé les messages.');
    // No external receiver/transport is activated yet. Never simulate a provider send.
    if (conversation.data.channel !== 'internal') return { ok: false, error: 'L’envoi client attend l’activation de la réception et de l’envoi de ce canal dans Paramètres API.' };
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const mode = await db.rpc('set_sales_mode', { owner_id: context.userId, conversation: data.id, next_status: 'human' });
    if (mode.error || !mode.data) throw new Error('Impossible de suspendre l’IA.');
    const saved = await db.from('sales_messages').insert({ id: data.requestId, user_id: context.userId, conversation_id: data.id, content: data.content, direction: 'outbound', author: 'human', status: 'internal' });
    if (saved.error && saved.error.code !== '23505') throw new Error('Le message n’a pas pu être enregistré.');
    return { ok: true, error: null };
  });