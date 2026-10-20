import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bot, CheckCheck, CheckCircle2, CircleAlert, Loader2, MessageCircle, RefreshCw, Search, Send, UserRound, Package, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getConversations, getConversationHistory, sendManualMessage } from '@/lib/conversations.functions';
import { setSalesConversationStatus } from '@/lib/sales.functions';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const conversationsQuery = queryOptions({ queryKey: ['conversations'], queryFn: () => getConversations(), refetchInterval: 5000 });
export const Route = createFileRoute('/_authenticated/conversations')({
  loader: ({ context }) => context.queryClient.ensureQueryData(conversationsQuery),
  head: () => ({ meta: [{ title: 'Conversations — Agents IA' }, { name: 'description', content: 'Messagerie commerciale privée, historique client et intervention humaine.' }, { property: 'og:title', content: 'Conversations — Agents IA' }, { property: 'og:description', content: 'Suivez vos échanges WhatsApp et Telegram et prenez la main sur l’assistant.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: ConversationsPage,
});
type Conversation = Awaited<ReturnType<typeof getConversations>>[number];
type History = Awaited<ReturnType<typeof getConversationHistory>>;
type Filter = 'all' | 'active' | 'human' | 'closed';
function channelName(channel: string) { return channel === 'whatsapp' ? 'WhatsApp' : channel === 'telegram' ? 'Telegram' : 'Test interne'; }

function ConversationsPage() {
  const { lang } = useI18n(); const fr = lang === 'fr';
  const { data: conversations } = useSuspenseQuery(conversationsQuery);
  const [filter, setFilter] = useState<Filter>('all'); const [search, setSearch] = useState(''); const [selected, setSelected] = useState<string | null>(null);
  const qc = useQueryClient();
  const filtered = conversations.filter(c => (filter === 'all' || c.status === filter) && `${c.contact_name} ${c.external_contact}`.toLowerCase().includes(search.toLowerCase()));
  const labels: Record<Filter, string> = fr ? { all: 'Toutes', active: 'En cours (IA)', human: 'Attente Humain', closed: 'Terminées' } : { all: 'All', active: 'Active (AI)', human: 'Awaiting human', closed: 'Closed' };
  const current = conversations.find(c => c.id === selected);
  return <div className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="label-eyebrow">{fr ? 'Relation client' : 'Customer relations'}</p><h1 className="mt-2 text-3xl font-semibold tracking-normal">{fr ? 'Conversations' : 'Inbox'}</h1></div><div className="flex items-center gap-3"><span className="flex items-center gap-1.5 text-sm text-destructive"><CircleAlert className="size-4" />{conversations.filter(c => c.status === 'human').length} {fr ? 'en attente' : 'awaiting'}</span><Button variant="outline" size="icon" title={fr ? 'Actualiser' : 'Refresh'} aria-label={fr ? 'Actualiser' : 'Refresh'} onClick={() => qc.invalidateQueries({ queryKey: ['conversations'] })}><RefreshCw /></Button></div></header>
    <div className="flex gap-1 overflow-x-auto border-b border-border pb-3" role="group" aria-label={fr ? 'Filtrer les conversations' : 'Filter conversations'}>{(['all','active','human','closed'] as const).map(key => <Button key={key} variant={filter === key ? 'secondary' : 'ghost'} size="sm" aria-pressed={filter === key} onClick={() => { setFilter(key); setSelected(null); }}>{labels[key]}<span className="text-muted-foreground">{key === 'all' ? conversations.length : conversations.filter(c => c.status === key).length}</span></Button>)}</div>
    <div className="grid min-h-[560px] grid-cols-1 overflow-hidden rounded-lg border border-border bg-surface md:h-[min(760px,calc(100dvh-260px))] md:min-h-[500px] md:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className={cn('flex min-h-0 flex-col border-border md:border-r', selected && 'hidden md:flex')}><div className="relative m-4"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="pl-9" aria-label={fr ? 'Rechercher un contact' : 'Search contacts'} placeholder={fr ? 'Rechercher un contact…' : 'Search contacts…'} value={search} onChange={e => setSearch(e.target.value)} /></div><div className="flex-1 overflow-y-auto">{filtered.map(c => <Button key={c.id} variant="ghost" onClick={() => setSelected(c.id)} className={cn('h-auto w-full justify-start gap-3 rounded-none border-b border-border px-4 py-4 text-left', c.id === selected && 'bg-surface-2')}><span className={cn('grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-foreground', c.status === 'human' && 'bg-destructive/10 text-destructive')}><UserRound className="size-5" /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{c.contact_name || c.external_contact}</span><time className="shrink-0 text-[10px] font-normal text-muted-foreground">{new Date(c.updated_at).toLocaleDateString(lang, { day: 'numeric', month: 'short' })}</time></span><span className="mt-1 flex items-center justify-between text-xs font-normal text-muted-foreground"><span>{channelName(c.channel)}</span><span className={cn(c.status === 'human' ? 'text-destructive' : c.status === 'active' ? 'text-primary' : '')}>{c.status === 'human' ? (fr ? 'Humain requis' : 'Human required') : c.status === 'active' ? 'IA' : (fr ? 'Terminée' : 'Closed')}</span></span></span></Button>)}{!filtered.length && <div className="px-5 py-12 text-center text-sm text-muted-foreground"><MessageCircle className="mx-auto mb-3 size-8 opacity-50" />{fr ? 'Aucune conversation' : 'No conversations'}</div>}</div></aside>
      {current ? <ConversationDetail key={current.id} conversation={current} onBack={() => setSelected(null)} /> : <div className="hidden flex-col items-center justify-center gap-4 p-8 text-center md:flex"><MessageCircle className="size-12 text-muted-foreground" /><h2 className="text-lg font-semibold tracking-normal">{fr ? 'Votre messagerie' : 'Your inbox'}</h2><p className="max-w-sm text-sm text-muted-foreground">{conversations.length ? (fr ? 'Sélectionnez une conversation.' : 'Select a conversation.') : (fr ? 'Aucun message reçu. Les canaux ne sont pas encore activés.' : 'No incoming messages. Channels are not activated yet.')}</p><Button asChild variant="outline"><Link to="/parametres"><Settings2 />{fr ? 'Paramètres API' : 'API settings'}</Link></Button></div>}
    </div>
    {!conversations.length && <p className="text-sm text-muted-foreground md:hidden">{fr ? 'La réception WhatsApp et Telegram attend l’activation des canaux.' : 'WhatsApp and Telegram reception requires channel activation.'} <Link to="/parametres" className="text-primary underline">{fr ? 'Paramètres API' : 'API settings'}</Link></p>}
  </div>;
}

function ConversationDetail({ conversation, onBack }: { conversation: Conversation; onBack: () => void }) {
  const { lang } = useI18n(); const fr = lang === 'fr';
  const history = useQuery({ queryKey: ['conversation-history', conversation.id], queryFn: () => getConversationHistory({ data: { id: conversation.id } }), refetchInterval: 3000 });
  const c = history.data?.conversation || conversation;
  const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const mode = useServerFn(setSalesConversationStatus); const send = useServerFn(sendManualMessage); const qc = useQueryClient(); const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'nearest' }); }, [history.data?.messages.length]);
  async function refresh() { await Promise.all([qc.invalidateQueries({ queryKey: ['conversations'] }), qc.invalidateQueries({ queryKey: ['conversation-history', c.id] })]); }
  async function change(status: 'active' | 'human' | 'closed') {
    setBusy(true); setError(null);
    try { await mode({ data: { id: c.id, status } }); await refresh(); toast.success(fr ? 'Mode de traitement mis à jour' : 'Conversation mode updated'); }
    catch (e) { setError(e instanceof Error ? e.message : (fr ? 'Action impossible' : 'Action failed')); }
    finally { setBusy(false); }
  }
  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true); setError(null);
    try { const result = await send({ data: { id: c.id, content: text, requestId: crypto.randomUUID() } }); if (!result.ok) { setError(result.error); return; } setText(''); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : (fr ? 'Envoi impossible' : 'Send failed')); }
    finally { setBusy(false); }
  }
  const closed = c.status === 'closed'; const human = c.status === 'human';
  return <section className="flex min-h-0 min-w-0 flex-col max-md:min-h-[650px]" aria-label={fr ? 'Détail de la conversation' : 'Conversation detail'}>
    <header className="space-y-3 border-b border-border p-4"><div className="flex items-center gap-3"><Button size="icon" variant="ghost" className="md:hidden" aria-label={fr ? 'Retour aux conversations' : 'Back to inbox'} onClick={onBack}><ArrowLeft /></Button><span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary"><UserRound className="size-5" /></span><div className="min-w-0 flex-1"><h2 className="truncate text-lg font-semibold tracking-normal">{c.contact_name || c.external_contact}</h2><p className="break-all text-xs text-muted-foreground">{channelName(c.channel)} · {c.external_contact}</p></div><span className="rounded-md bg-secondary px-2 py-1 text-xs">{c.contact_status === 'Customer' || c.contact_status === 'Client' ? (fr ? 'Client' : 'Customer') : c.contact_status === 'Follow-up' ? (fr ? 'À relancer' : 'Follow-up') : (fr ? 'Prospect' : 'Prospect')}</span></div>
      <div className="flex flex-wrap gap-2"><Button disabled={busy || (c.opted_out && human)} variant={human || closed ? 'default' : 'outline'} size="sm" onClick={() => change(human || closed ? 'active' : 'human')}>{human || closed ? <Bot /> : <UserRound />}{human || closed ? (fr ? 'Reprendre avec l’IA' : 'Resume with AI') : (fr ? 'Passer en mode Humain' : 'Switch to human')}</Button>{!closed && <Button variant="ghost" size="sm" disabled={busy} onClick={() => change('closed')}><CheckCircle2 />{fr ? 'Terminer' : 'Close'}</Button>}</div>
      {human && <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive"><CircleAlert className="size-4 shrink-0" />{fr ? 'Intervention Humaine Requise' : 'Human Intervention Required'}</div>}
      {c.opted_out && <p className="text-sm text-destructive">{fr ? 'Ce contact a refusé les messages.' : 'This contact opted out.'}</p>}
      <div className="flex flex-wrap items-center gap-2 text-xs"><span className="flex items-center gap-1 text-muted-foreground"><Package className="size-3.5" />{fr ? 'Produits consultés' : 'Viewed products'}</span>{history.data?.products.length ? history.data.products.map(p => <span className="rounded-md border border-border px-2 py-1" key={p.id}>{p.nom}</span>) : <span className="text-muted-foreground">{fr ? 'Aucun produit enregistré' : 'None recorded'}</span>}</div>
    </header>
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" aria-live="polite">{history.isPending ? <Loader2 className="mx-auto animate-spin text-muted-foreground" /> : history.isError ? <p role="alert" className="text-destructive">{fr ? 'Impossible de charger l’historique.' : 'Unable to load history.'}</p> : history.data.messages.length ? history.data.messages.map(m => <Message key={m.id} message={m} fr={fr} lang={lang} />) : <p className="py-12 text-center text-sm text-muted-foreground">{fr ? 'Aucun message dans cet historique.' : 'No messages yet.'}</p>}<div ref={bottom} /></div>
    <form className="space-y-2 border-t border-border p-4" onSubmit={e => { e.preventDefault(); void submit(); }}>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{c.channel !== 'internal' && <p className="text-xs text-warning">{fr ? 'Envoi indisponible : canal non activé.' : 'Sending unavailable: channel not activated.'}</p>}<div className="flex items-end gap-2"><Textarea aria-label={fr ? 'Message manuel' : 'Manual message'} placeholder={fr ? 'Votre réponse au client…' : 'Your reply to the customer…'} value={text} onChange={e => setText(e.target.value)} maxLength={4000} rows={2} disabled={closed || c.opted_out || history.isError || history.isPending} className="max-h-36 min-h-20 resize-y" /><Button type="submit" size="icon" title={fr ? 'Envoyer le message' : 'Send message'} aria-label={fr ? 'Envoyer le message' : 'Send message'} disabled={busy || !text.trim() || closed || c.opted_out || history.isError || history.isPending || c.channel !== 'internal'}>{busy ? <Loader2 className="animate-spin" /> : <Send />}</Button></div><div className="flex justify-between gap-2 text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><UserRound className="size-3" />{fr ? 'Vendeur humain' : 'Human seller'}</span><span>{text.length}/4000</span></div></form>
  </section>;
}

function Message({ message: m, fr, lang }: { message: History['messages'][number]; fr: boolean; lang: string }) {
  const decision = m.decision && typeof m.decision === 'object' && !Array.isArray(m.decision) ? m.decision : null;
  const mode = decision?.['mode'];
  if (mode) return <p className="py-1 text-center text-xs text-muted-foreground">{mode === 'human' ? (fr ? 'Le vendeur a pris la main · IA suspendue' : 'Seller took over · AI paused') : mode === 'active' ? (fr ? 'Le vendeur a repris avec l’IA' : 'Seller resumed AI') : (fr ? 'Conversation terminée' : 'Conversation closed')} · {new Date(m.created_at).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })}</p>;
  const client = m.author === 'client'; const ai = m.author === 'ai';
  const author = client ? (fr ? 'Client' : 'Customer') : ai ? (fr ? 'Assistant IA' : 'AI assistant') : m.author === 'human' ? (fr ? 'Vendeur humain' : 'Human seller') : (fr ? 'Système' : 'System');
  const state = m.status === 'internal' ? (fr ? 'Interne' : 'Internal') : m.status === 'accepted' ? (fr ? 'Accepté · livraison non confirmée' : 'Accepted · delivery unconfirmed') : m.status === 'read' ? (fr ? 'Lu' : 'Read') : m.status === 'delivered' ? (fr ? 'Livré' : 'Delivered') : m.status === 'failed' ? (fr ? 'Échec' : 'Failed') : m.status === 'sent' ? (fr ? 'Envoyé' : 'Sent') : '';
  return <article className={cn('flex', client ? 'justify-start' : 'justify-end')}><div className={cn('max-w-[90%] space-y-2 rounded-lg border px-3 py-2.5 sm:max-w-[80%]', client ? 'border-border bg-surface-2' : ai ? 'border-primary/25 bg-primary/10' : 'border-border bg-background')}><div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">{ai ? <Bot className="size-3.5 text-primary" /> : <UserRound className="size-3.5" />}{author}</div><p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{m.content}</p><div className="flex flex-wrap items-center justify-end gap-1 text-[10px] text-muted-foreground"><time>{new Date(m.created_at).toLocaleString(lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>{state && <><span>· {state}</span>{m.status === 'delivered' || m.status === 'read' ? <CheckCheck className="size-3 text-primary" /> : null}</>}</div>{m.error && <p className="text-xs text-destructive">{m.error}</p>}</div></article>;
}