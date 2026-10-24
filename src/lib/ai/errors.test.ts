import { describe, expect, it, vi } from 'vitest';
import { classifyAiFailure, SafeError, shouldPauseAi } from './errors.server';

describe('classifyAiFailure', () => {
  it('401 et 403 signalent une clé IA invalide', () => {
    expect(classifyAiFailure({ statusCode: 401 }).message).toContain('Clé IA invalide');
    expect(classifyAiFailure({ statusCode: 403 }).message).toContain('Clé IA invalide');
  });
  it('429 signale un dépassement de quota ou de facturation Google', () => {
    expect(classifyAiFailure({ statusCode: 429 }).message).toContain('Quota ou facturation Google');
  });
  it('ne mentionne plus jamais de crédits à recharger', () => {
    for (const status of [400, 401, 402, 403, 404, 429, 500]) {
      expect(classifyAiFailure({ statusCode: status }).message).not.toMatch(/crédit/i);
    }
  });
  it('une SafeError conserve son message destiné au vendeur', () => {
    expect(classifyAiFailure(new SafeError('Aucune clé IA enregistrée.')).message).toBe('Aucune clé IA enregistrée.');
  });
  it('une erreur inconnue donne un message générique sûr', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(classifyAiFailure(new Error('détail interne')).message).toBe('Le traitement a échoué. Réessayez dans un instant.');
  });
});

describe('shouldPauseAi', () => {
  it('suspend l’IA uniquement sur clé invalide ou révoquée', () => {
    expect(shouldPauseAi(401)).toBe(true);
    expect(shouldPauseAi(403)).toBe(true);
    expect(shouldPauseAi(429)).toBe(false);
    expect(shouldPauseAi(500)).toBe(false);
  });
});
