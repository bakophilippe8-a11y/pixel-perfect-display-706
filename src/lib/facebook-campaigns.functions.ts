import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { campaignDraft, campaignReview } from './facebook-campaign-rules';

const content = z.object({ title: z.string().trim().min(1).max(200), facebook_copy: z.string().trim().min(1).max(4000), voiceover_script: z.string().max(4000) });
export const getFacebookCampaigns = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [campaigns, products, guidelines] = await Promise.all([
    context.supabase.from('sales_campaigns').select('*').eq('user_id', context.userId).order('created_at', { ascending: false }),
    context.supabase.from('products').select('id,nom').eq('user_id', context.userId).eq('statut', 'actif').order('nom'),
    context.supabase.from('sales_guidelines').select('ai_paused,pause_reason').eq('user_id', context.userId).maybeSingle(),
  ]);
  if (campaigns.error || products.error || guidelines.error) throw new Error('Impossible de charger vos publicités.');
  return { campaigns: campaigns.data ?? [], products: products.data ?? [], paused: guidelines.data?.ai_paused ?? false, pauseReason: guidelines.data?.pause_reason ?? null };
});

export const generateFacebookCampaign = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ idea: z.string().trim().min(1).max(10000), productId: z.string().uuid().nullable(), language: z.enum(['fr', 'en']) }).parse(input))
  .handler(async ({ data, context }) => {
    const guidelines = await context.supabase.from('sales_guidelines').select('*').eq('user_id', context.userId).maybeSingle();
    if (guidelines.error) throw new Error('Impossible de lire vos consignes.');
    if (guidelines.data?.ai_paused) throw new Error(guidelines.data.pause_reason || 'La génération IA est suspendue.');
    let query = context.supabase.from('products').select('nom,prix,devise,argument_cle,lien_maketou').eq('user_id', context.userId).eq('statut', 'actif');
    if (data.productId) query = query.eq('id', data.productId);
    const products = await query;
    if (products.error || (data.productId && !products.data?.length)) throw new Error('Produit indisponible.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    try {
      const { generateFacebookDraft } = await import('./facebook-campaign-ai.server');
      const draft = await generateFacebookDraft(data.idea, data.language, products.data, guidelines.data, getRequest().signal);
      const saved = await supabaseAdmin.from('sales_campaigns').insert({ user_id: context.userId, ...campaignDraft(draft.title, draft.facebook_copy, draft.voiceover_script) }).select('id').single();
      if (saved.error) throw new Error('Impossible d’enregistrer la publicité.');
      return saved.data;
    } catch (error) {
      const failure = error as { statusCode?: number; responseBody?: string; message?: string };
      let message = failure.statusCode === 401 ? 'La génération IA nécessite une configuration valide.' : failure.message || 'La génération a échoué.';
      if (failure.responseBody) { try { const parsed = JSON.parse(failure.responseBody); message = parsed.message || parsed.error?.message || message; } catch { /* keep safe message */ } }
      if ([402, 403, 404].includes(failure.statusCode ?? 0)) await supabaseAdmin.from('sales_guidelines').upsert({ user_id: context.userId, ai_paused: true, pause_reason: message });
      throw new Error(message);
    }
  });

export const generateConversationScript = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ conversationId: z.string().uuid(), language: z.enum(['fr', 'en']) }).parse(input))
  .handler(async ({ data, context }) => {
    const [conversation, guidelines] = await Promise.all([
      context.supabase.from('sales_conversations').select('*').eq('id', data.conversationId).eq('user_id', context.userId).single(),
      context.supabase.from('sales_guidelines').select('*').eq('user_id', context.userId).maybeSingle(),
    ]);
    if (conversation.error) throw new Error('Conversation introuvable.');
    if (guidelines.error) throw new Error('Impossible de lire vos consignes.');
    if (guidelines.data?.ai_paused) throw new Error(guidelines.data.pause_reason || 'La génération IA est suspendue.');
    const [messages, views] = await Promise.all([
      context.supabase.from('sales_messages').select('author,content,created_at').eq('conversation_id', data.conversationId).order('created_at', { ascending: false }).limit(50),
      context.supabase.from('sales_product_views').select('product_id').eq('conversation_id', data.conversationId),
    ]);
    if (messages.error || views.error) throw new Error('Impossible de lire la conversation.');
    const ids = views.data.map(v => v.product_id);
    const products = ids.length
      ? await context.supabase.from('products').select('nom,prix,devise,argument_cle').eq('user_id', context.userId).in('id', ids)
      : await context.supabase.from('products').select('nom,prix,devise,argument_cle').eq('user_id', context.userId).eq('statut', 'actif');
    if (products.error) throw new Error('Impossible de charger vos produits.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    try {
      const { buildScriptContext } = await import('./script-context');
      const { generateClaudeVideoScript } = await import('./ai/claude-script.server');
      const scriptContext = buildScriptContext({
        contactStatus: conversation.data.contact_status,
        channel: conversation.data.channel,
        messages: [...(messages.data ?? [])].reverse(),
        products: products.data ?? [],
        guidelines: guidelines.data ? { tone: guidelines.data.tone, sales_info: guidelines.data.sales_info } : null,
      });
      const draft = await generateClaudeVideoScript(scriptContext, data.language, getRequest().signal);
      const saved = await supabaseAdmin.from('sales_campaigns').insert({ user_id: context.userId, ...campaignDraft(draft.title, draft.facebook_copy, draft.voiceover_script) }).select('id').single();
      if (saved.error) throw new Error('Impossible d’enregistrer le brouillon.');
      return saved.data;
    } catch (error) {
      const failure = error as { statusCode?: number; responseBody?: string; message?: string };
      let message = failure.statusCode === 401 ? 'La génération IA nécessite une configuration valide.' : failure.message || 'La génération a échoué.';
      if (failure.responseBody) { try { const parsed = JSON.parse(failure.responseBody); message = parsed.message || parsed.error?.message || message; } catch { /* keep safe message */ } }
      if ([402, 403, 404].includes(failure.statusCode ?? 0)) await supabaseAdmin.from('sales_guidelines').upsert({ user_id: context.userId, ai_paused: true, pause_reason: message });
      throw new Error(message);
    }
  });

export const saveFacebookCampaign = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input) => content.extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const saved = await supabaseAdmin.from('sales_campaigns').update(campaignDraft(data.title, data.facebook_copy, data.voiceover_script)).eq('id', data.id).eq('user_id', context.userId).select('id').single();
    if (saved.error) throw new Error('Impossible d’enregistrer cette publicité.');
    return { ok: true };
  });

export const reviewFacebookCampaign = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input) => content.extend({ id: z.string().uuid(), approved: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const saved = await supabaseAdmin.from('sales_campaigns').update(campaignReview(data.approved, new Date().toISOString())).eq('id', data.id).eq('user_id', context.userId).eq('title', data.title).eq('facebook_copy', data.facebook_copy).eq('voiceover_script', data.voiceover_script).select('id').single();
    if (saved.error) throw new Error('La publicité a changé ou n’est plus disponible. Actualisez avant de la valider.');
    return { ok: true };
  });