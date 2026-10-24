type GuidelinesDb = {
  from: (table: 'sales_guidelines') => {
    update: (values: { ai_paused: boolean; pause_reason: string }) => {
      eq: (column: 'user_id', value: string) => PromiseLike<{ error: unknown }>;
    };
  };
};

/** Lève la suspension de l'IA d'un vendeur (clé IA enregistrée ou testée avec succès). */
export async function resumeAi(db: GuidelinesDb, userId: string) {
  const result = await db.from('sales_guidelines').update({ ai_paused: false, pause_reason: '' }).eq('user_id', userId);
  if (result.error) throw result.error;
}
