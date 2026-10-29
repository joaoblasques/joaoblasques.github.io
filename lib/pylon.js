const { esc } = require('./layout');

const BADGES = ['live', 'offline', 'planned', 'not-covered'];
const LABEL = { live: 'Verified live', offline: 'Offline-tested', planned: 'Planned', 'not-covered': 'Not covered' };

// Rows with site.json overrides applied (e.g. NICE-3 -> not-covered).
const applyOverrides = (matrix, site) =>
  matrix.rows.map((r) => ({ ...r, badge: (site.overrides || {})[r.id] || r.badge }));

// Throws Error naming the row ID. draft tolerates pending (href null) evidence; publish does not.
const validatePylon = ({ matrix, evidence, site, mode }) => {
  for (const r of applyOverrides(matrix, site)) {
    if (!BADGES.includes(r.badge)) throw new Error(`${r.id}: unknown badge "${r.badge}"`);
    const ev = evidence[r.id] || [];
    if (r.badge === 'live' && !ev.some((e) => e.href)) {
      throw new Error(`${r.id}: badge is live but has no evidence with a link`);
    }
  }
  if (mode === 'publish') {
    for (const [id, ev] of Object.entries(evidence)) {
      if (ev.some((e) => !e.href)) throw new Error(`${id}: evidence still pending, cannot publish`);
    }
  }
};

// Code links: plain text until the repo is public.
const codeLink = (site, label, href = site.repoUrl) =>
  site.repoPublic && href ? `<a href="${esc(href)}">${esc(label)}</a>` : esc(label);

// shortcut: placeholder body; Task 3 replaces it with the real sections.
const renderPylon = ({ matrix, evidence, site, page }) => {
  const items = applyOverrides(matrix, site).map((r) => {
    const ev = (evidence[r.id] || []).map((e) => e.href ? `<a href="${esc(e.href)}">${esc(e.label)}</a>` : `${esc(e.label)} (pending)`);
    return `<li id="${esc(r.id)}"><strong>${esc(r.id)}</strong> ${esc(r.title)} <em>${LABEL[r.badge]}</em>${r.proof ? `: ${esc(r.proof)}` : ''}${ev.length ? ` [${ev.join(', ')}]` : ''}</li>`;
  }).join('\n');
  return `<article class="mb">
<h1>${esc(page.title)}</h1>
<p>${esc(page.intro)}</p>
<p>Source: ${codeLink(site, 'Pylon repository')}</p>
<h2>Matrix</h2>
<ul>
${items}
</ul>
</article>`;
};

module.exports = { validatePylon, renderPylon, applyOverrides, codeLink, LABEL };
