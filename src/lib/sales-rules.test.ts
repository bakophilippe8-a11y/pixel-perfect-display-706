import { describe, it, expect } from 'vitest';
import { canSendFreeWhatsApp, canAutomate, canPublishCampaign, detectOptOut } from './sales-rules';
describe('Commercial safeguards', () => {
  const start = '2026-10-19T12:00:00Z';
  it('allows free replies within the WhatsApp 24h window only', () => {
    expect(canSendFreeWhatsApp(start, Date.parse(start) + 23 * 3600000)).toBe(true);
    expect(canSendFreeWhatsApp(start, Date.parse(start) + 24 * 3600000)).toBe(false);
    expect(canSendFreeWhatsApp(null)).toBe(false);
  });
  it('suspends automatic replies after human transfer', () => {
    expect(canAutomate('human', false)).toBe(false);
    expect(canAutomate('active', false)).toBe(true);
  });
  it('stops replies on opposition', () => {
    expect(canAutomate('active', true)).toBe(false);
  });
});

describe('Publication gate', () => {
  it('publishes only approved content (or retries a failed approved one)', () => {
    expect(canPublishCampaign('approved', '2026-10-22T10:00:00Z')).toBe(true);
    expect(canPublishCampaign('failed', '2026-10-22T10:00:00Z')).toBe(true);
    expect(canPublishCampaign('draft', null)).toBe(false);
    expect(canPublishCampaign('rejected', null)).toBe(false);
    expect(canPublishCampaign('approved', null)).toBe(false);
  });
  it('never republishes content already published or being published', () => {
    expect(canPublishCampaign('published', '2026-10-22T10:00:00Z')).toBe(false);
    expect(canPublishCampaign('publishing', '2026-10-22T10:00:00Z')).toBe(false);
  });
});

describe('Opt-out detection', () => {
  it.each(['STOP', 'Stop', 'Arrêtez de me contacter', 'ne me contactez plus svp', 'Je veux me désabonner', 'unsubscribe', 'Please do not contact me', 'Laissez-moi tranquille', 'Supprimez mon numéro'])('detects "%s"', text => expect(detectOptOut(text)).toBe(true));
  it.each(['Quel est le prix ?', 'Je prends le bus stop demain', 'Pouvez-vous m’envoyer le lien ?', 'Je veux continuer'])('ignores "%s"', text => expect(detectOptOut(text)).toBe(false));
});
