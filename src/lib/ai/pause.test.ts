import { describe, expect, it } from 'vitest';
import { resumeAi } from './pause';

describe('resumeAi', () => {
  it('remet ai_paused à false et pause_reason à une chaîne vide pour ce vendeur', async () => {
    const calls: unknown[] = [];
    const db = { from: (table: 'sales_guidelines') => ({ update: (values: { ai_paused: boolean; pause_reason: string }) => ({ eq: async (column: 'user_id', value: string) => { calls.push({ table, values, column, value }); return { error: null }; } }) }) };
    await resumeAi(db, 'user-1');
    expect(calls).toEqual([{ table: 'sales_guidelines', values: { ai_paused: false, pause_reason: '' }, column: 'user_id', value: 'user-1' }]);
  });
  it('propage une erreur de base', async () => {
    const db = { from: () => ({ update: () => ({ eq: async () => ({ error: new Error('boom') }) }) }) };
    await expect(resumeAi(db, 'u')).rejects.toThrow('boom');
  });
});
