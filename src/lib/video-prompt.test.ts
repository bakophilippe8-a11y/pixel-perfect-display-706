import { describe, expect, it } from 'vitest';
import { buildVideoPrompt, VIDEO_PROMPT_MAX } from './video-prompt';

describe('buildVideoPrompt', () => {
  it('condense le script et reste sous la limite', () => {
    const prompt = buildVideoPrompt('Offre', 'scène '.repeat(2000));
    expect(prompt.length).toBeLessThanOrEqual(VIDEO_PROMPT_MAX);
    expect(prompt).toContain('Offre');
    expect(prompt).toContain('8 secondes');
  });
  it('normalise les retours à la ligne', () => {
    expect(buildVideoPrompt('T', 'ligne 1\n\n  ligne 2')).toContain('ligne 1 ligne 2');
  });
});
