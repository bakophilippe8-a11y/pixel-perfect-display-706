export function campaignDraft(title: string, facebookCopy: string, voiceoverScript: string) {
  return { title: title.trim(), facebook_copy: facebookCopy.trim(), voiceover_script: voiceoverScript.trim(), status: 'draft' as const, approved_at: null, publish_error: null };
}

export function campaignReview(approved: boolean, now: string) {
  return { status: approved ? 'approved' as const : 'rejected' as const, approved_at: approved ? now : null };
}