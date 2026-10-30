const fs = require('fs');
const path = require('path');
const { esc } = require('./layout');

const BADGES = ['live', 'offline', 'planned', 'not-covered'];
const LABEL = { live: 'Verified live', offline: 'Offline-tested', planned: 'Planned', 'not-covered': 'Not covered' };

// Rows with site.json overrides applied (e.g. NICE-3 -> not-covered).
const applyOverrides = (matrix, site) =>
  matrix.rows.map((r) => ({ ...r, badge: (site.overrides || {})[r.id] || r.badge }));

// Throws Error naming the row ID or key. draft tolerates pending items; publish lists each one and fails.
const validatePylon = ({ matrix, evidence, site, mode, page = {}, proofStrip = [] }) => {
  const ids = new Set(matrix.rows.map((r) => r.id));
  for (const [what, keys] of [['site.json override', Object.keys(site.overrides || {})], ['evidence.json', Object.keys(evidence)]]) {
    for (const k of keys) if (!ids.has(k)) throw new Error(`${what} key "${k}" is not a matrix row ID`);
  }
  for (const r of applyOverrides(matrix, site)) {
    if (!BADGES.includes(r.badge)) throw new Error(`${r.id}: unknown badge "${r.badge}"`);
    const ev = evidence[r.id] || [];
    if (r.badge === 'live' && !ev.some((e) => e.href)) {
      throw new Error(`${r.id}: badge is live but has no evidence with a link`);
    }
  }
  if (mode !== 'publish') return;
  // Same structured data renderPylon shows as pending.
  const pending = [
    ...Object.entries(evidence).flatMap(([id, ev]) => ev.filter((e) => !e.href).map((e) => `${id}: evidence "${e.label}"`)),
    ...((page.demo || {}).items || []).filter((i) => !i.href).map((i) => `demo: "${i.label}"`),
    ...((page.decisions || {}).runbooks || []).filter((r) => !r.exercised).map((r) => `runbook: "${r.title}" not exercised`),
    ...proofStrip.filter((x) => x.value === null || x.value === undefined).map((x) => `proof strip: "${x.label}" not measured`),
  ];
  if (pending.length) throw new Error(`still pending, cannot publish:\n  ${pending.join('\n  ')}`);
};

// Code links: plain text until the repo is public.
const codeLink = (site, label, href = site.repoUrl) =>
  site.repoPublic && href ? `<a href="${esc(href)}">${esc(label)}</a>` : esc(label);

// Proof text comes from posting-map markdown: keep `code` and **bold**, drop link targets.
const inline = (s) => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

// Repo-relative path -> link when the repo is public, plain text otherwise.
const repoRef = (site, label, file) =>
  codeLink(site, label, site.repoUrl && file ? `${site.repoUrl}/blob/main/${file}` : '');

const SVG = fs.readFileSync(path.join(__dirname, '..', 'assets/pylon/request-path.svg'), 'utf8');
const ul = (items, cls = '') => items.length ? `<ul${cls ? ` class="${cls}"` : ''}>\n${items.map((i) => `<li>${i}</li>`).join('\n')}\n</ul>` : '';
const badge = (b) => `<span class="pylon-badge pylon-badge--${b}">${LABEL[b]}</span>`;
const section = (id, heading, inner) =>
  `<section id="${id}" class="pylon-sec" aria-labelledby="${id}-h">\n<h2 id="${id}-h">${esc(heading)}</h2>\n${inner}\n</section>`;

const matrixRow = (r, evidence, page, site) => {
  const ev = (evidence[r.id] || []).map((e) => e.href
    ? `<a href="${esc(e.href)}">${esc(e.label)}</a>` : `${esc(e.label)} <em>(${esc(page.demo.pending)})</em>`);
  const body = [
    r.proof ? `<p>${inline(r.proof)}</p>` : '',
    r.decisions.length ? `<p class="pylon-meta">Decisions: ${r.decisions.map(esc).join(', ')}</p>` : '',
    ev.length ? `<p class="pylon-meta">Evidence:</p>\n${ul(ev)}` : '',
    `<p class="pylon-meta">${repoRef(site, page.matrix.source, page.matrix.sourceHref)}</p>`,
  ].filter(Boolean).join('\n');
  return `<details class="pylon-row" data-badge="${r.badge}" id="${esc(r.id)}">
<summary><span class="pylon-id">${esc(r.id)}</span> <span class="pylon-title">${esc(r.title)}</span> ${badge(r.badge)}</summary>
<div class="pylon-detail">
${body}
</div>
</details>`;
};

// shortcut: asset field of evidence is not rendered yet, add video/screenshot rendering in Task 5
const renderPylon = ({ matrix, evidence, site, page, profile, proofStrip = [] }) => {
  const v = page.verdict;
  const rows = applyOverrides(matrix, site);
  const mail = `mailto:${esc(profile.email || '')}?subject=${encodeURIComponent(page.demo.requestSubject)}`;
  const groups = Object.entries(page.matrix.groups).map(([pre, name]) => {
    const g = rows.filter((r) => r.id.split('-')[0] === pre);
    return g.length ? `<h3>${esc(name)}</h3>\n${g.map((r) => matrixRow(r, evidence, page, site)).join('\n')}` : '';
  }).filter(Boolean).join('\n');
  const stats = proofStrip.filter((s) => s.value !== null && s.value !== undefined).map((s) => `
<span class="pylon-stat-v">${esc(s.value)}</span>
<span class="pylon-stat-l">${esc(s.label)}</span>
<span class="pylon-stat-n">${esc(s.note)}${s.href ? `. Source: ${repoRef(site, s.href, s.href)}` : ''}</span>`);

  return `<article class="mb pylon">
<section id="verdict" class="pylon-sec pylon-verdict" aria-labelledby="verdict-h">
<h1 id="verdict-h">${esc(v.headline)}</h1>
${v.lede.map((p) => `<p class="pylon-lede">${esc(p)}</p>`).join('\n')}
<p class="pylon-cta"><a class="pylon-btn pylon-btn--primary" href="#demo">${esc(v.demoLabel)}</a> <a class="pylon-btn" href="#matrix">${esc(v.evidenceLabel)}</a></p>
<div class="pylon-cols">
<div><h2>${esc(v.adoptHeading)}</h2>
${ul(v.adopt.map(esc))}</div>
<div><h2>${esc(v.adaptHeading)}</h2>
${ul(v.adapt.map(esc))}</div>
</div>
</section>
${section('proof', page.proof.heading, `<p>${esc(page.proof.intro)}</p>\n${ul(stats, 'pylon-strip')}`)}
${section('matrix', page.matrix.heading, `<p>${esc(page.matrix.intro)}</p>
<dl class="pylon-legend">
${BADGES.map((b) => `<dt>${badge(b)}</dt><dd>${esc(page.matrix.legend[b])}</dd>`).join('\n')}
</dl>
${groups}`)}
${section('path', page.path.heading, `<p>${esc(page.path.intro)}</p>
<figure class="pylon-fig">
${SVG.trim()}
<figcaption>${esc(page.path.caption)}</figcaption>
</figure>`)}
${section('demo', page.demo.heading, `<p>${esc(page.demo.intro)}</p>
${ul(page.demo.items.map((i) => i.href ? `<a href="${esc(i.href)}">${esc(i.label)}</a>` : `${esc(i.label)} <em class="pylon-pending">(${esc(page.demo.pending)})</em>`))}
<p>${esc(page.demo.requestIntro)}</p>
<p><a class="pylon-btn pylon-btn--primary" href="${mail}">${esc(page.demo.requestLabel)}</a></p>`)}
${section('decisions', page.decisions.heading, `<p>${esc(page.decisions.intro)}</p>
${ul(page.decisions.items.map((d) => `<strong>${esc(d.id)}</strong> ${esc(d.title)}`))}
<p>${repoRef(site, page.decisions.logLabel, page.decisions.logHref)}</p>
<p>${esc(page.decisions.runbooksIntro)}</p>
${ul(page.decisions.runbooks.map((r) => `${repoRef(site, r.title, r.file)}. Exercised on: ${esc(r.exercised || 'not yet')}`))}`)}
${section('gaps', page.gaps.heading, `<p>${esc(page.gaps.intro)}</p>\n${ul(page.gaps.items.map(esc))}`)}
${section('contact', page.contact.heading, `${page.contact.lines.map((l) => `<p>${esc(l)}</p>`).join('\n')}
<p class="pylon-cta"><a class="pylon-btn pylon-btn--primary" href="${mail}">${esc(page.contact.requestLabel)}</a> <a class="pylon-btn" href="/cv/">${esc(page.contact.cvLabel)}</a></p>`)}
</article>
<script src="/assets/pylon.js" defer></script>`;
};

module.exports = { validatePylon, renderPylon, applyOverrides, codeLink, LABEL };
