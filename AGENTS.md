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
