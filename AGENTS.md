# Agent notes

- This is a single Linux VPS deployment, not a workspace: `install.sh`/`update.sh` manage the host; the Node app is in `panel/` and starts at `panel/server/index.js` (Node.js 20+).
- Keep the Caddyfile rendering logic in `panel/server/caddyTemplate.js` canonical. It is consumed by the panel and by install/update repair flows; changes to generated config should preserve parity across all three callers.
- The panel persists host config, SQLite data, and Mieru state under `/etc/rixxx-panel/` and `/var/lib/rixxx-panel/`; tests should use temporary data and must not touch a live installation.
- Install panel dependencies with `npm install --prefix panel` (there is no root package manifest or checked-in lockfile). Run the serial regression suite with `npm test --prefix panel`.
- Run one focused regression test from the repo root with `node tests/<test-file>.test.js`; test files are standalone Node scripts and load `better-sqlite3` from `panel/node_modules`.
- `tests/e2e.sh` is operational, not a local unit test: it requires root on a supported Ubuntu/Debian amd64 VPS, valid DNS, and can install/uninstall services. Do not run it casually.
- `VERSION` at the repository root is the release version source used by install/update; update it for releases rather than relying on README version badges. The English README may lag the Russian README and executable scripts.
- No lint, formatter, typecheck, or CI workflow is configured; do not assume those checks exist.
