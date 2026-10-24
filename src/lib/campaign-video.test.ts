import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadCampaignVideo, extractVideo, isTrustedGoogleVideoUrl, pollCampaignVideo, submitCampaignVideo } from './campaign-video.server';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('lancement de la vidéo (Gemini Omni Flash)', () => {
  it('appelle l’API Interactions en arrière-plan, au format vertical, avec la clé du vendeur', async () => {
    vi.stubEnv('VIDEO_MODEL', '');
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ id: 'v1_abc', status: 'in_progress' }));
    const job = await submitCampaignVideo('Produit', 'TEST_KEY');
    expect(job).toEqual({ jobId: 'v1_abc', model: 'gemini-omni-1.1-flash' });
    const [url, init] = spy.mock.calls[0]!;
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/interactions');
    expect((init!.headers as Record<string, string>)['x-goog-api-key']).toBe('TEST_KEY');
    const body = JSON.parse(String(init!.body));
    expect(body).toMatchObject({ model: 'gemini-omni-1.1-flash', input: 'Produit', background: true, response_format: { type: 'video', aspect_ratio: '9:16' } });
  });
  it('permet de changer de modèle sans modifier le code', async () => {
    vi.stubEnv('VIDEO_MODEL', 'gemini-omni-2');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ id: 'x' }));
    expect((await submitCampaignVideo('Produit', 'K')).model).toBe('gemini-omni-2');
  });
  it('transmet le code d’erreur Google pour la gestion des messages', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ error: { code: 403, status: 'PERMISSION_DENIED', message: 'clé refusée' } }, 403));
    await expect(submitCampaignVideo('Produit', 'K')).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('suivi de la vidéo', () => {
  it('attend tant que l’interaction est en cours', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ id: 'v1', status: 'in_progress' }));
    expect(await pollCampaignVideo('v1', 'K')).toEqual({ status: 'generating' });
  });
  it('décode la vidéo reçue en base64', async () => {
    const data = btoa('MP4DATA');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ status: 'completed', steps: [{ type: 'user_input', content: [{ type: 'text', text: 'x' }] }, { type: 'model_output', content: [{ type: 'video', mime_type: 'video/mp4', data }] }] }));
    const job = await pollCampaignVideo('v1', 'K');
    expect(job.status).toBe('completed');
    expect(job.status === 'completed' && new TextDecoder().decode(job.data)).toBe('MP4DATA');
  });
  it('renvoie l’URI quand la vidéo est livrée par adresse', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'video', uri: 'https://generativelanguage.googleapis.com/v1beta/files/a:download?alt=media' }] }] }));
    expect(await pollCampaignVideo('v1', 'K')).toMatchObject({ status: 'completed', url: expect.stringContaining('/files/a') });
  });
  it('signale un échec, une annulation ou une vidéo absente', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({ status: 'failed', error: { message: 'filtré' } }));
    expect(await pollCampaignVideo('v1', 'K')).toEqual({ status: 'failed', error: 'filtré' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({ status: 'cancelled' }));
    expect((await pollCampaignVideo('v1', 'K')).status).toBe('failed');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({ status: 'completed', steps: [] }));
    expect((await pollCampaignVideo('v1', 'K')).status).toBe('failed');
  });
  it('lit aussi le champ de commodité output_video', () => {
    expect(extractVideo({ output_video: { type: 'video', data: 'QQ==' } })?.data).toBe('QQ==');
  });
});

describe('URL de téléchargement vidéo', () => {
  it('accepte generativelanguage.googleapis.com et les sous-domaines googleapis.com', () => {
    expect(isTrustedGoogleVideoUrl('https://generativelanguage.googleapis.com/v1beta/files/abc:download')).toBe(true);
    expect(isTrustedGoogleVideoUrl('https://storage.googleapis.com/x')).toBe(true);
  });
  it('refuse les autres domaines et le http', () => {
    expect(isTrustedGoogleVideoUrl('https://evil.com/googleapis.com')).toBe(false);
    expect(isTrustedGoogleVideoUrl('https://googleapis.com.evil.com/x')).toBe(false);
    expect(isTrustedGoogleVideoUrl('http://generativelanguage.googleapis.com/x')).toBe(false);
    expect(isTrustedGoogleVideoUrl('pas une url')).toBe(false);
  });
  it("n'envoie pas la clé à un domaine non vérifié", async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    await expect(downloadCampaignVideo('https://evil.com/v.mp4', 'KEY')).rejects.toThrow('domaine non Google');
    expect(spy).not.toHaveBeenCalled();
  });
});
