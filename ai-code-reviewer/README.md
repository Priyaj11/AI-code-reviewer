# AI Code Review Bot (GitHub App)

A production-ready GitHub App that automatically reviews pull requests using an LLM, posts inline comments on GitHub, and provides a React settings dashboard for per-repo configuration and usage analytics.

## Architecture

```
GitHub PR event → POST /webhook (verify + enqueue <10s)
                      ↓
              BullMQ Worker (Redis)
                      ↓
         Fetch diff (Octokit) → Chunk → LLM (OpenAI or Anthropic)
                      ↓
         Post inline review (GitHub API) + audit log (PostgreSQL)
```

### Technology choices

| Technology | Why |
|------------|-----|
| **Node.js + TypeScript** | Native fit for GitHub webhooks, strong typing for API payloads |
| **Express** | Lightweight HTTP server; raw body support for HMAC verification |
| **BullMQ + Redis** | Reliable job queue with retries, concurrency limits, idempotency |
| **PostgreSQL** | Durable storage for installations, per-repo settings, review audit trail |
| **OpenAI / Anthropic** | Pluggable LLM providers — switch via `LLM_PROVIDER` env var |
| **Octokit** | Official GitHub API client with App authentication |
| **React + Vite** | Fast settings dashboard with API proxy for local dev |

## Project structure

```
ai-code-reviewer/
├── src/
│   ├── server.ts           # Express entry (webhook + API + dashboard)
│   ├── config.ts           # Validated environment config
│   ├── webhooks/           # Signature verification + event routing
│   ├── workers/            # BullMQ queue + review worker
│   ├── github/             # Octokit client, diff fetch, comment posting
│   ├── llm/                # Chunking, prompts, OpenAI + Anthropic providers
│   ├── db/                 # PostgreSQL schema, queries, Redis helpers
│   ├── api/                # Dashboard REST API
│   └── dashboard/          # React settings UI
├── tests/                  # Unit tests (Vitest)
├── docs/                   # API + debugging guides
└── docker-compose.yml      # Postgres + Redis
```

## Prerequisites

- Node.js 18+
- Docker (for Postgres + Redis)
- GitHub App credentials ([create app guide](#github-app-setup))
- OpenAI **or** Anthropic API key ([provider guide](docs/LLM_PROVIDERS.md))

## Quick start

### 1. Clone and install

```bash
cd ai-code-reviewer
npm install
cp .env.example .env
# Edit .env with your credentials
```

### 2. Start infrastructure

```bash
docker compose up -d
npm run db:migrate
```

### 3. Run the server

```bash
npm run dev
```

The server starts the webhook handler, API, embedded worker, and serves the dashboard after build.

### 4. Expose locally (development)

```bash
npx ngrok http 3000
```

Set the ngrok HTTPS URL as your GitHub App webhook: `https://<subdomain>.ngrok.io/webhook`

### 5. Dashboard (development)

```bash
# Terminal 2
npx vite --config vite.dashboard.config.ts
```

Open `http://localhost:5174` and enter your GitHub **Installation ID** (from the installation URL or API).

## Environment variables

See [`.env.example`](.env.example). Required:

- `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`
- `LLM_PROVIDER` (`openai` or `anthropic`) + matching API key
- `DATABASE_URL`, `REDIS_URL`

**Using Anthropic (Claude):**

```bash
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-3-5-haiku-20241022
```

See [docs/LLM_PROVIDERS.md](docs/LLM_PROVIDERS.md) for model recommendations.

## GitHub App setup

1. **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App**
2. **Webhook URL:** `https://your-domain.com/webhook`
3. **Permissions:**
   - Pull requests: Read & Write
   - Contents: Read
4. **Events:** `pull_request`, `installation`
5. Generate and download the **private key** (.pem)
6. Install the app on a test repository

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API + worker (watch mode) |
| `npm run worker` | Worker only (separate process) |
| `npm run build` | Compile TypeScript + dashboard |
| `npm start` | Run production build |
| `npm test` | Run unit tests |
| `npm run db:migrate` | Apply PostgreSQL schema |
| `npm run lint` | Typecheck |

## Testing strategy

Unit tests cover security-critical and algorithmic paths:

- **Webhook HMAC verification** — timing-safe signature checks
- **Diff chunking** — large PR splitting, token budget
- **Comment deduplication** — severity precedence
- **File filtering** — lockfiles, generated assets

```bash
npm test
```

Integration testing requires real GitHub + OpenAI credentials; use a private test repo and inspect PR comments.

## API documentation

See [docs/API.md](docs/API.md).

## Debugging

See [docs/DEBUGGING.md](docs/DEBUGGING.md).

## Security

- Webhook HMAC verification with `crypto.timingSafeEqual`
- Raw body parsing only on `/webhook`
- Dashboard API protected by `X-API-Key`
- Helmet security headers
- Secrets via environment variables (never committed)
- Idempotent webhook delivery handling (Redis `SET NX`)

## Future improvements

- [x] Anthropic Claude provider (see `docs/LLM_PROVIDERS.md`)
- [ ] Org-wide default rules templates
- [ ] Rate limit dashboard per installation
- [ ] Slack/email notifications for critical findings
- [ ] Fine-tuned review prompts per language (Go, Rust, Python)
- [ ] GitHub Checks API integration for required status
- [ ] Horizontal worker scaling with dedicated worker processes
- [ ] Encrypted storage for installation tokens (if using OAuth fallback)

## Resume highlights

This project demonstrates:

- GitHub App development (webhooks, installation auth, inline reviews)
- Async job processing with retries and idempotency
- LLM context-window management via diff chunking
- Full-stack delivery (API + React dashboard + PostgreSQL analytics)

## License

MIT
