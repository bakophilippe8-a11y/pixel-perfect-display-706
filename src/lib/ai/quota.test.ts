import { describe, expect, it } from 'vitest';
import { campaignQuotaExceeded, decisionQuotaExceeded, DEFAULT_DAILY_ADS_LIMIT, DEFAULT_DAILY_AI_LIMIT, DEFAULT_DAILY_VIDEO_LIMIT, videoQuotaExceeded } from './quota.server';

const db = (count: number) => ({
  from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ gte: () => Promise.resolve({ count, error: null }) }) }), gte: () => Promise.resolve({ count, error: null }) }) }) }),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;

describe('plafonds quotidiens par vendeur', () => {
  it('utilise le réglage du vendeur quand il est fourni', async () => {
    expect(await decisionQuotaExceeded(db(10), 'u', 10)).toBe(true);
    expect(await decisionQuotaExceeded(db(9), 'u', 10)).toBe(false);
    expect(await campaignQuotaExceeded(db(3), 'u', 3)).toBe(true);
    expect(await videoQuotaExceeded(db(1), 'u', 1)).toBe(true);
  });
  it('retombe sur les valeurs par défaut sans réglage valide', async () => {
    expect(await decisionQuotaExceeded(db(DEFAULT_DAILY_AI_LIMIT), 'u')).toBe(true);
    expect(await decisionQuotaExceeded(db(DEFAULT_DAILY_AI_LIMIT - 1), 'u')).toBe(false);
    expect(await campaignQuotaExceeded(db(DEFAULT_DAILY_ADS_LIMIT), 'u', Number.NaN)).toBe(true);
    expect(await videoQuotaExceeded(db(DEFAULT_DAILY_VIDEO_LIMIT), 'u', -5)).toBe(true);
  });
});
