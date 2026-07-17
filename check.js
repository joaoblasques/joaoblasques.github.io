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

// build.js writes docs/ fresh each run. If it crashed, docs/ holds the PREVIOUS
// run's output and every check below would pass while describing a build that
// never happened. Refuse to validate output older than the data it came from.
// Every file build.js reads — JSON and markdown both. If docs/ is older than any of
// them, the build either didn't run or crashed, and every check below would be
// validating the previous run's output. Keep in sync with build.js.
const DATA_INPUTS = [
  ...['posts', 'profile', 'repos', 'contributions'].map((f) => `data/${f}.json`),
  ...fs.readdirSync(path.join(__dirname, 'data/posts')).map((f) => `data/posts/${f}`),
  ...fs.readdirSync(path.join(__dirname, 'data/pages')).map((f) => `data/pages/${f}`),
];
const newestData = DATA_INPUTS
  .map((f) => fs.statSync(path.join(__dirname, f)).mtimeMs)
  .reduce((a, b) => Math.max(a, b), 0);
if (!fs.existsSync(path.join(OUT, 'index.html'))) {
  console.log('\n✗ docs/index.html missing — run `node build.js` first\n');
  process.exit(1);
}
if (fs.statSync(path.join(OUT, 'index.html')).mtimeMs < newestData) {
  console.log('\n✗ docs/ is older than data/ — the build did not run or it failed. Re-run `node build.js`.\n');
  process.exit(1);
}

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

console.log('\nInternal links resolve');
// Catches links to pages that were renamed or never existed (the old /contact).
const internalBad = new Set();
for (const p of pages) {
  const html = fs.readFileSync(p, 'utf8');
  for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const href = m[1];
    if (href.startsWith('//')) continue;
    const target = href.endsWith('/') ? `${href.slice(1)}index.html` : href.slice(1);
    if (!exists(target) && !exists(`${href.slice(1)}/index.html`)) {
      internalBad.add(`${href}  (linked from /${path.relative(OUT, p)})`);
    }
  }
}
internalBad.size ? [...internalBad].forEach((l) => fail(`dead internal link: ${l}`))
                 : ok('no dead internal links');

// Cheap offline guard: the GitHub handle is joaoblasques. "jonasblasques" is the
// personal nickname and has been typo'd into post prose before, 404ing silently.
const wrongHandle = pages.filter((p) =>
  /github\.com\/jonasblasques/.test(fs.readFileSync(p, 'utf8')));
wrongHandle.length
  ? wrongHandle.forEach((p) => fail(`wrong GitHub handle in /${path.relative(OUT, p)} (jonasblasques → joaoblasques)`))
  : ok('no links to the wrong GitHub handle');

console.log('\nHeatmap data is real, not placeholder');
const c = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/contributions.json'), 'utf8'));
const cells = c.weeks.reduce((n, w) => n + w.contributionDays.length, 0);
c.weeks.length === 53 ? ok(`53 weeks, ${cells} days, ${c.totalContributions} contributions`)
                      : fail(`${c.weeks.length} weeks (want 53)`);
c.totalContributions > 0 ? ok('total is non-zero') : fail('total is zero — refresh failed?');

console.log('\nCV (docs/cv/) — broken/stale CV fails loudly, same as posts.json');
const cvSourcePath = path.join(__dirname, 'brand/cv/cv-source.md');
if (!fs.existsSync(cvSourcePath)) {
  console.log('  --   brand/cv/cv-source.md not created yet; skipping CV checks');
} else {
  const cvPagePath = path.join(OUT, 'cv/index.html');
  const cvPdfPath = path.join(OUT, 'cv/CV-Joao-Blasques.pdf');
  if (!exists('cv/index.html')) {
    fail('docs/cv/index.html missing — run `node brand/cv/render.js`');
  } else if (!exists('cv/CV-Joao-Blasques.pdf')) {
    fail('docs/cv/CV-Joao-Blasques.pdf missing — run `node brand/cv/render.js`');
  } else {
    const cvSourceMtime = fs.statSync(cvSourcePath).mtimeMs;
    const cvPageMtime = fs.statSync(cvPagePath).mtimeMs;
    if (cvPageMtime < cvSourceMtime) {
      fail('docs/cv/ is older than brand/cv/cv-source.md — re-run `node brand/cv/render.js`');
    } else {
      ok('docs/cv/index.html and PDF present and current');
      const { countPDFPages } = require('./brand/cv/render.js');
      const pages = countPDFPages(cvPdfPath);
      pages <= 2 ? ok(`CV PDF is ${pages} page(s) (≤2 target)`)
                 : fail(`CV PDF is ${pages} pages — spec requires ≤2. Trim brand/cv/cv-source.md.`);
      const pageHTML = read('cv/index.html');
      pageHTML.includes('João Blasques') && pageHTML.includes('cv-section')
        ? ok('CV page body present in raw HTML (server-rendered)')
        : fail('CV page body missing/empty — render may have crashed');
    }
  }
}

console.log(failures ? `\n✗ ${failures} check(s) failed\n` : '\n✓ all checks passed\n');
process.exit(failures ? 1 : 0);
