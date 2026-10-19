import { describe, it, expect } from 'bun:test';
import { canSendFreeWhatsApp, canAutomate, publicationAllowed } from './sales-rules';
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
  it('never publishes or spends from a draft decision', () => {
    expect(publicationAllowed()).toBe(false);
  });
});