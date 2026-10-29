#!/usr/bin/env node
// Pylon page gates. Unit tests use inline fixtures; builds use a temp copy of data/pylon and a temp output dir.
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
const page = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/pylon/page.json'), 'utf8'));
const args = { matrix, evidence: good, page, profile: {}, proofStrip: [] };
const priv = renderPylon({ ...args, site: { ...site, repoUrl: 'https://github.com/o/pylon' } });
assert.ok(!priv.includes('https://github.com/o/pylon'), 'no link when repo is private');
const pub = renderPylon({ ...args, site: { ...site, repoPublic: true, repoUrl: 'https://github.com/o/pylon' } });
assert.ok(pub.includes('href="https://github.com/o/pylon/'), 'repo links when public');
assert.strictEqual((priv.match(/<h1[\s>]/g) || []).length, 1);

// ---- Task 3: sections, no-JS matrix, proof strip, contact, gaps ----
const realPage = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/pylon/page.json'), 'utf8'));
const fx = {
  matrix: { rows: [{ ...row('WYD-1', 'live'), proof: 'Has `code` proof.', decisions: ['D-04'] }, row('REQ-1', 'planned')] },
  evidence: good, site, page: realPage, profile: { email: 'me@x.test' },
  proofStrip: [
    { label: 'Terraform modules', value: 9, note: 'n', href: 'infra/modules' },
    { label: 'Monthly cost', value: null, note: 'needs live', href: null },
  ],
};
const html = renderPylon(fx);
const IDS = ['verdict', 'proof', 'matrix', 'path', 'demo', 'decisions', 'gaps', 'contact'];
const pos = IDS.map((id) => html.indexOf(`id="${id}"`));
assert.ok(pos.every((p) => p >= 0), `all section ids present: ${pos}`);
assert.deepStrictEqual([...pos].sort((a, b) => a - b), pos, 'section ids in order');
const section = (id) => html.slice(html.indexOf(`id="${id}"`), html.indexOf('</section>', html.indexOf(`id="${id}"`)));

// matrix rows: <details> with badge text inside <summary>, readable with no script
const rows = section('matrix').match(/<details[\s\S]*?<\/details>/g) || [];
assert.strictEqual(rows.length, 2, 'one <details> per row');
assert.ok(/<summary>[\s\S]*Verified live[\s\S]*<\/summary>/.test(rows[0]), 'live badge in summary');
assert.ok(/<summary>[\s\S]*Planned[\s\S]*<\/summary>/.test(rows[1]), 'planned badge in summary');
assert.ok(!/<details[^>]*hidden/.test(html) && !/display:\s*none/.test(section('matrix')), 'rows visible without JS');
assert.ok(rows[0].includes('<code>code</code>'), 'proof backticks render as code');

// empty proof renders no empty element
assert.ok(!/<(p|li|div)[^>]*>\s*<\/\1>/.test(html), 'no empty p/li/div');

// proof strip: null values omitted, not shown as 0 or n/a
const ps = section('proof');
assert.ok(ps.includes('Terraform modules') && ps.includes('>9<'), 'measured number shown');
assert.ok(!ps.includes('Monthly cost') && !/n\/a/.test(ps), 'null value omitted');

// contact: fixed sentences (D-45), mailto from profile, CV link
const ct = section('contact');
assert.ok(ct.includes('I am available for on-call once the platform is in service.'), 'on-call sentence');
assert.ok(ct.includes('Hybrid Lisbon, 2 office days'), 'hybrid sentence');
assert.ok(ct.includes('href="mailto:me@x.test') && ct.includes('href="/cv/"'), 'mailto and CV');

// gaps: the five items
const gp = section('gaps');
for (const re of [/Kubernetes/, /D-04/, /high availability/i, /D-14/, /on-call/i, /security team/i, /Swisscom(&#39;|'|’)s own standards/i]) {
  assert.ok(re.test(gp), `gaps mentions ${re}`);
}

// never claim what is not shown
assert.ok(!/high availability is (provided|supported)|on-call history:|Kubernetes experience/i.test(html));

// ---- Final wave: typo guard (D), publish pending gate (C), hyphenated account ID (A) ----
assert.throws(() => v({ site: { ...site, overrides: { 'WYD-9X': 'not-covered' } } }), /WYD-9X/, 'unknown override key');
assert.throws(() => v({ evidence: { ...good, 'REQ-1X': [] } }), /REQ-1X/, 'unknown evidence key');
const pubPage = { demo: { items: [{ label: 'trace', href: null }, { label: 'dash', href: 'https://x.test/d' }] },
  decisions: { runbooks: [{ title: 'Cost spike', exercised: null }, { title: 'Ok', exercised: '2026-11-01' }] } };
const pubStrip = [{ label: 'p95', value: null }, { label: 'mods', value: 9 }];
assert.doesNotThrow(() => v({ page: pubPage, proofStrip: pubStrip }), 'draft tolerates pending page items');
assert.throws(() => v({ page: pubPage, proofStrip: pubStrip, mode: 'publish' }),
  (e) => /trace/.test(e.message) && /Cost spike/.test(e.message) && /p95/.test(e.message) && !/dash|mods|\bOk\b/.test(e.message),
  'publish lists each pending demo item, runbook and unmeasured number');
assert.strictEqual(findLeaks('acct 1234-5678-9012 x', []).length, 1, 'hyphenated account ID');
assert.deepStrictEqual(findLeaks('date 2026-10-29', []), [], 'dates are not account IDs');

// (E) summary keeps a visible disclosure marker
assert.ok(/\.pylon-row > summary::before\s*\{[^}]*content:/.test(fs.readFileSync(path.join(__dirname, 'assets/styles.css'), 'utf8')), 'summary marker');

// ---- Builds run on a throwaway copy of data/pylon into a temp output dir (never touch real site.json/docs) ----
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pylon-build-'));
const mkData = (name, edit) => {
  const dir = path.join(tmpRoot, name);
  fs.cpSync(path.join(__dirname, 'data/pylon'), dir, { recursive: true });
  const j = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const w = (f, o) => fs.writeFileSync(path.join(dir, f), JSON.stringify(o));
  edit({ dir, j, w });
  return dir;
};
const buildWith = (data, out) => execFileSync('node', ['build.js'], {
  cwd: __dirname, stdio: 'pipe', env: { ...process.env, PYLON_DATA_DIR: data, SITE_OUT: out } }).toString();
const buildFails = (data, out) => {
  try { buildWith(data, out); } catch (e) { return String(e.stderr) + String(e.stdout); }
  assert.fail('build should have failed');
};
const outFile = (out, f) => fs.readFileSync(path.join(out, f), 'utf8');

// draft build (forced draft regardless of the real site.json)
const draftData = mkData('draft', ({ j, w }) => w('site.json', { ...j('site.json'), draft: true }));
const draftOut = path.join(tmpRoot, 'out-draft');
buildWith(draftData, draftOut);
const docs = (f) => outFile(draftOut, f);
assert.ok(docs('pylon/index.html').includes('<meta name="robots" content="noindex">'));
for (const f of ['sitemap.xml', 'search.json', 'index.xml']) assert.ok(!docs(f).includes('/pylon/'), `${f} omits pylon`);
assert.ok(!docs('index.html').includes('href="/pylon/"'), 'no nav link in draft');

// built page: no false AWS-state or cost-cap phrasing
const BLANKET = /nothing[^.]{0,40}\b(in|on) AWS|no AWS resource|nothing ran in AWS|EUR 30 monthly cap/i;
for (const [name, text] of [['built page', docs('pylon/index.html').replace(/<[^>]+>/g, ' ')],
  ['page.json', fs.readFileSync(path.join(__dirname, 'data/pylon/page.json'), 'utf8')],
  ['matrix.json', fs.readFileSync(path.join(__dirname, 'data/pylon/matrix.json'), 'utf8')]]) {
  const m = text.match(BLANKET);
  assert.ok(!m, `${name} makes a blanket AWS-state claim: "${m && m[0]}"`);
}
// every shown proof-strip number is labelled as counted and has a source
for (const s of JSON.parse(fs.readFileSync(path.join(__dirname, 'data/pylon/proof-strip.json'), 'utf8')).filter((x) => x.value !== null)) {
  assert.ok(s.note.includes('counted from the repo') && s.href, `${s.label}: note and source href`);
}

// (A) redaction scan covers copied docs/assets/pylon* (file text), after the copy
const leakData = mkData('leak', ({ dir, j, w }) => {
  w('site.json', { ...j('site.json'), draft: true });
  fs.writeFileSync(path.join(dir, '.redact.local'), 'Filter rows by status\nnetwork-ops dummies\n');
});
const leakErr = buildFails(leakData, path.join(tmpRoot, 'out-leak'));
assert.ok(/assets\/pylon\.js/.test(leakErr) && /request-path\.svg/.test(leakErr), `leak in assets found: ${leakErr}`);

// (A) publish without .redact.local fails; (C) publish with pending items fails
const pubRaw = mkData('pub-raw', ({ j, w }) => w('site.json', { ...j('site.json'), draft: false }));
const rawErr = buildFails(pubRaw, path.join(tmpRoot, 'out-raw'));
assert.ok(/redact\.local/.test(rawErr), 'publish needs .redact.local');
const pubPend = mkData('pub-pend', ({ dir, j, w }) => {
  w('site.json', { ...j('site.json'), draft: false });
  fs.writeFileSync(path.join(dir, '.redact.local'), 'zz-no-such-string-zz\n');
});
const pendErr = buildFails(pubPend, path.join(tmpRoot, 'out-pend'));
assert.ok(/still pending/.test(pendErr) && /demo: "Smoke test/.test(pendErr) && /runbook: "Cost spike"/.test(pendErr), `publish lists pending: ${pendErr}`);

// publish build with everything filled: Pylon tab on every page emitted before the Pylon page
const pubData = mkData('pub', ({ dir, j, w }) => {
  w('site.json', { ...j('site.json'), draft: false });
  const pg = j('page.json');
  pg.demo.items = pg.demo.items.map((i) => ({ ...i, href: 'https://x.test/e' }));
  pg.decisions.runbooks = pg.decisions.runbooks.map((r) => ({ ...r, exercised: '2026-11-01' }));
  w('page.json', pg);
  w('proof-strip.json', j('proof-strip.json').filter((x) => x.value !== null));
  fs.writeFileSync(path.join(dir, '.redact.local'), 'zz-no-such-string-zz\n');
});
const pubOut = path.join(tmpRoot, 'out-pub');
buildWith(pubData, pubOut);
for (const f of ['index.html', 'posts/index.html', 'projects/index.html', 'pylon/index.html']) {
  assert.ok(outFile(pubOut, f).includes('href="/pylon/"'), `${f} has Pylon tab in publish`);
}
assert.ok(!outFile(pubOut, 'pylon/index.html').includes('noindex'), 'publish is indexable');
fs.rmSync(tmpRoot, { recursive: true });

console.log('test-pylon: all passed');
