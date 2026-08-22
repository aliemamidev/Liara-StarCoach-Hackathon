# Liara Documentation Companion

![StarCoach 2 Kilo Bananas team](./team-photo.webp)

## StarCoach 2 Kilo Bananas

This project was built by **StarCoach 2 Kilo Bananas** for the **Vibe-Coding hackathon** at [StarCoach](https://starcoach.ir/). The team focused on making Liara's documentation easier to navigate, easier to search, and easier to use when a user is blocked by a deployment or infrastructure problem.

Liara is a documentation companion and support workspace built around a forked and adapted copy of the public [liara-cloud/docs](https://github.com/liara-cloud/docs) documentation project. It keeps the documentation corpus, adds an AI support agent named **Lia**, and adds an administration surface for observing conversations, reviewing unanswered questions, maintaining verified knowledge, and escalating difficult cases to a human.

> **Competition context:** This repository is a three-day hackathon prototype. It was produced under severe time constraints and has known bugs, incomplete hardening, rough edges, and unverified production assumptions. It is not recommended for production use without a security review, dependency review, database backup plan, observability, load testing, and a complete operational runbook.

## Team

| Member | Role and background |
| --- | --- |
| **Ali Emami** | Team lead and full-stack developer; four years of specialized robotics experience and familiar with DevOps. |
| **Mohammad Parsa Hosseini** | Bachelor's student in Computer Engineering at Sharif University of Technology. |
| **Parsa Abedi** | Bachelor's student in Computer Engineering at the University of Tehran. |

## Why this project exists

The upstream documentation contains a large amount of useful material, but a user who is already facing an incident usually needs more than a list of pages. The intended experience is:

1. Ask a question in natural language.
2. Let Lia classify the request and decide whether it needs clarification, a screenshot, documentation search, web search, known admin knowledge, or escalation.
3. Retrieve the most relevant documentation and verified knowledge.
4. Generate a grounded answer only when the retrieved evidence is strong enough.
5. Show the conversation and failure signals to administrators so the documentation and knowledge base can improve over time.

The result is deliberately more than a static documentation site: it is a documentation search layer, an AI-assisted support workflow, a knowledge feedback loop, and an operational admin panel in one Next.js application.

## What was added during the hackathon

The commit history shows the project growing from the forked documentation application into the following system:

- **Documentation indexing and retrieval:** A local corpus under `public/llms` is split into searchable documents and chunks. The application supports local search, an optional Meilisearch-backed online index, query normalization, Persian/English aliases, stop-word removal, technical-term handling, domain boosts, result formatting, URL validation, and sensitive-text redaction.
- **Lia Agent:** `createLiaControllerPlan()` routes a question through stages such as answer, clarification, screenshot-required, probable answer, unanswered, out-of-scope, and escalation. The agent can use documentation, verified admin knowledge, and optional web search before drafting a response.
- **Grounded answer checks:** The response path includes source-aware prompting, draft validation, unsafe-answer checks, a strict retry, and escalation when a reliable answer cannot be produced. The system is designed to prefer a safe escalation over a confident unsupported answer.
- **Chat persistence:** Chats and messages are stored in PostgreSQL through Prisma. Registered admin sessions and anonymous visitor owner tokens let the system associate a conversation with its owner without forcing every visitor to register.
- **Admin authentication:** Admin credentials are stored as password hashes, sessions are stored as HMAC-hashed tokens, cookies are HTTP-only, sessions expire after eight hours, and server-side checks require an active `ADMIN` user.
- **Admin dashboard:** The dashboard aggregates recent chats, response status, unresolved topics, failed responses, recent activity, topic labels, account counts, configuration state, and pending escalation tickets.
- **Brain/verified knowledge:** Admins can answer an escalation and optionally save the answer as an active `KnowledgeEntry`. Lia can reuse those entries in future conversations, including source references and a usage counter.
- **Escalation workflow:** Unknown or unsafe questions can become one pending ticket per chat. The ticket stores a sanitized conversation snapshot, attachment metadata, search trace, the clarified question, optional guest contact details, and the eventual admin answer.
- **Human-in-the-loop contact flow:** Guest visitors are asked for a name and Iranian mobile number only when contact is needed. Persian and Arabic numerals are normalized, and the number is validated before the escalation is created.
- **Real-time updates:** The custom Node HTTP server attaches a WebSocket server at `/api/realtime`; admin clients can receive events such as `escalation.created`.
- **Product and admin UX:** Multiple commits added responsive chat layouts, mobile fixes, scroll behavior, theme/dark-mode improvements, toast feedback, attachments, screenshots, speech/voice-related UI, chat history, link previews, and a more complete admin navigation.
- **Regression checks:** The repository contains lightweight Node regression and auth checks in addition to the application build and lint scripts.

### Commit-derived milestones

| Commit | Observed milestone |
| --- | --- |
| `3192104` / `1ff8ecf` | Established the adapted documentation application, search/indexer, chat surface, deployment files, and initial AI integration. |
| `e101672` | Introduced the first Lia controller/persona flow and documentation-search API. |
| `6fa1e54` | Added the first admin page and dashboard foundation. |
| `f79c677` | Added admin authentication, Prisma models, password hashing, sessions, and auth checks. |
| `1801155` | Added brain, escalation, web-search, admin API, and the first human-in-the-loop workflow. |
| `6d19838` | Added admin settings, profile endpoints, topic configuration, and a major admin UI pass. |
| `4b05af5` / `e96b9fb` | Added database-backed documentation knowledge indexing, synchronization, metadata, and stronger Lia evidence handling. |
| `6429916` | Refined the AI controller and documentation search and updated regression coverage. |
| `4cb6c36` | Continued escalation/chat UX improvements and the latest scroll and message behavior fixes at the time of writing. |

## Architecture

```text
Browser
  ├─ Documentation pages and chat UI
  ├─ Admin UI
  └─ Optional WebSocket client (/api/realtime)
          │
          ▼
Next.js pages/API routes + custom Node HTTP server
  ├─ Chat owner/session resolution
  ├─ Lia controller and response validation
  ├─ Documentation search and online fallback
  ├─ Knowledge/brain lookup
  ├─ Escalation and admin APIs
  └─ Realtime event publishing
          │
          ├─ Prisma → PostgreSQL
          │    ├─ users and sessions
          │    ├─ chats and messages
          │    ├─ documentation and chunks
          │    ├─ verified knowledge
          │    └─ escalation tickets
          │
          ├─ Local files → document synchronizer/indexer
          ├─ Meilisearch → optional online documentation index
          └─ OpenAI-compatible provider / optional Tavily web search
```

## Authentication and ownership

### Admin login

- `POST /api/auth/login` accepts an email and password.
- Email input is normalized and must pass the application's email validator; passwords must be at least eight characters.
- A configured admin can be bootstrapped on first login when the submitted credentials match `ADMIN_EMAIL` and `ADMIN_PASSWORD`; the normal deployment path should use `prisma/seed.mjs` instead.
- Passwords are hashed with Node's `scrypt` using a random salt. The stored format is `scrypt:<salt>:<derived-key>`.
- A random session token is issued to an HTTP-only `liara_admin_session` cookie. Only an HMAC-SHA-256 hash of the token is stored in the `Session` table.
- Sessions last eight hours and are rejected when expired, deleted, inactive, or not assigned the `ADMIN` role.
- `POST /api/auth/logout` deletes the server-side session and clears the cookie.

### Visitor chat ownership

Authenticated admins own chats through `userId`. Anonymous visitors receive a random `liara_chat_owner` cookie; only its SHA-256 hash is stored in the `Chat.ownerTokenHash` column. Every chat lookup is scoped either to the authenticated user or to that owner hash. This prevents a visitor from selecting another visitor's chat by changing a client-side ID alone.

### Input and attachment limits

The chat validator limits messages to 50, text to 20,000 characters, files to four, and each file to four MiB. Escalation snapshots keep only the most recent 20 messages, cap message text, and preserve data URLs only when their type and length pass the configured checks.

## Data model

| Model | Purpose |
| --- | --- |
| `User` | Admin identity, role, activation state, and relationships. |
| `Session` | HMAC-token-backed admin login sessions with expiry. |
| `Chat` / `Message` | Persistent conversation ownership, parts, timestamps, and response metadata. |
| `KnowledgeDocument` / `KnowledgeChunk` | Synced documentation documents and searchable chunks. |
| `KnowledgeEntry` | Human-verified question/answer pairs used by Lia's brain. |
| `EscalationTicket` | Pending, answered, or closed human-review requests with sanitized evidence. |
| `AdminSettings` | Flags for unknown-topic capture, web search, probable answers, failure notifications, and auto-escalation. |

## Technology inventory

| Area | Technology or implementation |
| --- | --- |
| Application | Node.js, Next.js 14, React 18, JavaScript/JSX, custom Node `http` server. |
| Styling/UI | Tailwind CSS, Radix UI primitives, Lucide/React Icons, Vazirmatn font, custom theme CSS. |
| AI | Vercel AI SDK (`ai`), `@ai-sdk/openai-compatible`, configurable OpenAI-compatible provider, streaming UI messages. |
| Search | Local document/chunk scoring, optional Meilisearch client, indexer crawlers, online fallback search. |
| Persistence | PostgreSQL accessed through Prisma 7 and `@prisma/adapter-pg`. |
| Authentication | Node `crypto` scrypt, HMAC-SHA-256 session token hashes, HTTP-only cookies. |
| Realtime | `ws` WebSocket server attached to the custom HTTP server. |
| Web search | Optional Tavily-compatible provider with allowed-domain controls. |
| Documentation | MDX/Markdown corpus, generated LLM-friendly files, asciicast walkthroughs, sitemap generation. |
| Operations | Docker multi-stage build, Liara deployment configuration, Nginx configuration, Husky pre-commit hooks. |
| Verification | ESLint, Node test runner regression checks, auth checks, Prisma migrations and seed script. |

## Repository layout

- `src/pages/` — Next.js pages and API routes.
- `src/components/chat/` — chat layout, history, composer, messages, attachments, screenshots, and settings.
- `src/components/admin/` — dashboard, brain, escalation, profile, and settings panels.
- `src/lib/lia-controller.js` — routing and evidence-aware response plan.
- `src/lib/docs-search.js` — local/online documentation retrieval and redaction.
- `src/lib/lia-brain.js` — verified knowledge lookup.
- `src/lib/lia-escalations.js` — ticket creation, deduplication, answering, and knowledge promotion.
- `src/lib/auth*.js` — password, session, admin access, and owner handling.
- `indexer/` — documentation crawlers and Meilisearch indexing support.
- `prisma/` — schema, migrations, and seed.
- `public/llms/` — generated documentation corpus.
- `scripts/` — synchronization, auth, and regression utilities.

## Local development

### Requirements

- Node.js 18 or a compatible newer LTS runtime.
- PostgreSQL.
- An AI provider compatible with the configured OpenAI-compatible endpoint, if generated answers are required.
- Optional Meilisearch and Tavily credentials for online/fallback search.

### Setup

```bash
cp .env.example .env.local
npm ci
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run dev
```

The default development server is exposed by the custom server. Check `PORT` in the environment and use the configured `DATABASE_URL`. Replace every example secret before sharing the application or deploying it.

### Important environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. |
| `SESSION_SECRET` | At least 32 characters; used to HMAC session tokens. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Seed/bootstrap admin credentials. |
| `LIARA_AI_BASE_URL`, `LIARA_AI_MODEL`, `LIARA_AI_API_KEY` | AI provider configuration. |
| `LIARA_DOCS_SEARCH_URL`, `LIARA_DOCS_SEARCH_KEY` | Optional online documentation search. |
| `WEB_SEARCH_PROVIDER`, `WEB_SEARCH_KEY` | Optional web-search fallback. |
| `WEB_SEARCH_ALLOWED_DOMAINS` | Domain allow-list for web results. |

### Useful scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test:regression
npm run test:auth
npm run db:sync-docs
npm run db:seed
```

## Known limitations and production warning

This is a hackathon deliverable, not a production support platform. Among the known risk areas are incomplete threat modeling, external AI/provider dependency, unverified search quality, evolving database migrations, limited rate limiting and abuse controls, lack of a full observability stack, no load/performance evidence, and possible UX or mobile regressions. AI answers may still be incomplete, and a documentation index can become stale unless synchronization is run.

Do not use this repository as a production support system, customer-data store, or security boundary without independent review. Use synthetic data during evaluation, rotate all secrets, configure HTTPS, restrict provider domains, back up PostgreSQL, review cookie settings, and verify every migration and external integration first.

## Upstream and attribution

The documentation foundation is derived from and adapted from [liara-cloud/docs](https://github.com/liara-cloud/docs). This repository's hackathon additions, including Lia, the admin workflows, database schema changes, search integration, and UI changes, were developed by StarCoach 2 Kilo Bananas. Upstream files may have their own copyright and licensing requirements; review upstream notices before redistributing them.

## License and ethical use

The hackathon additions in this repository are covered by the accompanying [`LICENSE`](./LICENSE). The license is intentionally permission-based: copying, redistributing, deploying, selling, or reusing the team's code without written permission from the team's developers is unauthorized and unethical, especially because the work was created specifically for a competition. Request permission before using it. This notice does not replace or modify the license obligations of upstream Liara documentation assets.

See [`ABOUT.md`](./ABOUT.md) for the compact project profile.
