# API Documentation

Base URL: `http://localhost:3000` (production: your deployed domain)

All dashboard endpoints require the `X-API-Key` header matching `DASHBOARD_API_KEY`.

## Health

```
GET /health
```

**Response 200**

```json
{ "status": "ok", "timestamp": "2026-05-24T12:00:00.000Z" }
```

## GitHub Webhook

```
POST /webhook
```

| Header | Description |
|--------|-------------|
| `X-Hub-Signature-256` | HMAC SHA-256 signature |
| `X-GitHub-Event` | Event type (`pull_request`, `installation`, `ping`) |
| `X-GitHub-Delivery` | Unique delivery ID (idempotency) |

**Body:** Raw JSON from GitHub (must not be parsed before signature verification).

**Response:** `200 OK` on success, `401` on invalid signature.

## Dashboard API

### Get installation overview

```
GET /api/installations/:githubInstallationId
```

**Response 200**

```json
{
  "installation": {
    "id": 1,
    "github_installation_id": 12345,
    "account_login": "my-org",
    "account_type": "Organization"
  },
  "repos": [],
  "usage": {
    "total_reviews": 42,
    "total_comments": 128,
    "total_tokens": 95000,
    "avg_duration_ms": 8200
  },
  "recentReviews": []
}
```

### Get repo settings

```
GET /api/installations/:githubInstallationId/repos/:owner/:repo
```

### Update repo settings

```
PATCH /api/installations/:githubInstallationId/repos/:owner/:repo
```

**Body (all fields optional)**

```json
{
  "enabled": true,
  "review_level": "standard",
  "ignored_paths": ["docs/", "*.generated.ts"],
  "assign_reviewer": "senior-dev"
}
```

`review_level`: `strict` | `standard` | `light`
