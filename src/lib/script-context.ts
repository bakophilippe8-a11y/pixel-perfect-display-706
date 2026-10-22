// Construit le contexte commercial envoyé à Claude. Ne contient aucune clé ni secret.
type MessageInput = { author: string; content: string; created_at: string };
type ProductInput = { nom: string; prix: number | null; devise: string | null; argument_cle?: string | null };

const MAX_MESSAGES = 50;
const MAX_MESSAGE_CHARS = 500;
const MAX_CONTEXT_CHARS = 12000;

export function buildScriptContext(input: { contactStatus: string; channel: string; messages: MessageInput[]; products: ProductInput[]; guidelines?: unknown }) {
  const recent = input.messages
    .filter(m => m.author === 'client' || m.author === 'ai' || m.author === 'human')
    .slice(-MAX_MESSAGES)
    .map(m => ({ auteur: m.author === 'client' ? 'client' : 'vendeur', texte: m.content.slice(0, MAX_MESSAGE_CHARS), date: m.created_at }));
  const context = JSON.stringify({
    canal: input.channel,
    statut_contact: input.contactStatus,
    produits_consultes: input.products,
    consignes_vendeur: input.guidelines ?? null,
    conversation_recente: recent,
  });
  return context.slice(0, MAX_CONTEXT_CHARS);
}
