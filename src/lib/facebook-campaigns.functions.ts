import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { campaignDraft, campaignReview } from './facebook-campaign-rules';
import { classifyAiFailure, SafeError, shouldPauseAi } from './ai/errors.server';
import { campaignQuotaExceeded, videoQuotaExceeded } from './ai/quota.server';
import { canPublishCampaign, EDITABLE_CAMPAIGN_STATUSES } from './sales-rules';
import { VIDEO_PROMPT_MAX } from './video-prompt';

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
    if (await campaignQuotaExceeded(supabaseAdmin, context.userId, guidelines.data?.daily_ads_limit)) throw new Error('Plafond quotidien de brouillons IA atteint. Réessayez demain.');
    try {
      const { generateFacebookDraft } = await import('./facebook-campaign-ai.server');
      const draft = await generateFacebookDraft(context.userId, data.idea, data.language, products.data, guidelines.data, getRequest().signal);
      const saved = await supabaseAdmin.from('sales_campaigns').insert({ user_id: context.userId, ...campaignDraft(draft.title, draft.facebook_copy, draft.voiceover_script) }).select('id').single();
      if (saved.error) throw new SafeError('Impossible d’enregistrer la publicité.');
      return saved.data;
    } catch (error) {
      const { status, message } = classifyAiFailure(error);
      if (shouldPauseAi(status)) await supabaseAdmin.from('sales_guidelines').upsert({ user_id: context.userId, ai_paused: true, pause_reason: message });
      throw new SafeError(message);
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
    if (await campaignQuotaExceeded(supabaseAdmin, context.userId, guidelines.data?.daily_ads_limit)) throw new Error('Plafond quotidien de brouillons IA atteint. Réessayez demain.');
    try {
      const { buildScriptContext } = await import('./script-context');
      const { generateConversationVideoScript } = await import('./ai/claude-script.server');
      const scriptContext = buildScriptContext({
        contactStatus: conversation.data.contact_status,
        channel: conversation.data.channel,
        messages: [...(messages.data ?? [])].reverse(),
        products: products.data ?? [],
        guidelines: guidelines.data ? { tone: guidelines.data.tone, sales_info: guidelines.data.sales_info } : null,
      });
      const draft = await generateConversationVideoScript(context.userId, scriptContext, data.language, getRequest().signal);
      const saved = await supabaseAdmin.from('sales_campaigns').insert({ user_id: context.userId, ...campaignDraft(draft.title, draft.facebook_copy, draft.voiceover_script) }).select('id').single();
      if (saved.error) throw new SafeError('Impossible d’enregistrer le brouillon.');
      return saved.data;
    } catch (error) {
      const { status, message } = classifyAiFailure(error);
      if (shouldPauseAi(status)) await supabaseAdmin.from('sales_guidelines').upsert({ user_id: context.userId, ai_paused: true, pause_reason: message });
      throw new SafeError(message);
    }
  });

export const saveFacebookCampaign = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input) => content.extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const saved = await supabaseAdmin.from('sales_campaigns').update(campaignDraft(data.title, data.facebook_copy, data.voiceover_script)).eq('id', data.id).eq('user_id', context.userId).in('status', [...EDITABLE_CAMPAIGN_STATUSES]).select('id').single();
    if (saved.error) throw new Error('Cette publicité ne peut plus être modifiée (déjà publiée ou en cours de publication).');
    return { ok: true };
  });

export const reviewFacebookCampaign = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input) => content.extend({ id: z.string().uuid(), approved: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const saved = await supabaseAdmin.from('sales_campaigns').update(campaignReview(data.approved, new Date().toISOString())).eq('id', data.id).eq('user_id', context.userId).eq('title', data.title).eq('facebook_copy', data.facebook_copy).eq('voiceover_script', data.voiceover_script).in('status', [...EDITABLE_CAMPAIGN_STATUSES]).neq('video_status', 'generating').select('id').single();
    if (saved.error) throw new Error('La publicité a changé ou n’est plus disponible. Actualisez avant de la valider.');
    return { ok: true };
  });

export const publishFacebookCampaign = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), facebook_copy: z.string().trim().min(1).max(4000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const connection = await supabaseAdmin.from('seller_connections').select('credentials_ciphertext').eq('user_id', context.userId).eq('channel', 'meta').maybeSingle();
    if (connection.error) throw new Error('Impossible de lire votre connexion Facebook.');
    if (!connection.data) throw new Error('Connectez votre Page Facebook dans Paramètres API avant de publier.');
    const { decryptCredentials } = await import('./sales-crypto.server');
    let credentials: Record<string, string>;
    try { credentials = decryptCredentials(connection.data.credentials_ciphertext, context.userId); } catch { throw new Error('Vos accès Facebook sont illisibles. Enregistrez-les à nouveau dans Paramètres API.'); }
    if (!credentials['pageId'] || !credentials['token']) throw new Error('Renseignez l’identifiant de votre Page Facebook dans Paramètres API (section Meta) avant de publier.');

    const today = await supabaseAdmin.from('sales_campaigns').select('id', { count: 'exact', head: true }).eq('user_id', context.userId).eq('status', 'published').gte('published_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString());
    if (today.error) throw new Error('Impossible de vérifier votre quota de publication.');
    if ((today.count ?? 0) >= (Number(process.env['PUBLISH_DAILY_LIMIT']) || 10)) throw new Error('Plafond quotidien de publications atteint. Réessayez demain.');

    // Réservation atomique : une seule publication possible, et uniquement du texte exactement validé.
    const claim = await supabaseAdmin.from('sales_campaigns').update({ status: 'publishing', publish_error: null }).eq('id', data.id).eq('user_id', context.userId).eq('facebook_copy', data.facebook_copy).in('status', ['approved', 'failed']).not('approved_at', 'is', null).neq('video_status', 'generating').select('status,approved_at,title,video_status,video_path').maybeSingle();
    if (claim.error || !claim.data || !canPublishCampaign('approved', claim.data.approved_at)) throw new Error('Cette publicité doit être validée dans sa version actuelle avant d’être publiée.');

    const publisher = await import('./facebook-publish.server');
    let result: Awaited<ReturnType<typeof publisher.publishPagePost>>;
    if (claim.data.video_status === 'ready' && claim.data.video_path) {
      const signed = await supabaseAdmin.storage.from('campaign-videos').createSignedUrl(claim.data.video_path, 7200);
      if (signed.error || !signed.data) {
        await supabaseAdmin.from('sales_campaigns').update({ status: 'failed', publish_error: 'Vidéo introuvable : régénérez-la puis revalidez la publicité.' }).eq('id', data.id).eq('user_id', context.userId);
        throw new Error('Vidéo introuvable : régénérez-la puis revalidez la publicité.');
      }
      result = await publisher.publishPageVideo(credentials['pageId'], credentials['token'], signed.data.signedUrl, data.facebook_copy, claim.data.title);
    } else {
      result = await publisher.publishPagePost(credentials['pageId'], credentials['token'], data.facebook_copy);
    }
    if (result.ok) {
      const done = await supabaseAdmin.from('sales_campaigns').update({ status: 'published', published_at: new Date().toISOString(), facebook_post_id: result.postId, publish_error: null }).eq('id', data.id).eq('user_id', context.userId);
      if (done.error) console.error('[facebook-publish] publiée mais statut non enregistré', data.id, result.postId);
      return { ok: true, postId: result.postId, video: claim.data.video_status === 'ready' };
    }
    await supabaseAdmin.from('sales_campaigns').update({ status: 'failed', publish_error: result.message }).eq('id', data.id).eq('user_id', context.userId);
    throw new Error(result.message);
  });


const VIDEO_TIMEOUT_MS = 15 * 60 * 1000;
const failVideo = (admin: Awaited<typeof import('@/integrations/supabase/client.server')>['supabaseAdmin'], userId: string, id: string, message: string) =>
  admin.from('sales_campaigns').update({ video_status: 'failed', video_error: message }).eq('id', id).eq('user_id', userId).eq('video_status', 'generating');

export const startCampaignVideo = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), prompt: z.string().trim().min(10).max(VIDEO_PROMPT_MAX) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const guidelines = await supabaseAdmin.from('sales_guidelines').select('ai_paused,pause_reason,daily_video_limit').eq('user_id', context.userId).maybeSingle();
    if (guidelines.error) throw new Error('Impossible de lire vos consignes.');
    if (guidelines.data?.ai_paused) throw new Error(guidelines.data.pause_reason || 'La génération IA est suspendue.');
    if (await videoQuotaExceeded(supabaseAdmin, context.userId, guidelines.data?.daily_video_limit)) throw new Error('Plafond quotidien de vidéos atteint. Réessayez demain.');
    // Réservation atomique ; relancer une vidéo révoque la validation (la vidéo fait partie du contenu validé).
    const claim = await supabaseAdmin.from('sales_campaigns').update({ video_status: 'generating', video_error: null, video_job_id: null, video_started_at: new Date().toISOString(), status: 'draft', approved_at: null, publish_error: null }).eq('id', data.id).eq('user_id', context.userId).in('status', [...EDITABLE_CAMPAIGN_STATUSES]).neq('video_status', 'generating').select('id').maybeSingle();
    if (claim.error || !claim.data) throw new Error('Cette publicité ne peut pas recevoir de vidéo (déjà publiée, ou génération déjà en cours).');
    try {
      const { getSellerGeminiKey } = await import('./ai/gemini.server');
      const { submitCampaignVideo } = await import('./campaign-video.server');
      const job = await submitCampaignVideo(data.prompt, await getSellerGeminiKey(context.userId));
      await supabaseAdmin.from('sales_campaigns').update({ video_job_id: job.jobId, video_model: job.model }).eq('id', data.id).eq('user_id', context.userId);
      return { ok: true };
    } catch (error) {
      const { status, message } = classifyAiFailure(error);
      await failVideo(supabaseAdmin, context.userId, data.id, message);
      if (shouldPauseAi(status)) await supabaseAdmin.from('sales_guidelines').upsert({ user_id: context.userId, ai_paused: true, pause_reason: message });
      throw new SafeError(message);
    }
  });

/** Avance un job vidéo : à appeler périodiquement tant que video_status = 'generating'. */
export const checkCampaignVideo = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const row = await supabaseAdmin.from('sales_campaigns').select('video_status,video_job_id,video_started_at,video_path,video_error').eq('id', data.id).eq('user_id', context.userId).single();
    if (row.error) throw new Error('Publicité introuvable.');
    if (row.data.video_status !== 'generating') return { status: row.data.video_status, error: row.data.video_error };
    const started = row.data.video_started_at ? Date.parse(row.data.video_started_at) : Date.now();
    if (Date.now() - started > VIDEO_TIMEOUT_MS) { await failVideo(supabaseAdmin, context.userId, data.id, 'La génération a dépassé 15 minutes. Aucun crédit n’est facturé tant que la vidéo n’est pas terminée : relancez-la.'); return { status: 'failed', error: 'Délai dépassé.' }; }
    if (!row.data.video_job_id) return { status: 'generating', error: null };
    try {
      const { getSellerGeminiKey } = await import('./ai/gemini.server');
      const apiKey = await getSellerGeminiKey(context.userId);
      const { pollCampaignVideo, downloadCampaignVideo } = await import('./campaign-video.server');
      const job = await pollCampaignVideo(row.data.video_job_id, apiKey);
      if (job.status === 'failed') {
        console.error('[video] job échoué', data.id, job.error);
        await failVideo(supabaseAdmin, context.userId, data.id, 'La vidéo n’a pas pu être générée (contenu refusé ou incident du service). Modifiez le prompt puis réessayez.');
        return { status: 'failed', error: 'Échec de génération.' };
      }
      if (job.status !== 'completed') return { status: 'generating', error: null, progress: job.progress ?? null };
      // Copie durable : une vidéo fournie par adresse est temporaire et exige la clé du vendeur.
      let bytes: ArrayBuffer;
      if (job.data) {
        bytes = job.data.buffer.slice(job.data.byteOffset, job.data.byteOffset + job.data.byteLength) as ArrayBuffer;
      } else if (job.url) {
        const file = await downloadCampaignVideo(job.url, apiKey);
        const size = Number(file.headers.get('content-length') ?? 0);
        if (!file.ok || size > 100 * 1024 * 1024) throw new SafeError('Impossible de récupérer la vidéo générée.');
        bytes = await file.arrayBuffer();
      } else {
        throw new SafeError('Impossible de récupérer la vidéo générée.');
      }
      if (bytes.byteLength > 100 * 1024 * 1024) throw new SafeError('La vidéo générée dépasse la taille autorisée.');
      const path = `${context.userId}/${data.id}-${crypto.randomUUID()}.mp4`;
      const stored = await supabaseAdmin.storage.from('campaign-videos').upload(path, bytes, { contentType: 'video/mp4', upsert: false });
      if (stored.error) { console.error('[video] stockage', stored.error.message); throw new SafeError('Impossible d’enregistrer la vidéo générée.'); }
      const done = await supabaseAdmin.from('sales_campaigns').update({ video_status: 'ready', video_path: path, video_error: null }).eq('id', data.id).eq('user_id', context.userId).eq('video_status', 'generating').select('id').maybeSingle();
      if (!done.data) { await supabaseAdmin.storage.from('campaign-videos').remove([path]); return { status: 'ready', error: null }; }
      if (row.data.video_path) await supabaseAdmin.storage.from('campaign-videos').remove([row.data.video_path]);
      return { status: 'ready', error: null };
    } catch (error) {
      const { message } = classifyAiFailure(error);
      await failVideo(supabaseAdmin, context.userId, data.id, message);
      return { status: 'failed', error: message };
    }
  });

export const getCampaignVideoUrl = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const row = await context.supabase.from('sales_campaigns').select('video_path').eq('id', data.id).eq('user_id', context.userId).single();
    if (row.error || !row.data.video_path) throw new Error('Aucune vidéo disponible.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const signed = await supabaseAdmin.storage.from('campaign-videos').createSignedUrl(row.data.video_path, 3600);
    if (signed.error || !signed.data) throw new Error('Impossible de charger la vidéo.');
    return { url: signed.data.signedUrl };
  });
