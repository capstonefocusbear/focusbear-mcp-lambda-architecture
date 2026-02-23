# Run smoke test locally with CI-like env (PowerShell).
# Prereqs: Postgres + Redis running, and server already started in another terminal.
# Or run the server in background first (see below).

# Optional: set env vars so the server can start (if you start it in this session)
$env:PUSHER_BEAMS_INSTANCE_ID = "ci-dummy-instance"
$env:PUSHER_BEAMS_PRIMARY_KEY = "ci-dummy-key"
$env:SENDGRID_KEY = "SG.ci-dummy-key-for-smoke-test"

# If you haven't started the server yet, start it in background:
# Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "start:no-migration" -RedirectStandardOutput "server.log" -RedirectStandardError "server.log"

$env:SERVER_URL = "http://127.0.0.1:5038"
$env:SMOKE_DEBUG = "1"
npm run smoke-test
