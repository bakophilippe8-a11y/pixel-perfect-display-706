/**
 * Vidéo de campagne via Gemini Omni Flash (API Interactions de Gemini), avec la clé API Google du vendeur :
 * la génération est facturée par Google directement sur le compte du vendeur.
 * Les modèles Veo 3.1 en préversion ont été arrêtés par Google le 22 octobre 2026.
 * Flux : lancement en arrière-plan (background=true) puis interrogation de l'interaction.
 * Source : https://ai.google.dev/gemini-api/docs/omni et /background-execution
 */
const API = 'https://generativelanguage.googleapis.com/v1beta';
const API_REVISION = '2026-05-20';
const model = () => process.env['VIDEO_MODEL'] || 'gemini-omni-1.1-flash';

type GoogleError = { error?: { code?: number; message?: string; status?: string } };

async function googleError(response: Response): Promise<never> {
  const body = await response.json().catch(() => ({})) as GoogleError;
  const status = body.error?.code ?? response.status;
  const error = new Error(`Google Omni: ${body.error?.status ?? response.status} ${body.error?.message ?? ''}`.trim());
  (error as Error & { statusCode: number }).statusCode = status;
  throw error;
}

const headers = (apiKey: string) => ({ 'Content-Type': 'application/json', 'x-goog-api-key': apiKey, 'Api-Revision': API_REVISION });

/** Lance une génération vidéo en arrière-plan (clip vertical 9:16, 720p). Facturé par Google au compte du vendeur. */
export async function submitCampaignVideo(prompt: string, apiKey: string) {
  const response = await fetch(`${API}/interactions`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({
      model: model(),
      input: prompt,
      background: true,
      response_format: { type: 'video', aspect_ratio: '9:16', resolution: '720p' },
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) await googleError(response);
  const interaction = await response.json() as { id?: string };
  if (!interaction.id) throw new Error('Google Omni: interaction sans identifiant.');
  return { jobId: interaction.id, model: model() };
}

export type VideoJob =
  | { status: 'generating'; progress?: number }
  | { status: 'failed'; error?: string }
  | { status: 'completed'; data?: Uint8Array; url?: string };

type VideoPart = { type?: string; mime_type?: string; data?: string; uri?: string };
type Interaction = {
  status?: string;
  error?: { code?: number; message?: string };
  steps?: { type?: string; content?: VideoPart[] }[];
  outputs?: VideoPart[];
  output_video?: VideoPart;
};

/** Cherche la vidéo générée : contenu "video" d'une étape de sortie, avec repli sur les champs de commodité. */
export function extractVideo(interaction: Interaction): VideoPart | undefined {
  const fromSteps = (interaction.steps ?? []).flatMap(step => step.content ?? []).find(part => part.type === 'video' && (part.data || part.uri));
  return fromSteps ?? (interaction.outputs ?? []).find(part => part.type === 'video' && (part.data || part.uri)) ?? (interaction.output_video?.data || interaction.output_video?.uri ? interaction.output_video : undefined);
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Interroge l'interaction. La lecture renvoie la vidéo en base64 (ou une URI à télécharger avec la clé du vendeur). */
export async function pollCampaignVideo(jobId: string, apiKey: string): Promise<VideoJob> {
  const response = await fetch(`${API}/interactions/${encodeURIComponent(jobId)}`, { headers: headers(apiKey), signal: AbortSignal.timeout(60000) });
  if (!response.ok) await googleError(response);
  const interaction = await response.json() as Interaction;
  const status = interaction.status ?? 'in_progress';
  if (status === 'in_progress' || status === 'queued') return { status: 'generating' };
  if (status !== 'completed') return { status: 'failed', error: interaction.error?.message ?? `Interaction ${status}.` };
  const video = extractVideo(interaction);
  if (!video) return { status: 'failed', error: 'Vidéo filtrée ou absente de la réponse.' };
  if (video.data) return { status: 'completed', data: decodeBase64(video.data) };
  if (!video.uri) return { status: 'failed', error: 'Vidéo filtrée ou absente de la réponse.' };
  return { status: 'completed', url: video.uri };
}

/** N'accepte que des URL https sur googleapis.com (ou un sous-domaine) avant d'y envoyer la clé. */
export function isTrustedGoogleVideoUrl(url: string) {
  try {
    const { protocol, hostname } = new URL(url);
    const host = hostname.toLowerCase();
    return protocol === 'https:' && (host === 'googleapis.com' || host.endsWith('.googleapis.com'));
  } catch { return false; }
}

/** Télécharge la vidéo générée (l'URL Google exige la clé API du vendeur). */
export async function downloadCampaignVideo(url: string, apiKey: string) {
  if (!isTrustedGoogleVideoUrl(url)) throw new Error('Adresse de la vidéo refusée : domaine non Google, la clé IA n’est pas envoyée.');
  const file = await fetch(url, { headers: { 'x-goog-api-key': apiKey }, signal: AbortSignal.timeout(60000) });
  if (!file.ok) await googleError(file);
  return file;
}
