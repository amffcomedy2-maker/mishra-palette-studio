<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Admin access is a server-verified PIN (PBKDF2 hash in `admin_auth`) that issues an HMAC-signed session token (`ADMIN_SESSION_SECRET`); every admin server function/route calls `requireAdmin(token)` — the panel has no Supabase auth users by design.
- Private tables (`api_integrations`, `admin_auth`, `login_attempts`, `translation_cache`) have no anon/authenticated grants; only server code with the service role touches them, so API keys never reach the browser.
- Public pages read visible `posts` (anon RLS) and `site_settings` (no anon grant; server key, card columns only) via `getPublicData`; live updates are a data-free `realtime.send` broadcast (`site-content` topic, `changed` event) from the `bump_content_version` trigger; `content_version` itself has no anon grant.
- Third-party API keys (ImgBB, Cloudinary, Gemini, custom webhooks) are managed by the admin in the database, not project secrets; failover order comes from `orderActiveIntegrations`.
- Translation uses admin-added Gemini keys first and falls back to the Lovable AI Gateway; results are cached in `translation_cache`. Wrap visible text in `useT()`'s `t()`.
- The visiting card uses only fixed `vc-*` tokens (no color-mix/backdrop-filter) so html2canvas-pro renders the PNG identically in both themes.
- Facebook embeds store only a validated `www.facebook.com/plugins/...` iframe src, never raw pasted HTML.
- No `attachSupabaseAuth` in `src/start.ts` and no generated browser Supabase client on public pages: both read localStorage, which throws when storage is blocked (iframes/private mode) and blanks the site; realtime uses the storage-free `getRealtimeClient()`.
