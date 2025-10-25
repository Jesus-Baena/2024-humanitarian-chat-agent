# Copilot instructions for this repo

## Big picture
- Nuxt 4 app in `app/` using Nuxt UI + Nuxt UI Pro. Core flow: a humanitarian chat that persists messages in Supabase and streams AI replies from Flowise.
- Data lives in Supabase schema `web`: tables `chats`, `messages`, `profiles`. Server routes enforce ownership via `user_id` (logged in) or `session_id` (anonymous cookie).
- Completions are requested via `app/composables/useAssistants.ts` (SSE or JSON) and rendered live through `useChat.ts` → `ChatWindow.vue` using `<MDC>` for markdown.
- Built with Node 22 + pnpm; multi-stage Docker builds are defined in `Dockerfile`. Deployment is via Docker Swarm in production.

## Server API patterns
- Every handler creates a client with `getSupabaseServerClient(event)` and queries with `.schema('web')`.
- Ownership model: fetch auth user with `supabase.auth.getUser()`, derive `profile_id` via `getOrCreateProfileId()`, and always include a fallback `session_id` from `getOrCreateSessionId()`.
- Example: `server/api/chats/[id]/messages.post.ts` will create a chat if missing, trim the title to 80 chars based on the first line, insert the message, and update `updated_at`. Anonymous requests are allowed but constrained by `session_id`.
- Use `server/api/chats-debug.get.ts` to diagnose RLS/auth issues. It mirrors the production query and logs each stage (client, auth, session, query).

## Client flow and composables
- `useChat.ts`: orchestrates chat history fetch (`/api/chats/{id}/messages`), local sequencing, and streaming. Context window is trimmed to `MAX_CONTEXT_PAIRS = 10`. User messages are persisted before streaming; assistant messages are persisted after stream end. Includes SSE parsing, token accumulation, echo suppression, and a 40ms batched UI flush.
- `useAssistants.ts`: reads `public.flowiseUrl` and `public.flowiseApiKey` from runtime config or Vite env (`NUXT_PUBLIC_FLOWISE_URL`, `NUXT_PUBLIC_FLOWISE_API_KEY`). Sets `Accept: text/event-stream, application/json` and adds `Authorization: Bearer` when the key exists. Supports streaming or JSON fallback and normalizes response shapes.
- `useUser.ts`: fetches `/api/me` with `credentials: 'include'` and supports cross-subdomain auth by redirecting to a central logout when `public.authBase/logoutPath` are configured.

## UI conventions
- `app/layouts/default.vue` wires the dashboard shell and chats list via `useChatsList()`; the sidebar refresh hits `/api/chats`.
- `ChatWindow.vue` renders markdown with `<MDC>` and exposes stream state (typing indicator, cancel/retry) from `useChat`. `HelpPrompt.vue` can seed a new chat via query string.
- Theme tokens live in `app/app.config.ts` and `app/assets/css/main.css`. Tailwind content scanning is defined in `tailwind.config.ts`.

## Dev workflow (pnpm only)
- Scripts: `pnpm dev`, `pnpm build`, `pnpm preview`, `pnpm lint`, `pnpm typecheck`. Lockfile is pinned; use the included Node/pnpm versions (see `Dockerfile`).
- Required env (client-side at build time): `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_KEY` or `NUXT_PUBLIC_SUPABASE_ANON_KEY`, `NUXT_PUBLIC_FLOWISE_URL`, `NUXT_PUBLIC_FLOWISE_API_KEY`, and `NUXT_UI_PRO_LICENSE`.
- Required env (server runtime): `SUPABASE_URL`, `SUPABASE_KEY` or legacy `SUPABASE_ANON_KEY`, and optional `SUPABASE_SECRET_KEY`/`SUPABASE_SERVICE_ROLE_KEY`. New and legacy key formats are supported in `nuxt.config.ts` and `server/utils/supabase.ts`.
- Client-side `NUXT_PUBLIC_*` must be set as GitHub Actions Secrets for CI/CD since they’re baked into the build; Docker Swarm secrets alone aren’t sufficient for client code.

## Deployment and ops
- Multi-stage build with Node 22 + `pnpm@10.13.1`; the runtime starts `.output/server/index.mjs` (Nitro node-server). Swarm injects secrets via env (or `/run/secrets`).
- Cookie domain is computed to the parent domain (e.g., `.baena.ai`) in `server/utils/supabase.ts` and `server/utils/session.ts` to share auth across subdomains. Keep this logic intact.
- No SQL migrations are committed. Coordinate schema changes externally to match `web.{chats,messages,profiles}` expectations and RLS policies.

## Integration with main portfolio
- Deployed as subdomain `chat.baena.ai` linked from main `baena.ai` portfolio navigation
- Shares Supabase auth seamlessly via `.baena.ai` cookie domain
- Main app repository: `Jesus-Baena/010-baena.ai-professional-portfolio` (Nuxt 4 + Nuxt UI Pro)
- Navigation integration via `AppHeader.vue` "AI Chat" link with featured styling
- Content integration via existing AI Chatbot project page with live demo link

## Handy debug points
- Supabase auth/queries: `server/api/chats-debug.get.ts`.
- Flowise connectivity: `app/pages/test-flowise.vue` (prints URL/key presence and attempts a test POST).

## Common task examples
- Add a new API route: create `server/api/your-route.get.ts` (or `.post.ts`), call `getSupabaseServerClient(event)`, compute `profileId`/`sessionId`, query with `.schema('web')`, and always enforce ownership (`user_id` or `session_id`).
- Call Flowise from the client: use `useAssistants().getCompletion(messages, signal)`; set `NUXT_PUBLIC_FLOWISE_URL` and optional `NUXT_PUBLIC_FLOWISE_API_KEY`.

References: `nuxt.config.ts`, `app/composables/{useChat.ts,useAssistants.ts,useUser.ts}`, `server/api/**`, `server/utils/**`, `tailwind.config.ts`, `Dockerfile`, and `docs/` (setup and troubleshooting).