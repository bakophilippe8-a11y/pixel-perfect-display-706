<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Conversations use authenticated server functions and owner-scoped reads; credentials never leave the server, preserving seller isolation.
- Conversation mode changes increment an automation epoch; AI decisions commit through a row-locked database function against that epoch, preventing stale replies after a handover.
- Manual outbound messages record their human author and explicit delivery state; inactive external channels must never report a message as sent.
- Facebook advertising uses the shared seller-owned campaign table for manual generation and automated proposals; edits revoke approval, and content approval never initiates publication or spending. Publishing a text post to the seller's Page is a separate, explicit, confirmed action allowed only on the exact approved text (atomic `publishing` claim, no automatic retry, no ad budget).
- AI replies are checked by a deterministic guard (`sales-guard.ts`): amounts, links, discounts and payment claims must match active products or seller guidelines, otherwise the conversation is transferred to a human. Opt-out messages are detected before any AI call.

- Campaign videos: one 8-second vertical AI clip per campaign (Gemini Omni Flash via the Gemini Interactions API, on the seller's own Google key; Veo 3.1 previews were shut down on 22 Oct 2026), generated in the background (background=true then polling the interaction) and copied into the private `campaign-videos` bucket (signed URLs only). Starting a video resets the approval, so the video is always part of what the seller approved. Publishing sends the video when ready, otherwise the text only.
- All AI calls use the seller's own Google (Gemini) API key, stored AES-GCM-encrypted in `seller_connections` (channel `ai`) and decrypted server-side only; the key is never returned to the browser or logged. No AI call goes through the Lovable gateway. Missing key → message pointing to Paramètres API; 401/403 → invalid key (AI paused until fixed); 429 → Google quota/billing exceeded. Daily caps (AI replies, ad drafts, videos) are per-seller settings on `sales_guidelines` with sane defaults.
