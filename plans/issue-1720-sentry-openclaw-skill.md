# Plan: Set up an OpenClaw Skill for Admiral Roadmap to Check Sentry Errors and Raise GitHub Issues

**Issue:** [#1720](https://github.com/Focus-Bear/backend/issues/1720)  
**Planned by:** Monk of Modularity 🧘  
**Status:** Ready for Captain Codebeard

---

## 1. Problem Summary

Admiral Roadmap needs to automatically monitor Sentry error feeds for all Focus Bear platforms (Backend, Mac, Windows, Android, iOS), triage errors by priority, and create actionable GitHub issues — feeding them into the Monk of Modularity → Captain Codebeard pipeline.

This is primarily an **OpenClaw infrastructure/skill task** (not a NestJS backend feature), but the plan lives here because the issues it creates will be in this repo.

There are two deliverables:
1. **OpenClaw Skill** (`admiral-roadmap-sentry`) — the skill SKILL.md and supporting scripts that run on the OpenClaw VPS
2. **Sentry access setup** — instructions for `jeznag` to configure the Sentry auth token in the VPS environment

---

## 2. Proposed Approach

### Architecture

```
OpenClaw VPS (scheduled / on-demand)
  └── Admiral Roadmap agent
        └── admiral-roadmap-sentry skill
              ├── sentry-fetch.sh         ← calls Sentry API for each project
              ├── triage.md               ← classification rubric for Admiral Roadmap
              └── SKILL.md                ← skill entrypoint with workflow instructions

Admiral Roadmap (AI agent)
  1. Reads recent Sentry issues per project (via Sentry REST API)
  2. Applies priority rubric (P0–P3)
  3. Calls `gh issue create` in Focus-Bear/backend with structured body
  4. Labels issue with `openclaw`, `bug`, and appropriate priority label
```

### Sentry Projects to Monitor

| Platform | Sentry Project Slug |
|---|---|
| Backend | `focus-bear-backend` (confirm with jeznag) |
| Mac | `focus-bear-mac` (confirm with jeznag) |
| Windows | `focus-bear-windows` (confirm with jeznag) |
| Android | `focus-bear-android` (confirm with jeznag) |
| iOS | `focus-bear-ios` (confirm with jeznag) |

> ⚠️ Exact Sentry project slugs must be confirmed with jeznag.

### Priority Rubric

| Priority | Criteria |
|---|---|
| P0 (Critical) | Crash affecting >5% users, auth failures, data loss, payment failures |
| P1 (High) | Crash affecting >1% users, core feature broken, regression from recent deploy |
| P2 (Medium) | Degraded experience, affects small % of users, has workaround |
| P3 (Low) | Cosmetic, edge case, informational errors |

---

## 3. Files to Create / Modify

### New Files

#### `~/.npm-global/lib/node_modules/openclaw/skills/admiral-roadmap-sentry/SKILL.md`
The skill entrypoint. Instructs Admiral Roadmap to:
- Source Sentry credentials from environment
- Call `sentry-fetch.sh` for each platform
- Apply the priority rubric
- Call `gh issue create` for each untracked error meeting threshold
- Add labels `openclaw`, `bug`, and priority label

#### `~/.npm-global/lib/node_modules/openclaw/skills/admiral-roadmap-sentry/sentry-fetch.sh`
Shell helper that wraps Sentry REST API calls:

```pseudocode
INPUT: project_slug, limit (default 25), min_count (default 5)

GET https://sentry.io/api/0/projects/focus-bear/{project_slug}/issues/
  Headers: Authorization: Bearer $SENTRY_AUTH_TOKEN
  Query params:
    query=is:unresolved
    sort=date
    limit={limit}
    statsPeriod=24h

OUTPUT: JSON array of issues with fields:
  - id, title, culprit, count, userCount, firstSeen, lastSeen, permalink, level
```

#### `~/.npm-global/lib/node_modules/openclaw/skills/admiral-roadmap-sentry/triage.md`
Human-readable rubric (embedded in SKILL.md) used by Admiral Roadmap when deciding priority and whether to file.

#### `~/.npm-global/lib/node_modules/openclaw/skills/admiral-roadmap-sentry/github-issue-template.md`
Template for GitHub issues created by Admiral Roadmap:

```markdown
## Sentry Error Report

**Platform:** {platform}
**Priority:** {P0|P1|P2|P3}
**Error:** {title}
**First Seen:** {firstSeen}
**Last Seen:** {lastSeen}
**Event Count (24h):** {count}
**Affected Users (24h):** {userCount}
**Sentry Link:** {permalink}

### Stack Trace / Culprit
{culprit}

### Triage Notes
{Admiral Roadmap's assessment — why this priority, what module is likely affected}

---
*Filed automatically by Admiral Roadmap (AI triage agent) — not human-authored*
```

### Environment Variables to Add to OpenClaw VPS

```
SENTRY_AUTH_TOKEN=<token with project:read scope>
SENTRY_ORG_SLUG=focus-bear   # confirm with jeznag
```

---

## 4. Pseudocode / Interface Sketches

### SKILL.md workflow (pseudocode for Admiral Roadmap)

```
SKILL: admiral-roadmap-sentry

TRIGGER: on-demand or scheduled (e.g. daily at 09:00 UTC)

STEPS:
1. Verify env: SENTRY_AUTH_TOKEN, SENTRY_ORG_SLUG present → fail fast if missing
2. For each platform in [backend, mac, windows, android, ios]:
   a. Call sentry-fetch.sh {platform_slug} → raw_issues[]
   b. For each issue in raw_issues:
      i.  Skip if: issue already has a GitHub issue (check via Sentry issue tags or local dedup file)
      ii. Apply priority rubric → assigned_priority
      iii. If assigned_priority is P0 or P1:
           → Create GitHub issue immediately
      iv. If P2: create if userCount > 3
      v.  If P3: batch into a weekly digest (future enhancement)
   c. Create GitHub issue via:
      gh issue create \
        --repo Focus-Bear/backend \
        --title "[{PRIORITY}][{PLATFORM}] {sentry_title}" \
        --body "{rendered github-issue-template}" \
        --label "bug,openclaw,{priority-label}"
3. Log summary: N issues triaged, M filed
```

### Deduplication Strategy

To avoid filing the same Sentry issue twice:
- Maintain a local JSON file at `~/.openclaw/admiral-roadmap-sentry/filed-issues.json`
- Format: `{ "sentry_issue_id": "github_issue_number" }`
- Check before filing; update after filing

---

## 5. Sentry Access Setup — Instructions for jeznag

> Give these instructions to jeznag to set up Sentry access on the OpenClaw VPS.

### Step 1: Create a Sentry Internal Integration token

1. Go to **Sentry → Settings → Developer Settings → Internal Integrations**
2. Create a new integration named `openclaw-admiral-roadmap`
3. Grant permissions: **Project: Read**, **Issue & Event: Read**
4. Copy the generated **Auth Token**

### Step 2: Add the token to the OpenClaw VPS

SSH into the OpenClaw VPS and add to the environment config (e.g. `/home/openclaw/.openclaw/.env` or the openclaw gateway env file):

```bash
SENTRY_AUTH_TOKEN=<paste token here>
SENTRY_ORG_SLUG=focus-bear   # confirm the exact org slug from your Sentry URL
```

Then restart the OpenClaw gateway:
```bash
openclaw gateway restart
```

### Step 3: Verify Sentry project slugs

Run this to list your Sentry projects and confirm slugs:
```bash
curl -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  https://sentry.io/api/0/organizations/focus-bear/projects/ | jq '.[].slug'
```

Update the platform → slug mapping in `sentry-fetch.sh` with the correct slugs.

---

## 6. Open Questions / Risks

| # | Question / Risk | Owner |
|---|---|---|
| 1 | What are the exact Sentry project slugs for each platform? | jeznag |
| 2 | What is the exact Sentry org slug? | jeznag |
| 3 | Should P3 issues be batched into a digest or skipped entirely? | jeznag / Admiral Roadmap |
| 4 | Should filed issues be auto-assigned to a team member? | jeznag |
| 5 | Rate limits: Sentry API allows 100 req/10s on free plan; ensure we don't hit this with 5 platforms | Codebeard |
| 6 | Skill directory location: confirm `~/.npm-global/lib/node_modules/openclaw/skills/` or alternative skill publish path | Codebeard |
| 7 | Should we post a Slack/Discord notification when P0 is filed? | jeznag |

---

## 7. Acceptance Criteria

- [ ] `admiral-roadmap-sentry` skill exists and is loadable by OpenClaw
- [ ] `sentry-fetch.sh` successfully retrieves issues from all 5 platforms when `SENTRY_AUTH_TOKEN` is set
- [ ] Admiral Roadmap can be triggered (manually or on schedule) and produces GitHub issues with correct format
- [ ] Issues are labelled with `openclaw`, `bug`, and a priority label (`P0`–`P3`)
- [ ] Duplicate Sentry errors are not filed twice (deduplication works)
- [ ] `jeznag` setup instructions are clear enough to follow without additional context
- [ ] No hardcoded secrets in skill files
