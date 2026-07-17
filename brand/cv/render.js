#!/usr/bin/env node
/**
 * /cv-refresh renderer — brand/cv/cv-source.md → docs/cv/ (web page + PDF).
 *
 * Two outputs, one content source, one visual language (the site's real GitHub
 * Primer tokens from assets/styles.css — never a guessed/separate resume theme):
 *   1. docs/cv/index.html   — full site page (header/nav/sidebar/footer), for
 *                              browsing at joaoblasques.com/cv
 *   2. docs/cv/CV-Joao-Blasques.pdf — print-only layout (no nav/sidebar — nothing
 *                              to click on paper), same colors/type, via headless
 *                              Chrome --print-to-pdf. A4, warns if it overflows 2pp.
 *
 *   node brand/cv/render.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { marked } = require('marked');
const { page, esc } = require('../../lib/layout');
const { icon } = require('../../lib/icons');

const ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'docs', 'cv');
const ARCHIVE_DIR = path.join(ROOT, 'brand', 'cv', 'archive');
const SOURCE = path.join(__dirname, 'cv-source.md');
const SITE = 'https://joaoblasques.com';
const PDF_NAME = 'CV-Joao-Blasques.pdf';

marked.setOptions({ mangle: false, headerIds: false });

/* ---------- parse cv-source.md into sections ---------- */
// The file is hand-written markdown with H2 sections (## Summary, ## Experience, …).
// Split on H2 boundaries; keep the H1 (name) and the lede paragraph separately.
function parseSource(raw) {
  // Strip the leading HTML comment (authoring notes, not content).
  const body = raw.replace(/^<!--[\s\S]*?-->\s*/, '');
  const lines = body.split('\n');

  const h1Idx = lines.findIndex((l) => l.startsWith('# '));
  if (h1Idx === -1) throw new Error('cv-source.md: no H1 (name) found');
  const name = lines[h1Idx].replace(/^#\s+/, '').trim();

  const sections = [];
  let cur = null;
  for (let i = h1Idx + 1; i < lines.length; i++) {
    const l = lines[i];
    const h2 = l.match(/^##\s+(.*)/);
    if (h2) {
      if (cur) sections.push(cur);
      cur = { title: h2[1].trim(), body: [] };
    } else if (cur) {
      cur.body.push(l);
    } else {
      // content before the first ## — tagline + contact line
      (sections._preamble = sections._preamble || []).push(l);
    }
  }
  if (cur) sections.push(cur);

  const preamble = (sections._preamble || []).join('\n').trim();
  const paras = preamble.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  const tagline = paras[0] || '';
  const contactLine = paras[1] || '';

  return { name, tagline, contactLine, sections };
}

function section(title, bodyMd) {
  return `<section class="cv-section">
<h2 class="cv-h2">${esc(title)}</h2>
${marked.parse(bodyMd)}
</section>`;
}

// Each contact-line entry gets its real icon + link — same visual language as the
// site sidebar's .vlist (lib/layout.js `sidebar()`), not a flat dot-separated string.
function contactEntry(raw) {
  const text = raw.trim();
  if (text.includes('@')) {
    return { iconName: 'mail', href: `mailto:${text}`, label: text };
  }
  if (/^linkedin\.com/i.test(text)) {
    return { iconName: 'linkedin', href: `https://${text}`, label: text };
  }
  if (/^github\.com/i.test(text)) {
    return { iconName: 'octoface', href: `https://${text}`, label: text };
  }
  if (/^joaoblasques\.com/i.test(text)) {
    return { iconName: 'link', href: `https://${text}`, label: text };
  }
  // Location — not a link, just an icon + text.
  return { iconName: 'location', href: null, label: text };
}

function buildBodyHTML(cv) {
  const entries = cv.contactLine.split('·').map(contactEntry);
  const contactHTML = entries.map(({ iconName, href, label }) => {
    const inner = `${icon(iconName, 14, 'fill:var(--faint)')}<span>${esc(label)}</span>`;
    return `<span class="cv-contact-item">${href ? `<a href="${esc(href)}">${inner}</a>` : inner}</span>`;
  }).join('');

  return `
<div class="cv-head">
  <div class="cv-head-top">
    <span class="dotwrap">${icon('octocat', 30, 'fill:var(--fg)')}<span class="dot dot--canvas"></span></span>
    <div class="cv-head-id">
      <h1 class="cv-name">${esc(cv.name)}</h1>
      <p class="cv-tagline">${esc(cv.tagline)}</p>
    </div>
  </div>
  <div class="cv-contact">${contactHTML}</div>
</div>
${cv.sections.map((s, i) => {
  const html = section(s.title, s.body.join('\n'));
  // Manual page break: Education starts the second printed page (per Jonas's
  // review) — only meaningful in print; screen ignores break-before.
  return s.title === 'Education' ? `<div class="cv-pagebreak"></div>\n${html}` : html;
}).join('\n')}
`;
}

/* ---------- CSS shared by web page and print PDF (site tokens, print reflow) ---------- */
const CV_CSS = `
.cv-head {
  margin-bottom:32px; padding-bottom:20px; border-bottom:1px solid var(--border-muted);
}
.cv-head-top { display:flex; align-items:center; gap:14px; margin-bottom:14px; }
.cv-head-id { min-width:0; }
.cv-name { font-size:26px; font-weight:600; margin:0 0 2px; line-height:1.25; }
.cv-tagline { font-size:14px; color:var(--muted); margin:0; line-height:1.4; }
.cv-contact {
  display:flex; flex-wrap:wrap; column-gap:20px; row-gap:6px;
  font-size:12.5px; color:var(--muted);
}
.cv-contact-item { display:inline-flex; align-items:center; gap:5px; white-space:nowrap; }
.cv-contact-item svg { flex-shrink:0; }
.cv-contact-item a { display:inline-flex; align-items:center; gap:5px; color:var(--muted); }
.cv-contact-item a:hover { color:var(--accent); text-decoration:none; }
.cv-section { margin-bottom:28px; }
.cv-section:last-child { margin-bottom:0; }
.cv-h2 {
  font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:.04em;
  color:var(--muted); margin:0 0 12px; padding-bottom:6px;
  border-bottom:1px solid var(--border-muted);
}
.cv-section p { margin:0 0 10px; line-height:1.55; font-size:14px; }
.cv-section p:last-child { margin-bottom:0; }
.cv-section ul { margin:0 0 10px; padding-left:1.3em; font-size:14px; line-height:1.55; }
.cv-section li { margin-bottom:4px; }
.cv-section li:last-child { margin-bottom:0; }
.cv-section strong { font-weight:600; }
.cv-section em { color:var(--muted); font-style:normal; }
.cv-section a { color:var(--accent); }
.cv-pagebreak { break-before: page; }
@media screen { .cv-pagebreak { break-before: unset; } } /* meaningless on screen, print-only */
`;

/* ---------- web page (uses the real site shell: header/nav/sidebar/footer) ---------- */
function buildWebPage(cv, profile, postCount) {
  return page({
    title: `CV | ${profile.name}`,
    description: 'João Blasques — CV / résumé. AI-Enabled Data Engineer.',
    canonical: `${SITE}/cv/`,
    active: 'cv', // not a real tab in TABS — CV isn't in the nav, so nothing highlights (correct)
    profile, postCount,
    extraHead: `<style>${CV_CSS}\n.cv-download { display:inline-flex; align-items:center; gap:6px; font-size:13px; margin-bottom:16px; }</style>\n`,
    body: `
<div class="card" style="padding:32px;">
  <a class="cv-download" href="/cv/${PDF_NAME}">${icon('link', 14, 'fill:var(--accent)')} Download as PDF</a>
  ${buildBodyHTML(cv)}
</div>`,
  });
}

/* ---------- print HTML (standalone — no nav/sidebar, A4, page-break aware) ---------- */
function buildPrintHTML(cv) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(cv.name)} — CV</title>
<link rel="stylesheet" href="file://${path.join(ROOT, 'assets', 'styles.css')}">
<style>
  :root, [data-theme="light"] { } /* force light palette for print regardless of OS setting */
  @page { size: A4; margin: 16mm 18mm; }
  html, body { background:#fff; }
  body { font-size:14px; }
  .cv-page { max-width:100%; }
  .cv-section p, .cv-section li { break-inside: avoid; }
  .cv-h2 { break-after: avoid; }
  a { text-decoration:none; }
</style>
${CV_CSS ? `<style>${CV_CSS}</style>` : ''}
</head>
<body data-theme="light">
<div class="cv-page">
${buildBodyHTML(cv)}
</div>
</body>
</html>`;
}

/* ---------- headless Chrome --print-to-pdf ---------- */
function findChrome() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error('No headless-capable Chrome/Chromium found. Install Google Chrome or set CHROME_BIN.');
}

function renderPDF(printHTMLPath, pdfPath) {
  const chrome = process.env.CHROME_BIN || findChrome();
  execFileSync(chrome, [
    '--headless',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${pdfPath}`,
    '--print-to-pdf-no-header',
    `file://${printHTMLPath}`,
  ], { stdio: 'pipe', timeout: 30000 });
}

// crude page-count check: PDF page objects are countable via the /Type /Page count
// in the file's own xref — good enough for a 1-2 page CV without adding a PDF lib.
function countPDFPages(pdfPath) {
  const buf = fs.readFileSync(pdfPath, 'latin1');
  const matches = buf.match(/\/Type\s*\/Page[^s]/g) || [];
  return matches.length;
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`✗ ${path.relative(ROOT, SOURCE)} not found — nothing to render.`);
    process.exit(1);
  }
  const cv = parseSource(fs.readFileSync(SOURCE, 'utf8'));
  const profile = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/profile.json'), 'utf8'));
  const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/posts.json'), 'utf8'));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

  // 1. Web page
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), buildWebPage(cv, profile, posts.length));
  console.log(`✓ wrote docs/cv/index.html`);

  // 2. Print HTML (temp, not shipped — only the PDF it produces is)
  const printHTMLPath = path.join(OUT_DIR, '_print.html');
  fs.writeFileSync(printHTMLPath, buildPrintHTML(cv));

  // 3. PDF via headless Chrome
  const pdfPath = path.join(OUT_DIR, PDF_NAME);
  try {
    renderPDF(printHTMLPath, pdfPath);
  } finally {
    fs.unlinkSync(printHTMLPath);
  }
  console.log(`✓ wrote docs/cv/${PDF_NAME}`);

  const pageCount = countPDFPages(pdfPath);
  if (pageCount > 2) {
    console.warn(`⚠ CV PDF is ${pageCount} pages (spec target: ≤2). Trim cv-source.md content.`);
  } else {
    console.log(`✓ CV PDF is ${pageCount} page(s) (≤2 target met)`);
  }

  // 4. Dated archive copy (kept forever, per spec)
  const today = process.env.CV_REFRESH_DATE || new Date().toISOString().slice(0, 10);
  const archivePath = path.join(ARCHIVE_DIR, `CV-Joao-Blasques-${today}.pdf`);
  fs.copyFileSync(pdfPath, archivePath);
  console.log(`✓ archived ${path.relative(ROOT, archivePath)}`);

  return { pageCount, pdfPath, archivePath };
}

if (require.main === module) main();
module.exports = { main, parseSource, countPDFPages };
