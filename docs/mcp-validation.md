# MCP v2 implementation verification

Verified locally on 25 October 2026 against the current uncommitted branch changes.

| Check                                                            | Result                                                                        |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Full unit suite, isolated runtime transpilation                  | 180 suites, 2,410 tests, 13 snapshots passed                                  |
| Adapter + shared Auth0 verifier                                  | 95 tests passed                                                               |
| API + MCP source typechecks                                      | Passed                                                                        |
| MCP application build                                            | Passed                                                                        |
| CDK stack/local workflow assertions                              | Six tests passed                                                              |
| Production/local CDK synthesis                                   | Passed                                                                        |
| Compose config and local shell syntax                            | Passed                                                                        |
| Direct Auth0 PKCE helper unit tests                              | Three passed                                                                  |
| Migration, trigger and connection SQL in temporary PGlite 0.3.14 | Nine checks passed                                                            |
| Real PostgreSQL migration/connection suite                       | Eight tests compiled; skipped locally without disposable DB URL; CI job added |

The initial default Jest compiler run exhausted its default heap. Runtime tests now use `jest.mcp.config.cjs` and source typechecking is performed separately by `npm run mcp:check`. The successful full run used `NODE_OPTIONS=--max-old-space-size=4096 npm test -- --runInBand --forceExit --config jest.mcp.config.cjs`. An earlier run exposed one historical exchange test that assumed the old adapter contract; it was updated to exercise the archived exchange provider directly and the final full run passed.

Independent review identified malformed request-target rejection, browser visibility of OAuth challenge headers, and consistent legacy-agent rename behavior. Regression tests cover all three fixes. SQL execution checked legacy backfill, unique first-call identity, ownership, explicit linking, disabled access, revision-bound revocation/reconnect, stable reassignment, transactional rename and retained historical identity.

No live Auth0 login/refresh/disconnect, actual Docker image build/run, LocalStack deployment, dashboard frontend integration, aws-infra integration or production canary was performed. Docker Engine was unavailable and AWS CLI absent; private infrastructure repository access returned 404. The [operations runbook](mcp-operations.md) provides those acceptance steps and rollback instructions. The approved source design remains the user's Group 76 v2 PDF. No production configuration or data was changed.

## Critical dependency remediation (28 October 2026)

The first commit attempt was stopped by the normal pre-commit audit. Updated Handlebars from 4.7.8 to 4.7.10, protobufjs from 7.5.4 to 7.6.6, and proxy-addr from 2.0.7 to 2.0.8. The latter two use compatible npm overrides so future resolution cannot silently return to the vulnerable versions. The root lockfile records the resolved dependency tree; no major dependency upgrade or audit-hook bypass was used.

`npm audit --omit=dev --audit-level=critical` now exits successfully with zero critical vulnerabilities. None of these three packages remains in the audit report. Other lower-severity dependency findings remain outside this remediation. Direct compatibility checks passed for Handlebars escaping, protobuf encoding/decoding and proxy subnet trust. Both source typechecks passed with the updated dependencies.

Upstream advisories: [Handlebars own-property bypass](https://github.com/handlebars-lang/handlebars.js/security/advisories/GHSA-p8wg-vrv2-v86f), [protobufjs code execution](https://github.com/protobufjs/protobuf.js/security/advisories/GHSA-xq3m-2v4x-88gg), and [proxy-addr trust-subnet spoofing](https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h).

After remediation, the complete unit suite passed again: 180 suites, 2,410 tests and 13 snapshots. This revalidation used the patched installed dependencies and the same isolated-runtime Jest configuration as above.
