'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const tpl = require('../panel/server/caddyTemplate');

const hash = '$2a$12$.VJ5i4YcgO816PmEG4Gju.NPxD80CLKCHgFJD94F0yGbSWgcW6w02';
const base = { domain: 'example.com', adminEmail: 'admin@example.com', panelPort: 3001,
  exposePanel: true, panelDomain: 'example.com', webBasePath: 'secret',
  panelBasicAuthUser: 'admin', panelBasicAuthHash: hash };
const render = overrides => tpl.render({ ...base, ...overrides }, [{ username: 'u', password: 'p' }]);

const main = render({ subBaseUrl: 'https://example.com' });
assert.match(main, /redir \/secret \/secret\/ 301/);
assert.match(main, /handle_path \/secret\/\* \{\s*basic_auth \{\s*admin \$2a\$12\$/);
assert.match(main, /handle \/sub\/\* \{\s*reverse_proxy 127\.0\.0\.1:3001/);
assert.match(main, /handle \/api\/federation\/\*/);
assert.equal((main.match(/example\.com \{/g) || []).length, 1);
assert.doesNotMatch(render({ exposePanel: false }), /handle_path \/secret/);
assert.doesNotMatch(render({ webBasePath: '' }), /handle_path \/\*/);
assert.doesNotMatch(render({ webBasePath: 'sub' }), /handle_path \/sub/);

const separate = render({ panelDomain: 'panel.example.com', subBaseUrl: 'https://sub.example.com' });
assert.match(separate, /panel\.example\.com \{[\s\S]*handle_path \/secret\/\*/);
assert.match(separate, /sub\.example\.com \{[\s\S]*handle \/sub\/\*/);
const shared = render({ panelDomain: 'panel.example.com', subBaseUrl: 'https://panel.example.com' });
assert.equal((shared.match(/panel\.example\.com \{/g) || []).length, 1);
assert.match(shared.slice(shared.indexOf('panel.example.com {')), /handle \/api\/federation\/\*/);
const updater = fs.readFileSync(path.join(__dirname, '..', 'update.sh'), 'utf8');
const rebuild = updater.match(/cat > "\$rebuild_js" <<'NODE_EOF'\r?\n([\s\S]*?)\r?\nNODE_EOF/);
assert.ok(rebuild, 'updater rebuild script exists');
new vm.Script(rebuild[1]);
assert.match(rebuild[1], /mainPanelRoute = route/);
assert.match(rebuild[1], /handle_path \/' \+ wbp/);
console.log('main-domain routing tests passed');
