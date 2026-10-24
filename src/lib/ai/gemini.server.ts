import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { SafeError } from './errors.server';

/**
 * Clé API Google (Gemini) du vendeur : stockée chiffrée dans seller_connections (canal 'ai'),
 * déchiffrée côté serveur uniquement, jamais renvoyée au navigateur ni journalisée.
 * Chaque vendeur paie Google directement ; aucun appel IA ne passe par une passerelle tierce.
 */
export async function getSellerGeminiKey(userId: string): Promise<string> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const saved = await supabaseAdmin.from('seller_connections').select('credentials_ciphertext').eq('user_id', userId).eq('channel', 'ai').maybeSingle();
  if (saved.error) throw new SafeError('Impossible de lire votre clé IA.');
  if (!saved.data) throw new SafeError('Aucune clé IA enregistrée. Ajoutez votre clé API Google (Gemini) dans Paramètres API, section « Clé IA ».');
  const { decryptCredentials } = await import('../sales-crypto.server');
  try {
    const credentials = decryptCredentials(saved.data.credentials_ciphertext, userId);
    if (!credentials['token']) throw new Error('missing');
    return credentials['token'];
  } catch {
    throw new SafeError('Votre clé IA est illisible. Enregistrez-la à nouveau dans Paramètres API.');
  }
}

/** Fournisseur Gemini configuré avec la clé du vendeur. */
export function sellerGoogle(apiKey: string) {
  return createGoogleGenerativeAI({ apiKey });
}

/** Modèle texte Gemini rapide par défaut, configurable par variable d'environnement. */
export const textModel = (envName: string) => process.env[envName] || 'gemini-3.8-flash';
