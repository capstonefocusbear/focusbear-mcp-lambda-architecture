# Skill: admiral-roadmap-sentry

**Purpose:** Enable Admiral Roadmap to monitor Sentry error feeds across all Focus Bear platforms, triage errors by priority (P0–P3), and automatically create GitHub issues in Focus-Bear/backend.

---

## Prerequisites

The following environment variables must be set on the OpenClaw VPS (e.g. in `/home/openclaw/.openclaw/.env`):

```bash
SENTRY_AUTH_TOKEN=<Sentry Internal Integration token with project:read and issue:read scopes>
SENTRY_ORG_SLUG=focus-bear   # confirm exact slug from your Sentry URL
```

The `gh` CLI must be authenticated with access to `Focus-Bear/backend`.

See **Sentry Access Setup** section below for jeznag's setup steps.

---

## Workflow

**TRIGGER:** On-demand or scheduled (e.g. daily at 09:00 UTC via cron/heartbeat).

**STEPS:**

1. **Verify environment** — check `SENTRY_AUTH_TOKEN` and `SENTRY_ORG_SLUG` are present. Fail fast if missing.

2. **For each platform** in `[backend, mac, windows, android, ios]`:
   a. Run `sentry-fetch.sh <platform_slug>` to retrieve recent unresolved issues (last 24h).
   b. For each returned issue:
      - Check the deduplication file at `~/.openclaw/admiral-roadmap-sentry/filed-issues.json`. Skip if already filed.
      - Apply the **Priority Rubric** (see `triage.md`) to determine P0–P3.
      - **P0 / P1:** Create a GitHub issue immediately.
      - **P2:** Create a GitHub issue if `userCount > 3`.
      - **P3:** Skip (batch digest is a future enhancement).
   c. Create the GitHub issue using:
      ```bash
      gh issue create \
        --repo Focus-Bear/backend \
        --title "[P{N}][{PLATFORM}] {sentry_title}" \
        --body "$(cat github-issue-template.md | envsubst)" \
        --label "bug,openclaw,P{N}"
      ```
   d. Record the mapping in `~/.openclaw/admiral-roadmap-sentry/filed-issues.json`:
      ```json
      { "sentry_issue_id": "github_issue_number" }
      ```

3. **Log summary:** N issues triaged, M filed, timestamps.

---

## Deduplication

Local JSON tracking prevents duplicate GitHub issues:

- **File:** `~/.openclaw/admiral-roadmap-sentry/filed-issues.json`
- **Format:** `{ "<sentry_issue_id>": "<github_issue_number>" }`
- Check before filing; update after filing.
- Initialize the file if it doesn't exist: `echo '{}' > ~/.openclaw/admiral-roadmap-sentry/filed-issues.json`

---

## Platform → Sentry Project Slug Mapping

> ⚠️ These slugs must be confirmed with jeznag. Update `sentry-fetch.sh` once confirmed.

| Platform | Sentry Project Slug (placeholder) |
|---|---|
| backend | `focus-bear-backend` |
| mac | `focus-bear-mac` |
| windows | `focus-bear-windows` |
| android | `focus-bear-android` |
| ios | `focus-bear-ios` |

---

## Sentry Access Setup (instructions for jeznag)

### Step 1: Create a Sentry Internal Integration token

1. Go to **Sentry → Settings → Developer Settings → Internal Integrations**
2. Create a new integration named `openclaw-admiral-roadmap`
3. Grant permissions: **Project: Read**, **Issue & Event: Read**
4. Copy the generated **Auth Token**

### Step 2: Add the token to the OpenClaw VPS

SSH into the OpenClaw VPS and add to the environment config:

```bash
echo 'SENTRY_AUTH_TOKEN=<paste token here>' >> /home/openclaw/.openclaw/.env
echo 'SENTRY_ORG_SLUG=focus-bear' >> /home/openclaw/.openclaw/.env
```

Then restart the OpenClaw gateway:
```bash
openclaw gateway restart
```

### Step 3: Verify Sentry project slugs

```bash
curl -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  "https://sentry.io/api/0/organizations/${SENTRY_ORG_SLUG}/projects/" | jq '.[].slug'
```

Update `PLATFORM_SLUGS` in `sentry-fetch.sh` with the confirmed slugs.

### Step 4: Initialize deduplication file

```bash
mkdir -p ~/.openclaw/admiral-roadmap-sentry
echo '{}' > ~/.openclaw/admiral-roadmap-sentry/filed-issues.json
```

---

## Files in This Skill

| File | Purpose |
|---|---|
| `SKILL.md` | This file — workflow entrypoint |
| `sentry-fetch.sh` | Shell script wrapping the Sentry REST API |
| `triage.md` | Priority rubric (P0–P3) for Admiral Roadmap |
| `github-issue-template.md` | Template for filed GitHub issues |

---

## Rate Limits

Sentry API allows ~100 requests per 10 seconds on free plans. With 5 platforms, we make at most 5 requests per run — well within limits.

---

## Acceptance Criteria

- [ ] Skill is loadable by OpenClaw
- [ ] `sentry-fetch.sh` retrieves issues from all 5 platforms when `SENTRY_AUTH_TOKEN` is set
- [ ] Admiral Roadmap can be triggered and produces GitHub issues with correct format
- [ ] Issues labelled with `openclaw`, `bug`, and priority label (`P0`–`P3`)
- [ ] Duplicate Sentry errors are not filed twice
- [ ] No hardcoded secrets in any skill files
