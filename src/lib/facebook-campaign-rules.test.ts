import { describe, expect, it } from 'vitest';
import { campaignDraft, campaignReview } from './facebook-campaign-rules';
import { canPublishCampaign } from './sales-rules';

describe('Facebook advertising approval', () => {
  it('keeps generated or edited advertising awaiting a new approval', () => {
    expect(campaignDraft('Offre', 'Texte', 'Script')).toEqual({ title: 'Offre', facebook_copy: 'Texte', voiceover_script: 'Script', status: 'draft', approved_at: null, publish_error: null });
  });
  it('records explicit approval; publication stays a separate explicit action', () => {
    const review = campaignReview(true, '2026-10-21T00:35:00Z');
    expect(review).toEqual({ status: 'approved', approved_at: '2026-10-21T00:35:00Z' });
    expect(canPublishCampaign(review.status, review.approved_at)).toBe(true);
  });
  it('does not retain approval after rejection', () => {
    const review = campaignReview(false, '2026-10-21T00:35:00Z');
    expect(review).toEqual({ status: 'rejected', approved_at: null });
    expect(canPublishCampaign(review.status, review.approved_at)).toBe(false);
  });
  it('an edit resets approval, so edited content cannot be published unreviewed', () => {
    const edited = campaignDraft('Offre', 'Texte modifié', 'Script');
    expect(canPublishCampaign(edited.status, edited.approved_at)).toBe(false);
  });
});
