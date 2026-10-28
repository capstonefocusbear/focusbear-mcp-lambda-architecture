# MCP infrastructure v2

The active deployment source is [`cdk/`](cdk/). This is a portable integration package for the separately owned `Focus-Bear/aws-infra` repository, which was inaccessible during implementation. It has **not** been integrated or deployed there.

Read [the operations runbook](../../docs/mcp-operations.md) for local commands, Auth0 preparation, deployment acceptance and rollback.

The files `template.yaml`, `template.localstack.yaml`, `samconfig.toml`, `build.sh`, `run.sh` and `lambda-local.js` are archived v1 SAM material. They retain obsolete token exchange/signing configuration and infrastructure limits. Do not deploy or use them for v2; no active v2 commands reference them.
