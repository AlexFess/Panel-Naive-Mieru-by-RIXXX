#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const template = require('../panel/server/caddyTemplate');

const base = {
  domain: 'example.com', adminEmail: 'admin@example.com', naivePort: 443,
  panelPort: 3000, fakeSiteDir: '/var/www/fake-site',
  exposePanel: false, panelDomain: '', webBasePath: '',
  panelBasicAuthUser: '', panelBasicAuthHash: '', subBaseUrl: '',
};
const users = [{ username: 'test', password: 'secret' }];

const defaultSubRoutes = template.render(base, users);
assert.match(defaultSubRoutes, /handle \/sub\/\*/,
  'default subscription links use the main host and need a proxy route there');
assert.match(defaultSubRoutes, /handle \/api\/federation\/\*/);

const mainDomainPaths = template.render({
  ...base,
  exposePanel: true,
  panelDomain: 'example.com',
  webBasePath: 'panel',
  panelBasicAuthUser: 'admin',
  panelBasicAuthHash: '$2a$12$.VJ5i4YcgO816PmEG4Gju.NPxD80CLKCHgFJD94F0yGbSWgcW6w02',
  subBaseUrl: 'https://example.com',
}, users);
assert.match(mainDomainPaths, /handle_path \/panel\/\*/);
assert.match(mainDomainPaths, /handle \/sub\/\*/);
assert.match(mainDomainPaths, /handle \/api\/federation\/\*/);
assert.match(mainDomainPaths, /redir \/panel \/panel\//);
assert.match(mainDomainPaths, /basic_auth \{\s+admin \$2a\$12\$/,
  'the base-domain panel path keeps its HTTP basic-auth layer');
assert.doesNotMatch(mainDomainPaths, /\nexample\.com \{\n  tls/,
  'same-domain routes must not create duplicate Caddy site blocks');

const subdomainPanel = template.render({
  ...base,
  exposePanel: true,
  panelDomain: 'panel.example.com',
  webBasePath: 'panel',
  subBaseUrl: 'https://sub.example.com',
}, users);
assert.match(subdomainPanel, /panel\.example\.com \{[\s\S]*handle_path \/panel\/\*/);
assert.match(subdomainPanel, /sub\.example\.com \{[\s\S]*handle \/sub\/\*/);

const sharedDedicatedHost = template.render({
  ...base,
  exposePanel: true,
  panelDomain: 'links.example.com',
  webBasePath: 'panel',
  subBaseUrl: 'https://LINKS.example.com:443',
}, users);
assert.strictEqual((sharedDedicatedHost.match(/links\.example\.com \{/g) || []).length, 1);
assert.match(sharedDedicatedHost, /links\.example\.com \{[\s\S]*handle_path \/panel\/\*[\s\S]*handle \/sub\/\*/);
assert.strictEqual(template.renderSubBlock({
  ...base,
  exposePanel: true,
  panelDomain: 'links.example.com',
  webBasePath: 'panel',
  subBaseUrl: 'https://LINKS.example.com:443',
}), '', 'no separate subscription site block is emitted for the panel hostname');

// The old inline repair/runtime fallbacks used to bypass the shared renderer
// and append duplicate same-host site blocks. Keep those emergency paths safe.
const serverSource = fs.readFileSync(require.resolve('../panel/server/index.js'), 'utf8');
const updateSource = fs.readFileSync(require.resolve('../update.sh'), 'utf8');
assert.match(serverSource, /panelOnMain[\s\S]*!panelOnMain[\s\S]*sameCaddyHost\(subHost, config\.panelDomain\)/);
assert.match(updateSource, /panelOnMain[\s\S]*!panelOnMain[\s\S]*sameHost\(subHost, cfg\.panelDomain\)/);
const updateJsStart = updateSource.indexOf("cat > \"$rebuild_js\" <<'NODE_EOF'");
const updateJsBody = updateSource.indexOf('\n', updateJsStart) + 1;
const updateJsEnd = updateSource.indexOf('\nNODE_EOF', updateJsBody);
assert.ok(updateJsStart >= 0 && updateJsEnd > updateJsBody, 'update repair JS heredoc is present');
new vm.Script(updateSource.slice(updateJsBody, updateJsEnd), { filename: 'update-rebuild.js' });

console.log('Path-based panel and subscription routing tests passed');
