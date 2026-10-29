#!/usr/bin/env node
// Pylon page gates. Inline fixtures only; never reads the real matrix.json.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { validatePylon, renderPylon, applyOverrides } = require('./lib/pylon');
const { findLeaks, scanDir } = require('./lib/redact');

const row = (id, badge) => ({ id, title: `t ${id}`, badge, proof: '', decisions: [] });
const matrix = { rows: [row('WYD-1', 'live'), row('REQ-1', 'offline')] };
const site = { draft: true, repoPublic: false, repoUrl: '', overrides: {} };
const good = { 'WYD-1': [{ label: 'trace', href: 'https://x.test/t', asset: null }] };
const v = (o) => validatePylon({ matrix, evidence: good, site, mode: 'draft', ...o });

// live row needs a non-null evidence href, in both modes
for (const mode of ['draft', 'publish']) {
  assert.throws(() => v({ evidence: {}, mode }), /WYD-1/, `live w/o evidence throws (${mode})`);
  assert.throws(() => v({ evidence: { 'WYD-1': [{ label: 'a', href: null, asset: null }] }, mode }), /WYD-1/);
}
assert.doesNotThrow(() => v({}), 'valid draft passes');

// pending evidence (href null): ok in draft, throws in publish
const pending = { ...good, 'REQ-1': [{ label: 'later', href: null, asset: null }] };
assert.doesNotThrow(() => v({ evidence: pending, mode: 'draft' }));
assert.throws(() => v({ evidence: pending, mode: 'publish' }), /REQ-1/);

// overrides change a badge (and feed validation)
const o = applyOverrides({ rows: [row('NICE-3', 'planned')] }, { overrides: { 'NICE-3': 'not-covered' } });
assert.strictEqual(o[0].badge, 'not-covered');
assert.throws(() => v({ site: { ...site, overrides: { 'REQ-1': 'live' } } }), /REQ-1/, 'override to live needs evidence');

// findLeaks
assert.deepStrictEqual(findLeaks('clean text 12345', []), []);
assert.strictEqual(findLeaks('acct 123456789012 x', []).length, 1);
assert.ok(findLeaks('id 123e4567-e89b-12d3-a456-426614174000', []).length > 0);
assert.strictEqual(findLeaks('key AKIAIOSFODNN7EXAMPLE', []).length, 1);
assert.strictEqual(findLeaks('key ASIAIOSFODNN7EXAMPLE', []).length, 1);
assert.strictEqual(findLeaks('tenant corp.example', ['corp.example']).length, 1);

// scanDir catches leaks in file names and in alt text
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pylon-'));
fs.writeFileSync(path.join(tmp, 'shot-123456789012.png'), 'x');
fs.writeFileSync(path.join(tmp, 'a.html'), '<img alt="tenant corp.example" src="s.png">');
const hits = scanDir(tmp, ['corp.example']).join('\n');
assert.ok(/123456789012/.test(hits), 'file name leak found');
assert.ok(/a\.html/.test(hits) && /corp\.example/.test(hits), 'alt text leak found');
fs.rmSync(tmp, { recursive: true });

// repoPublic false renders code links as plain text
const page = { title: 'P', intro: 'i' };
const args = { matrix, evidence: good, page, profile: {} };
const priv = renderPylon({ ...args, site: { ...site, repoUrl: 'https://github.com/o/pylon' } });
assert.ok(!priv.includes('https://github.com/o/pylon'), 'no link when repo is private');
const pub = renderPylon({ ...args, site: { ...site, repoPublic: true, repoUrl: 'https://github.com/o/pylon' } });
assert.ok(pub.includes('href="https://github.com/o/pylon"'));
assert.strictEqual((priv.match(/<h1[\s>]/g) || []).length, 1);

// draft build: noindex, and /pylon/ absent from sitemap, search, RSS
execFileSync('node', ['build.js'], { cwd: __dirname, stdio: 'pipe' });
const docs = (f) => fs.readFileSync(path.join(__dirname, 'docs', f), 'utf8');
assert.ok(docs('pylon/index.html').includes('<meta name="robots" content="noindex">'));
for (const f of ['sitemap.xml', 'search.json', 'index.xml']) assert.ok(!docs(f).includes('/pylon/'), `${f} omits pylon`);
assert.ok(!docs('index.html').includes('href="/pylon/"'), 'no nav link in draft');

// publish build: Pylon tab on every page emitted before the Pylon page; none in draft
const siteFile = path.join(__dirname, 'data/pylon/site.json');
const orig = fs.readFileSync(siteFile, 'utf8');
const build = () => execFileSync('node', ['build.js'], { cwd: __dirname, stdio: 'pipe' });
try {
  fs.writeFileSync(siteFile, JSON.stringify({ ...JSON.parse(orig), draft: false }));
  build();
  for (const f of ['index.html', 'posts/index.html', 'projects/index.html', 'pylon/index.html']) {
    assert.ok(docs(f).includes('href="/pylon/"'), `${f} has Pylon tab in publish`);
  }
} finally {
  fs.writeFileSync(siteFile, orig);
  build();
}
assert.ok(!docs('index.html').includes('href="/pylon/"') && !docs('posts/index.html').includes('href="/pylon/"'), 'draft restored');

console.log('test-pylon: all passed');
