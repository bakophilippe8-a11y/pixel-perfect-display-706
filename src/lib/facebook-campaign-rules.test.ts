import { describe, expect, it } from 'vitest';
import { campaignDraft, campaignReview } from './facebook-campaign-rules';
import { publicationAllowed } from './sales-rules';

describe('Facebook advertising approval', () => {
  it('keeps generated or edited advertising awaiting a new approval', () => {
    expect(campaignDraft('Offre', 'Texte', 'Script')).toEqual({ title: 'Offre', facebook_copy: 'Texte', voiceover_script: 'Script', status: 'draft', approved_at: null });
  });
  it('records explicit approval without authorizing publication or spending', () => {
    expect(campaignReview(true, '2026-10-21T00:35:00Z')).toEqual({ status: 'approved', approved_at: '2026-10-21T00:35:00Z' });
    expect(publicationAllowed()).toBe(false);
  });
  it('does not retain approval after rejection', () => {
    expect(campaignReview(false, '2026-10-21T00:35:00Z')).toEqual({ status: 'rejected', approved_at: null });
  });
});