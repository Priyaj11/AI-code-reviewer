# Debugging Guide

## Enable verbose logs

```bash
LOG_LEVEL=debug npm run dev
```

Key log fields: `deliveryId`, `installationId`, `repo`, `prNumber`, `chunks`, `tokens`, `durationMs`.

## Webhook not firing

1. Confirm GitHub App webhook URL points to your server (`https://<host>/webhook`).
2. Use ngrok for local dev: `npx ngrok http 3000`
3. Check **Recent Deliveries** in GitHub App settings for HTTP status and response body.
4. Verify `GITHUB_WEBHOOK_SECRET` matches the app configuration.

## 401 Invalid signature

- Ensure Express uses `express.raw()` for `/webhook` only — JSON parser breaks HMAC.
- Secret must match GitHub App webhook secret exactly.
- Proxy must not modify the request body.

## Duplicate reviews

- Idempotency uses `X-GitHub-Delivery` in Redis (`delivery:<id>`, 24h TTL).
- Jobs also use deterministic `jobId` including `headSha` to dedupe BullMQ jobs.

## LLM errors

- Check `OPENAI_API_KEY` and model name (`OPENAI_MODEL`).
- Inspect worker logs for `LLM returned invalid JSON`.
- Large PRs: confirm chunker splits files (see `tests/chunker.test.ts`).

## Comments not appearing on PR

- Line numbers must reference **new file** lines in the diff; GitHub rejects invalid positions.
- The app falls back to individual `createReviewComment` calls when batch review fails.
- App needs **Pull requests: Read & Write** permission.

## Database / Redis

```bash
docker compose ps
docker compose logs postgres
docker compose logs redis
npm run db:migrate
```

## Manual job test

With Redis and Postgres running, enqueue via Redis CLI or trigger a real `pull_request` webhook from a test repo.

## Health check

```bash
curl http://localhost:3000/health
```
