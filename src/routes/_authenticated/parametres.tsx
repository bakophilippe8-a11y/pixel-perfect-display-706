import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { queryOptions, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyRound, Save, Trash2, ShieldCheck, PlugZap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getSalesSettings, saveSalesConnection, testSalesConnection, deleteSalesConnection, saveSalesGuidelines } from '@/lib/sales.functions';
import { useI18n } from '@/lib/i18n';
const settings = queryOptions({ queryKey: ['sales-settings'], queryFn: () => getSalesSettings() });
export const Route = createFileRoute('/_authenticated/parametres')({ loader: ({ context }) => context.queryClient.ensureQueryData(settings), head: () => ({ meta: [{ title: 'Paramètres API — Agents IA' }, { name: 'description', content: 'Accès personnels aux messageries et consignes commerciales.' }, { property: 'og:title', content: 'Paramètres API — Agents IA' }, { property: 'og:description', content: 'Configuration commerciale privée par vendeur.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }), component: SettingsPage });
function SettingsPage() {
  const { lang } = useI18n();
  const fr = lang === 'fr';
  const { data } = useSuspenseQuery(settings);
  const [guidelines, setGuidelines] = useState({ tone: data.guidelines?.tone || 'Professionnel, chaleureux, concis', sales_info: data.guidelines?.sales_info || '', human_conditions: data.guidelines?.human_conditions || 'Demande explicite, réclamation, information manquante ou incertitude' });
  const save = useServerFn(saveSalesGuidelines);
  const qc = useQueryClient();
  return <div className="space-y-8"><header><p className="label-eyebrow">{fr ? 'Connexions privées' : 'Private connections'}</p><h1 className="mt-2 text-3xl font-semibold">{fr ? 'Paramètres API' : 'API settings'}</h1></header>
    <div className="grid gap-4 lg:grid-cols-3">{(['whatsapp', 'telegram', 'meta'] as const).map(channel => <Connection key={channel} channel={channel} saved={data.connections.find(item => item.channel === channel)} />)}</div>
    {data.guidelines?.ai_paused && <p role="alert" className="border-l-2 border-warning pl-4 text-warning">{data.guidelines.pause_reason}</p>}
    <section className="space-y-5 border-t border-border pt-6"><h2 className="text-xl font-semibold">{fr ? 'Consignes commerciales' : 'Sales guidelines'}</h2>
      {(['tone', 'sales_info', 'human_conditions'] as const).map((key, i) => <div key={key}><Label htmlFor={key}>{(fr ? ['Ton des réponses', 'Informations de vente', 'Transfert à un humain'] : ['Reply tone', 'Sales information', 'Human handover'])[i]}</Label><Textarea id={key} className="mt-2" value={guidelines[key]} onChange={e => setGuidelines({ ...guidelines, [key]: e.target.value })} rows={key === 'sales_info' ? 5 : 3} /></div>)}
      <Button onClick={async () => { try { await save({ data: guidelines }); await qc.invalidateQueries({ queryKey: ['sales-settings'] }); toast.success(fr ? 'Consignes enregistrées' : 'Guidelines saved'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Erreur'); } }}><Save className="mr-2 size-4" />{fr ? 'Enregistrer' : 'Save'}</Button>
    </section></div>;
}
type ConnectionData = Awaited<ReturnType<typeof getSalesSettings>>['connections'][number];
function Connection({ channel, saved }: { channel: 'telegram' | 'whatsapp' | 'meta'; saved?: ConnectionData }) {
  const { lang } = useI18n(); const fr = lang === 'fr';
  const [token, setToken] = useState(''); const [identifier, setIdentifier] = useState('');
  const [appSecret, setAppSecret] = useState(''); const [verifyToken, setVerifyToken] = useState(''); const [busy, setBusy] = useState(false);
  const save = useServerFn(saveSalesConnection); const test = useServerFn(testSalesConnection); const remove = useServerFn(deleteSalesConnection); const qc = useQueryClient();
  async function act(task: () => Promise<unknown>) { setBusy(true); try { await task(); await qc.invalidateQueries({ queryKey: ['sales-settings'] }); } catch (error) { toast.error(error instanceof Error ? error.message : 'Erreur'); } finally { setBusy(false); } }
  return <section className="min-w-0 rounded-lg border border-border bg-surface p-5"><div className="flex items-center justify-between gap-2"><h2 className="font-display text-lg font-semibold">{channel === 'meta' ? 'Meta Ads' : channel === 'whatsapp' ? 'WhatsApp Business' : 'Telegram Bot'}</h2><KeyRound className="size-5 text-primary" /></div>
    <p className="my-4 text-sm text-muted-foreground">{saved?.tested_at ? (fr ? 'Accès vérifié · réception non activée' : 'Access verified · receiving not enabled') : saved ? (fr ? 'Accès enregistré · à tester' : 'Saved · test required') : (fr ? 'Non connecté' : 'Not connected')}</p>
    {saved?.test_error && <p className="mb-3 text-sm text-destructive">{saved.test_error}</p>}
    <div className="space-y-3"><div><Label htmlFor={`token-${channel}`}>{fr ? 'Jeton d’accès' : 'Access token'}</Label><Input id={`token-${channel}`} type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} placeholder={saved ? '••••••••' : ''} className="mt-1" /></div>
    {channel !== 'telegram' && <div><Label htmlFor={`id-${channel}`}>{channel === 'meta' ? (fr ? 'Identifiant du compte publicitaire' : 'Ad account ID') : (fr ? 'Identifiant du numéro WhatsApp' : 'WhatsApp phone number ID')}</Label><Input id={`id-${channel}`} value={identifier} onChange={e => setIdentifier(e.target.value)} className="mt-1" /></div>}
    {channel === 'whatsapp' && <><div><Label htmlFor="meta-secret">{fr ? 'Secret de l’application Meta' : 'Meta app secret'}</Label><Input id="meta-secret" type="password" autoComplete="off" value={appSecret} onChange={e => setAppSecret(e.target.value)} className="mt-1" /></div><div><Label htmlFor="verify-token">{fr ? 'Jeton de vérification choisi dans Meta' : 'Verification token configured in Meta'}</Label><Input id="verify-token" type="password" value={verifyToken} onChange={e => setVerifyToken(e.target.value)} className="mt-1" /></div></>}
    </div><div className="mt-5 flex flex-wrap gap-2"><Button size="sm" disabled={busy || !token} onClick={() => act(async () => { await save({ data: { channel, token, identifier, appSecret, verifyToken } }); setToken(''); setAppSecret(''); setVerifyToken(''); toast.success(fr ? 'Accès chiffré enregistré' : 'Encrypted access saved'); })}><Save className="mr-2 size-4" />{fr ? 'Enregistrer' : 'Save'}</Button><Button variant="outline" size="sm" disabled={busy || !saved} onClick={() => act(async () => { const result = await test({ data: { channel } }); result.ok ? toast.success(fr ? 'Accès vérifié' : 'Access verified') : toast.error(result.message); })}><PlugZap className="mr-2 size-4" />{fr ? 'Tester' : 'Test'}</Button><Button variant="ghost" size="icon" title={fr ? 'Supprimer les accès' : 'Delete credentials'} disabled={busy || !saved} onClick={() => { if (window.confirm(fr ? 'Supprimer ces accès ?' : 'Delete these credentials?')) void act(() => remove({ data: { channel } })); }}><Trash2 className="size-4" /></Button></div><div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4" />{fr ? 'Chiffré · visible uniquement lors de la saisie' : 'Encrypted · never displayed after saving'}</div></section>;
}