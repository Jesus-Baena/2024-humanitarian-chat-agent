# Copilot Instructions for Humanitarian Chat Application

## Big Picture
- Nuxt 4 app under `app/` with Nuxt UI + Nuxt UI Pro dashboard shell; primary flow is a humanitarian chat that streams AI replies.
- Persistence lives in Supabase `web` schema (`chats`, `messages`, `profiles`); Flowise SSE powers completions via `app/composables/useAssistants.ts`.
- Dockerfile is multi-stage on Node 22 + `pnpm@10.13.1`; Docker Swarm stack in `docker-compose.yml` deploys alongside other baena.ai services.

## Server API Layer
- Handlers in `server/api/**` always call `getSupabaseServerClient()` + `.schema('web')`, mixing authenticated `user_id` and anonymous `session_id` from `getOrCreateSessionId()` for ownership checks.
- `chats.post.ts` and `chats/[id]/messages.post.ts` bootstrap new chats, trim titles to 80 chars, and stamp `updated_at`; `me.get.ts` tolerates anonymous access.
- Use `server/api/chats-debug.get.ts` when diagnosing Supabase auth or RLS issues—it logs every stage but mirrors the production query.

## Composables & Client Flow
- `useChat.ts` orchestrates history fetch, local sequencing, and Flowise streaming with `MAX_CONTEXT_PAIRS = 10`; it persists every message via `/api/chats/{id}/messages` before streaming.
- `useAssistants.ts` reads Flowise URL/API key from runtime config or Vite env, wraps SSE/JSON responses, and ensures Bearer auth headers when keys exist.
- `useUser.ts` (and `UserMenu.vue`) expect `NUXT_PUBLIC_AUTH_BASE`/`NUXT_PUBLIC_LOGOUT_PATH`; they fetch `/api/me` with credentials to refresh Supabase cookies across subdomains.

## UI Patterns
- Root layout `app/layouts/default.vue` wires `UDashboardSidebar` with `useChatsList()`; sidebar refresh button hits `/api/chats` and respects loading state.
- `ChatWindow.vue` renders markdown via `<MDC>` and surfaces stream state (`isTyping`, retry/cancel) from `useChat`; `HelpPrompt.vue` seeds new chats using query strings.
- Theme tokens live in `app/app.config.ts` and `app/assets/css/main.css`; Tailwind scanning resides in `tailwind.config.ts`.

## Workflows & Tooling
- Always use pnpm: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`; `pnpm install` adheres to the pinned lockfile.
- Required env: Supabase (`NUXT_PUBLIC_SUPABASE_URL/ANON_KEY`, `SUPABASE_*`), Flowise (`NUXT_PUBLIC_FLOWISE_URL`, `NUXT_PUBLIC_FLOWISE_API_KEY`), `NUXT_UI_PRO_LICENSE` for builds.
- `README_NEW.md` documents current setup; `README.md` is legacy Supabase CLI content kept for reference and can be ignored when onboarding.

## Deployment & Ops
- Swarm entrypoint (`docker-compose.yml`) shells env secrets from `/run/secrets` before starting `.output/server/index.mjs`; avoid echoing sensitive values beyond short prefixes.
- `server/utils/supabase.ts` and `server/utils/session.ts` compute cookie domains like `.baena.ai`—preserve this for cross-subdomain auth stability.
- No migrations are checked in; coordinate schema changes outside the repo to keep `web.chats/messages/profiles` aligned with API expectations.