import { GRAPH_URL } from './meta';

const REASONS: Record<number, string> = {
  190: 'Le jeton Facebook est invalide ou expiré. Générez un nouveau jeton de Page dans Paramètres API.',
  200: 'Autorisation manquante : le jeton doit avoir la permission pages_manage_posts sur cette Page.',
  10: 'Autorisation manquante : le jeton doit avoir la permission pages_manage_posts sur cette Page.',
  100: 'Facebook refuse la requête : vérifiez l’identifiant de la Page dans Paramètres API.',
  368: 'Facebook a temporairement bloqué la publication (politique anti-spam). Réessayez plus tard.',
  4: 'Limite de requêtes Facebook atteinte. Réessayez plus tard.',
};

export type PublishResult = { ok: true; postId: string } | { ok: false; message: string; unknownOutcome: boolean };

/** Publie un post texte sur une Page Facebook. N'engage aucun budget publicitaire. */
export async function publishPagePost(pageId: string, token: string, message: string): Promise<PublishResult> {
  let response: Response;
  try {
    response = await fetch(`${GRAPH_URL}/${pageId}/feed`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ message }),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    return { ok: false, unknownOutcome: true, message: 'Facebook n’a pas répondu à temps. Vérifiez votre Page avant de réessayer afin d’éviter un doublon.' };
  }
  const body = await response.json().catch(() => null) as { id?: string; error?: { code?: number; message?: string } } | null;
  if (response.ok && body?.id) return { ok: true, postId: body.id };
  console.error('[facebook-publish]', response.status, body?.error?.code, body?.error?.message);
  return { ok: false, unknownOutcome: false, message: REASONS[body?.error?.code ?? 0] ?? 'Facebook a refusé la publication. Vérifiez vos accès dans Paramètres API.' };
}

/** Publie une vidéo sur la Page (Facebook récupère le fichier via une URL signée temporaire). */
export async function publishPageVideo(pageId: string, token: string, fileUrl: string, description: string, title: string): Promise<PublishResult> {
  let response: Response;
  try {
    response = await fetch(`${GRAPH_URL}/${pageId}/videos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ file_url: fileUrl, description, title: title.slice(0, 200) }),
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    return { ok: false, unknownOutcome: true, message: 'Facebook n’a pas répondu à temps. Vérifiez votre Page avant de réessayer afin d’éviter un doublon.' };
  }
  const body = await response.json().catch(() => null) as { id?: string; error?: { code?: number; message?: string } } | null;
  if (response.ok && body?.id) return { ok: true, postId: body.id };
  console.error('[facebook-publish:video]', response.status, body?.error?.code, body?.error?.message);
  return { ok: false, unknownOutcome: false, message: REASONS[body?.error?.code ?? 0] ?? 'Facebook a refusé la vidéo. Vérifiez vos accès (permissions pages_manage_posts et pages_read_engagement) dans Paramètres API.' };
}
