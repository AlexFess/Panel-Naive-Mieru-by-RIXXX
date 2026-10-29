# Repository guide

## Development and tests
- The only Node package is `panel/` (Node >=20). Run `npm install` there; `npm start` and `npm run dev` both start `server/index.js` without a watcher. There is no committed lockfile.
- From `panel/`, run `npm test`; from the repository root, run a focused test with `node tests/<name>.test.js`. The npm script explicitly lists tests, so add new test files to it.
- Many tests inspect source text or simulate logic rather than booting the server; passing them does not establish live integration behavior.
- `tests/e2e.sh` installs and normally uninstalls services on a root Ubuntu VPS with DNS. `tests/live-race-bug149.sh` overwrites and deletes `/etc/rixxx-panel/config.json` even though its database is temporary. Run either only on a disposable machine, never an existing installation.

## Architecture and deployment
- `panel/server/index.js` owns the Express API, SQLite schema/migrations and service configuration; it reads `/etc/rixxx-panel/config.json` and interacts with system services. Starting it is not an isolated local dev server.
- `panel/server/caddyTemplate.js` is the shared Caddyfile template; the server also has an inline fallback that mirrors it. Check both when changing rendering behavior.
- `panel/public/` is served directly, with no frontend build. Requests and locale loads must use the base-path handling in `app.js` for reverse-proxy deployments; translations live in both `locales/en.json` and `locales/ru.json`.
- Root `VERSION` drives installer/updater version selection; `update.sh` deploys `panel/` and refreshes root deployment scripts. Changes to deployment or service scripts have real system effects; avoid running install/update/uninstall on a development host.
