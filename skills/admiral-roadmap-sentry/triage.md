# Triage Rubric — Admiral Roadmap Sentry Error Classification

Use this rubric when reviewing Sentry issues returned by `sentry-fetch.sh`. Assign each issue a priority (P0–P3) based on the criteria below, then follow the filing thresholds.

---

## Priority Levels

### P0 — Critical (File Immediately)

File a GitHub issue immediately. Consider sending a Slack/Discord alert (future enhancement).

**Criteria (any one condition):**
- Crash or unhandled exception affecting **>5% of active users** (24h)
- **Authentication failures** — users cannot log in or sessions are being invalidated
- **Data loss or corruption** — user data deleted, overwritten, or inaccessible
- **Payment/subscription failures** — billing flows broken
- **Service outage** — core API returning 5xx for >10% of requests
- Error level is `fatal` in Sentry

**Action:** File GitHub issue immediately with label `P0`.

---

### P1 — High (File Immediately)

File a GitHub issue immediately.

**Criteria (any one condition):**
- Crash or unhandled exception affecting **>1% of active users** (24h), but <5%
- **Core feature broken** — a primary Focus Bear feature is non-functional (e.g. focus mode won't start, tasks won't save)
- **Regression from a recent deploy** — error started appearing after a specific commit/deploy
- Error level is `error` and `userCount > 10` in 24h

**Action:** File GitHub issue immediately with label `P1`.

---

### P2 — Medium (File if Threshold Met)

File a GitHub issue only if `userCount > 3`.

**Criteria:**
- Degraded experience — feature works but is unreliable or slow
- Affects a **small percentage of users** (<1%) but more than 1–3 users
- Has a known workaround
- Error level is `error` or `warning` with moderate occurrence

**Action:** File GitHub issue with label `P2` if `userCount > 3`.

---

### P3 — Low (Skip for Now)

Do not file individually. Batch into a weekly digest (future enhancement).

**Criteria:**
- Cosmetic issues — UI glitches, minor display errors
- Edge cases — rare, unusual user configurations
- Informational errors — expected in certain flows (e.g. not-found for optional resources)
- Very low volume — `count < 5` and `userCount <= 1` in 24h
- Error level is `info` or `debug`

**Action:** Skip filing. Log to triage summary only.

---

## Classification Workflow

```
For each Sentry issue:

1. Check level:
   - fatal → P0
   - error:
     - userCount > 5% active users → P0
     - userCount > 1% active users → P1
     - count > 10 in 24h → P1
     - userCount > 3 → P2
     - else → P3
   - warning → P2 (if userCount > 3), else P3
   - info / debug → P3

2. Keyword check (override to higher priority if title contains):
   - "auth", "login", "token", "session" → at least P1
   - "payment", "billing", "subscription" → at least P0
   - "data loss", "corruption", "deleted" → P0
   - "crash", "fatal", "SIGTERM" → at least P1

3. Apply filing threshold (see above).
```

---

## Triage Notes in GitHub Issues

When filing a GitHub issue, include in the "Triage Notes" section:
- **Why this priority** — which rule from this rubric was applied
- **Affected module** — your best assessment of which NestJS module or platform feature is affected
- **Likely cause** — if discernible from the title/culprit
- **Recommended action** — e.g. "investigate after next deploy", "hotfix candidate", "needs user reproduction steps"
