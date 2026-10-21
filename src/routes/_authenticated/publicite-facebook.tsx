import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { queryOptions, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Check, CircleAlert, Download, Facebook, FileText, Loader2, Plus, RefreshCw, Save, Sparkles, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { generateFacebookCampaign, getFacebookCampaigns, reviewFacebookCampaign, saveFacebookCampaign } from '@/lib/facebook-campaigns.functions';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const campaignsQuery = queryOptions({ queryKey: ['facebook-campaigns'], queryFn: () => getFacebookCampaigns(), refetchInterval: 10000 });
export const Route = createFileRoute('/_authenticated/publicite-facebook')({
  loader: ({ context }) => context.queryClient.ensureQueryData(campaignsQuery),
  head: () => ({ meta: [{ title: 'Publicité Facebook — Agents IA' }, { name: 'description', content: 'Créez, examinez et validez vos brouillons publicitaires Facebook et scripts vidéo.' }, { property: 'og:title', content: 'Publicité Facebook — Agents IA' }, { property: 'og:description', content: 'Vos propositions publicitaires et scripts, réunis dans un espace privé de validation.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: FacebookAdvertisingPage,
});
type Campaign = Awaited<ReturnType<typeof getFacebookCampaigns>>['campaigns'][number];

function FacebookAdvertisingPage() {
  const { lang } = useI18n(); const fr = lang === 'fr';
  const { data } = useSuspenseQuery(campaignsQuery); const qc = useQueryClient();
  const generate = useServerFn(generateFacebookCampaign);
  const [idea, setIdea] = useState(''); const [product, setProduct] = useState('all'); const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState('all'); const [selected, setSelected] = useState<string | null>(null); const [error, setError] = useState('');
  const current = data.campaigns.find(c => c.id === selected);
  const statuses = fr ? { all: 'Toutes', draft: 'À valider', approved: 'Validées', rejected: 'Refusées' } : { all: 'All', draft: 'Awaiting approval', approved: 'Approved', rejected: 'Rejected' };
  async function submit() {
    if (!idea.trim() || generating) return;
    setGenerating(true); setError('');
    try { const result = await generate({ data: { idea, productId: product === 'all' ? null : product, language: lang } }); await qc.invalidateQueries({ queryKey: ['facebook-campaigns'] }); setSelected(result.id); setIdea(''); toast.success(fr ? 'Brouillon créé' : 'Draft created'); }
    catch (e) { setError(e instanceof Error ? e.message : (fr ? 'Génération impossible' : 'Generation failed')); await qc.invalidateQueries({ queryKey: ['facebook-campaigns'] }); }
    finally { setGenerating(false); }
  }
  return <div className="space-y-7">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="label-eyebrow">Facebook</p><h1 className="mt-2 text-3xl font-semibold tracking-normal">{fr ? 'Publicité Facebook' : 'Facebook advertising'}</h1></div><Button asChild variant="outline"><Link to="/parametres"><Facebook />{fr ? 'Mon compte Facebook' : 'My Facebook account'}</Link></Button></header>
    <div className="flex flex-wrap gap-x-8 gap-y-3 border-y border-border py-4">{(['draft', 'approved', 'rejected'] as const).map(status => <div key={status} className="flex items-baseline gap-2"><span className={cn('text-2xl font-semibold', status === 'draft' ? 'text-warning' : status === 'approved' ? 'text-primary' : 'text-muted-foreground')}>{data.campaigns.filter(c => c.status === status).length}</span><span className="text-sm text-muted-foreground">{statuses[status]}</span></div>)}</div>
    <section className="grid gap-5 border-b border-border pb-7 lg:grid-cols-[250px_minmax(0,1fr)]"><div><h2 className="flex items-center gap-2 text-xl font-semibold tracking-normal"><Sparkles className="size-5 text-primary" />{fr ? 'Nouvelle publicité' : 'New advertisement'}</h2><div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><FileText className="size-4" />{fr ? 'Texte Facebook' : 'Facebook copy'}<span>+</span><Video className="size-4" />{fr ? 'Script vidéo' : 'Video script'}</div></div>
      <form onSubmit={e => { e.preventDefault(); void submit(); }} className="min-w-0 space-y-4"><div className="space-y-2"><Label htmlFor="ad-product">{fr ? 'Produit' : 'Product'}</Label><Select value={product} onValueChange={setProduct} disabled={generating}><SelectTrigger id="ad-product"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{fr ? 'Sans produit spécifique' : 'No specific product'}</SelectItem>{data.products.map(p => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="ad-idea">{fr ? 'Votre idée ou votre script' : 'Your idea or script'}</Label><Textarea id="ad-idea" placeholder={fr ? 'Présentez votre produit, votre offre et votre idée de vidéo…' : 'Describe your product, offer and video idea…'} value={idea} onChange={e => setIdea(e.target.value)} rows={5} maxLength={10000} disabled={generating} /></div>
        {(error || data.paused) && <p role="alert" className="flex items-start gap-2 text-sm text-destructive"><CircleAlert className="mt-0.5 size-4 shrink-0" />{error || data.pauseReason}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{fr ? 'Vidéo et publication Facebook : non activées' : 'Video and Facebook publishing: not activated'}</span><Button type="submit" disabled={!idea.trim() || generating || data.paused}>{generating ? <Loader2 className="animate-spin" /> : <Sparkles />}{generating ? (fr ? 'Génération…' : 'Generating…') : (fr ? 'Générer le brouillon' : 'Generate draft')}</Button></div>
      </form></section>
    <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold tracking-normal">{fr ? 'Propositions publicitaires' : 'Advertising proposals'}</h2><Button size="icon" variant="ghost" aria-label={fr ? 'Actualiser les publicités' : 'Refresh advertisements'} title={fr ? 'Actualiser' : 'Refresh'} onClick={() => qc.invalidateQueries({ queryKey: ['facebook-campaigns'] })}><RefreshCw /></Button></div>
      <div className="flex gap-1 overflow-x-auto pb-2" role="group" aria-label={fr ? 'Filtrer les publicités' : 'Filter advertisements'}>{(Object.keys(statuses) as Array<keyof typeof statuses>).map(key => <Button key={key} size="sm" variant={filter === key ? 'secondary' : 'ghost'} aria-pressed={filter === key} onClick={() => setFilter(key)}>{statuses[key]}</Button>)}</div>
      {data.campaigns.filter(c => filter === 'all' || c.status === filter).length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.campaigns.filter(c => filter === 'all' || c.status === filter).map(c => <article key={c.id} className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-surface p-5"><div className="flex items-center justify-between gap-2"><Facebook className="size-5 text-primary" /><span className={cn('text-xs font-medium', c.status === 'draft' ? 'text-warning' : c.status === 'approved' ? 'text-primary' : 'text-muted-foreground')}>{statuses[c.status as 'draft' | 'approved' | 'rejected']}</span></div><h3 className="break-words text-lg font-semibold tracking-normal [overflow-wrap:anywhere]">{c.title}</h3><p className="line-clamp-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">{c.facebook_copy}</p><div className="mt-auto flex flex-wrap items-center justify-between gap-2"><time className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString(lang)}</time><Button variant="outline" size="sm" onClick={() => setSelected(c.id)}><FileText />{fr ? 'Examiner' : 'Review'}</Button></div>{c.status === 'approved' && <span className="text-xs text-warning">{fr ? 'Non publiée' : 'Not published'}</span>}</article>)}</div> : <div className="flex flex-col items-center gap-3 border-y border-dashed border-border py-12 text-center"><Plus className="size-8 text-muted-foreground" /><p className="text-muted-foreground">{fr ? 'Aucune proposition pour le moment.' : 'No proposals yet.'}</p></div>}
    </section>
    {current && <CampaignEditor key={current.id} campaign={current} fr={fr} onClose={() => setSelected(null)} />}
  </div>;
}

function CampaignEditor({ campaign: c, fr, onClose }: { campaign: Campaign; fr: boolean; onClose: () => void }) {
  const [title, setTitle] = useState(c.title); const [copy, setCopy] = useState(c.facebook_copy); const [script, setScript] = useState(c.voiceover_script);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [confirm, setConfirm] = useState(false);
  const save = useServerFn(saveFacebookCampaign); const review = useServerFn(reviewFacebookCampaign); const qc = useQueryClient();
  const dirty = title !== c.title || copy !== c.facebook_copy || script !== c.voiceover_script; const valid = !!title.trim() && !!copy.trim();
  async function action(approved?: boolean) {
    setBusy(true); setError('');
    try { const data = { id: c.id, title, facebook_copy: copy, voiceover_script: script }; if (approved === undefined) await save({ data }); else await review({ data: { ...data, approved } }); await qc.invalidateQueries({ queryKey: ['facebook-campaigns'] }); toast.success(approved === true ? (fr ? 'Validée · non publiée' : 'Approved · not published') : approved === false ? (fr ? 'Proposition refusée' : 'Proposal rejected') : (fr ? 'Brouillon enregistré' : 'Draft saved')); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Action impossible'); }
    finally { setBusy(false); setConfirm(false); }
  }
  function download() { const blob = new Blob([`${title}\n\nFACEBOOK\n${copy}\n\n${fr ? 'SCRIPT VIDÉO' : 'VIDEO SCRIPT'}\n${script}`], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'publicite-facebook.txt'; a.click(); URL.revokeObjectURL(url); }
  return <><Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle className="tracking-normal">{fr ? 'Examiner la publicité' : 'Review advertisement'}</DialogTitle><DialogDescription>{fr ? 'Validation du contenu uniquement : aucune publication ni dépense.' : 'Content approval only: no publication or spending.'}</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label htmlFor="ad-title">{fr ? 'Titre' : 'Title'}</Label><Input id="ad-title" maxLength={200} value={title} onChange={e => setTitle(e.target.value)} disabled={busy} /></div><div className="space-y-2"><Label htmlFor="ad-copy">{fr ? 'Texte Facebook' : 'Facebook copy'}</Label><Textarea id="ad-copy" rows={5} maxLength={4000} value={copy} onChange={e => setCopy(e.target.value)} disabled={busy} /></div><div className="space-y-2"><Label htmlFor="ad-script">{fr ? 'Script vidéo / voix off' : 'Video script / voiceover'}</Label><Textarea id="ad-script" rows={7} maxLength={4000} value={script} onChange={e => setScript(e.target.value)} disabled={busy} /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex flex-wrap gap-2 border-t border-border pt-4"><Button variant="outline" size="icon" aria-label={fr ? 'Télécharger le texte et le script' : 'Download copy and script'} title={fr ? 'Télécharger' : 'Download'} onClick={download}><Download /></Button><Button variant="outline" disabled={busy || !valid || !dirty} onClick={() => action()}><Save />{fr ? 'Enregistrer' : 'Save'}</Button><Button variant="ghost" disabled={busy || dirty || c.status === 'rejected'} onClick={() => action(false)}><X />{fr ? 'Refuser' : 'Reject'}</Button><Button disabled={busy || dirty || !valid || c.status === 'approved'} onClick={() => setConfirm(true)}><Check />{fr ? 'Valider le contenu' : 'Approve content'}</Button></div>{dirty && <p className="text-xs text-warning">{fr ? 'Modifications non enregistrées · validation suspendue' : 'Unsaved changes · approval paused'}</p>}<p className="text-xs text-muted-foreground">{fr ? 'Publication Facebook et génération vidéo non activées.' : 'Facebook publishing and video generation are not activated.'}</p></div></DialogContent></Dialog>
    <AlertDialog open={confirm} onOpenChange={setConfirm}><AlertDialogContent className="w-[calc(100%-2rem)]"><AlertDialogHeader><AlertDialogTitle className="tracking-normal">{fr ? 'Valider cette publicité ?' : 'Approve this advertisement?'}</AlertDialogTitle><AlertDialogDescription>{fr ? 'Le texte et le script seront marqués comme validés. Aucune vidéo ne sera générée, aucune publicité ne sera publiée et aucun budget ne sera engagé.' : 'Copy and script will be marked as approved. No video will be generated, no advertisement published and no budget spent.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{fr ? 'Annuler' : 'Cancel'}</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); void action(true); }}>{busy ? <Loader2 className="animate-spin" /> : (fr ? 'Confirmer la validation' : 'Confirm approval')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}