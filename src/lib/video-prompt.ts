export const VIDEO_SECONDS = 8;
export const VIDEO_PROMPT_MAX = 1500;

/** Prompt de départ pour un clip vertical de 8 s, condensé à partir du titre et du script voix off. */
export function buildVideoPrompt(title: string, script: string) {
  const scenario = script.replace(/\s+/g, ' ').trim().slice(0, 1000);
  const text = `Publicité verticale pour Facebook d’environ ${VIDEO_SECONDS} secondes, en un seul plan continu, sans coupe de montage, lumière naturelle, ambiance professionnelle et chaleureuse. Sujet : ${title.trim()}. Scénario à condenser en une seule scène marquante : ${scenario}. Pas de texte illisible à l’écran, pas de logo de marque tierce, pas de dialogue.`;
  return text.slice(0, VIDEO_PROMPT_MAX);
}
