/** Erreur dont le message est destiné à l'utilisateur (aucune donnée interne). */
export class SafeError extends Error {
  constructor(message: string) { super(message); this.name = 'SafeError'; }
}

const MESSAGES: Record<number, string> = {
  400: 'La requête IA a été refusée. Réessayez avec un contenu différent.',
  401: 'Clé IA invalide ou révoquée. Vérifiez votre clé API Google dans Paramètres API.',
  403: 'Clé IA invalide ou sans autorisation. Vérifiez votre clé API Google dans Paramètres API.',
  404: 'Modèle IA introuvable. Vérifiez la configuration du modèle.',
  429: 'Quota ou facturation Google dépassé pour votre clé IA. Vérifiez votre compte Google AI Studio ou réessayez plus tard.',
};

/** Convertit toute erreur en statut + message sûr ; le détail reste dans les journaux serveur. */
export function classifyAiFailure(error: unknown) {
  const failure = error as { statusCode?: number; status?: number; message?: string; name?: string };
  console.error('[ai] échec', failure?.statusCode ?? failure?.status ?? 'sans-statut', failure?.message);
  if (error instanceof SafeError) return { status: 500, message: error.message };
  const raw = typeof failure?.statusCode === 'number' ? failure.statusCode : typeof failure?.status === 'number' ? failure.status : 500;
  return { status: raw, message: MESSAGES[raw] ?? 'Le traitement a échoué. Réessayez dans un instant.' };
}

/**
 * Une clé invalide ou révoquée (401/403) justifie une suspension persistante de l'IA :
 * inutile de rappeler Google tant que le vendeur n'a pas corrigé sa clé dans Paramètres API.
 * Les dépassements de quota (429) sont signalés sans bloquer durablement le vendeur.
 */
export const shouldPauseAi = (status: number) => status === 401 || status === 403;
