#!/usr/bin/env node
/**
 * Post-build checks. Fails loudly rather than shipping a broken site.
 *
 *   node check.js        # or: npm test  (build.js runs it automatically)
 *
 * The URL check is the important one: every path the live Hugo site served
 * must still resolve, or search rankings and inbound links die quietly.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUT = path.join(__dirname, 'docs');
let failures = 0;
const ok = (msg) => console.log(`  ok   ${msg}`);
const fail = (msg) => { console.log(`  FAIL ${msg}`); failures++; };

const exists = (rel) => fs.existsSync(path.join(OUT, rel));
const read = (rel) => fs.readFileSync(path.join(OUT, rel), 'utf8');
const pageFor = (url) => url === '/' ? 'index.html'
  : url.endsWith('/') ? `${url.slice(1)}index.html` : url.slice(1);

console.log('\nURL preservation (vs. last committed Hugo sitemap)');
let oldUrls = [];
try {
  const xml = execSync('git show HEAD:docs/sitemap.xml 2>/dev/null', { encoding: 'utf8' });
  oldUrls = [...xml.matchAll(/<loc>https:\/\/joaoblasques\.com([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
} catch { /* first run on a branch with no prior sitemap */ }

if (!oldUrls.length) {
  console.log('  --   no previous sitemap in git; skipping');
} else {
  const missing = oldUrls.filter((u) => !exists(pageFor(u)));
  missing.length ? missing.forEach((u) => fail(`${u} would 404`))
                 : ok(`all ${oldUrls.length} previously-live URLs resolve`);
}

console.log('\nCritical files');
for (const f of ['CNAME', 'index.xml', 'sitemap.xml', 'robots.txt', '404.html',
                 'assets/styles.css', 'assets/app.js', 'images/avatar.jpg', 'search.json']) {
  exists(f) ? ok(f) : fail(`${f} missing`);
}
if (exists('CNAME')) {
  const c = read('CNAME').trim();
  c === 'joaoblasques.com' ? ok('CNAME points at joaoblasques.com') : fail(`CNAME is "${c}"`);
}

console.log('\nPer-page structure');
const pages = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p) : e.name.endsWith('.html') && pages.push(p);
  }
})(OUT);

let h1Bad = 0, titleBad = 0, canonBad = 0;
for (const p of pages) {
  const html = fs.readFileSync(p, 'utf8');
  if (html.includes('name="robots" content="noindex"')) continue; // redirect stubs
  const rel = path.relative(OUT, p);
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) { fail(`${rel}: ${h1s} <h1> (want exactly 1)`); h1Bad++; }
  if (!/<title>.+<\/title>/.test(html)) { fail(`${rel}: no <title>`); titleBad++; }
  if (!/rel="canonical"/.test(html)) { fail(`${rel}: no canonical`); canonBad++; }
}
if (!h1Bad) ok(`every page has exactly one <h1> (${pages.length} pages)`);
if (!titleBad) ok('every page has a <title>');
if (!canonBad) ok('every page has a canonical URL');

console.log('\nContent is server-rendered (the reason we build)');
const post = read('post/mbta-otp-lakehouse/index.html');
post.includes('Medallion architecture') ? ok('post body present in raw HTML')
                                        : fail('post body missing from HTML — crawlers see a shell');
read('index.html').includes('contributions in the last year') ? ok('heatmap server-rendered')
                                                              : fail('heatmap missing');

console.log('\nHeatmap data is real, not placeholder');
const c = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/contributions.json'), 'utf8'));
const cells = c.weeks.reduce((n, w) => n + w.contributionDays.length, 0);
c.weeks.length === 53 ? ok(`53 weeks, ${cells} days, ${c.totalContributions} contributions`)
                      : fail(`${c.weeks.length} weeks (want 53)`);
c.totalContributions > 0 ? ok('total is non-zero') : fail('total is zero — refresh failed?');

console.log(failures ? `\n✗ ${failures} check(s) failed\n` : '\n✓ all checks passed\n');
process.exit(failures ? 1 : 0);
