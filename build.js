#!/usr/bin/env node
/**
 * joaoblasques.com — static site build.
 *
 * Reads data/*.json + data/**\/*.md, writes complete HTML into docs/.
 * GitHub Pages serves docs/ from main as-is; this never runs on GitHub.
 *
 *   node build.js        # or: npm run build
 *   ./refresh-contributions.sh && node build.js   # with fresh heatmap data
 */
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { page, esc, fmtDate, LANG_COLOR } = require('./lib/layout');
const { icon } = require('./lib/icons');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'docs');
const SITE = 'https://joaoblasques.com';

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readJSON = (p) => JSON.parse(read(p));

const write = (rel, html) => {
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
  return rel;
};

const copy = (from, to) => {
  const dest = path.join(OUT, to);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(ROOT, from), dest);
};

const copyDir = (from, to) => {
  const src = path.join(ROOT, from);
  if (!fs.existsSync(src)) return;
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    e.isDirectory() ? copyDir(`${from}/${e.name}`, `${to}/${e.name}`)
                    : copy(`${from}/${e.name}`, `${to}/${e.name}`);
  }
};

marked.setOptions({ mangle: false, headerIds: false });
const md = (s) => marked.parse(s);

const profile = readJSON('data/profile.json');
const repos = readJSON('data/repos.json');
const posts = readJSON('data/posts.json');
const contrib = readJSON('data/contributions.json');
const N = posts.length;

/* ---------- components ---------- */

const card = (inner, pad = 24) => `<div class="card" style="padding:${pad}px;">${inner}</div>`;

const tagPills = (tags) =>
  `<div class="tags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>`;

const repoCard = (r) => `
<div class="card repo-card">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
    ${icon('repo', 16, 'fill:var(--faint);flex-shrink:0')}
    <a href="${r.url}" style="font-weight:600;font-size:14px;">${esc(r.name)}</a>
    <span class="pill-public">Public</span>
  </div>
  <p style="font-size:12px;color:var(--muted);line-height:1.5;margin:0 0 16px;flex:1;">${esc(r.desc)}</p>
  <div style="display:flex;align-items:center;gap:16px;font-size:12px;color:var(--muted);">
    <span style="display:flex;align-items:center;gap:4px;">
      <span class="langdot" style="background:${LANG_COLOR[r.lang] || '#8b949e'};"></span>${esc(r.lang)}
    </span>
  </div>
</div>`;

const postCard = (p) => `
<div class="card repo-card">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
    ${icon('repo', 16, 'fill:var(--faint);flex-shrink:0')}
    <a href="/post/${p.slug}/" style="font-weight:600;font-size:14px;">${esc(p.title)}</a>
  </div>
  <p style="font-size:12px;color:var(--muted);line-height:1.5;margin:0 0 12px;flex:1;">${esc(p.description)}</p>
  ${tagPills(p.tags.slice(0, 4))}
</div>`;

const postRow = (p) => `
<div class="post-row">
  ${icon('book', 16)}
  <div class="post-body">
    <div class="post-top">
      <a href="/post/${p.slug}/">${esc(p.title)}</a>
      <span class="post-date">${fmtDate(p.date)}</span>
    </div>
    <p class="post-desc">${esc(p.description)}</p>
    ${tagPills(p.tags)}
  </div>
</div>`;

// GitHub's own quartile names → our --cal0..4 tokens.
const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const heatmap = () => {
  let last = -1;
  const months = contrib.weeks.map((wk) => {
    const first = wk.contributionDays[0];
    if (!first) return '<div></div>';
    const m = new Date(first.date + 'T00:00:00').getMonth();
    if (m === last) return '<div></div>';
    last = m;
    return `<div>${MONTHS[m]}</div>`;
  }).join('');

  const weeks = contrib.weeks.map((wk) => {
    // GitHub omits leading/trailing days; pad so every column is 7 tall and rows align to weekdays.
    const cells = Array(7).fill(null);
    for (const d of wk.contributionDays) cells[new Date(d.date + 'T00:00:00').getDay()] = d;
    return `<div class="cal-week">${cells.map((d) => {
      if (!d) return '<div class="cal-cell" style="outline:0;"></div>';
      const n = d.contributionCount;
      const label = `${n} contribution${n === 1 ? '' : 's'} on ${fmtDate(d.date)}`;
      return `<div class="cal-cell" style="background:var(--cal${LEVEL[d.contributionLevel] ?? 0});" title="${label}"></div>`;
    }).join('')}</div>`;
  }).join('');

  return `
<div class="section">
  <h2 class="section-h"><strong>${contrib.totalContributions.toLocaleString('en-US')}</strong> contributions in the last year</h2>
  <div class="card" style="padding:16px;">
    <div class="cal-scroll">
      <div class="cal-inner">
        <div class="cal-months">${months}</div>
        <div class="cal-body">
          <div class="cal-days"><div></div><div>Mon</div><div></div><div>Wed</div><div></div><div>Fri</div><div></div></div>
          <div class="cal-weeks">${weeks}</div>
        </div>
      </div>
    </div>
    <div class="cal-legend">Less
      ${[0, 1, 2, 3, 4].map((i) => `<span style="background:var(--cal${i});"></span>`).join('')}
      More
    </div>
  </div>
</div>`;
};

/* ---------- pages ---------- */

const built = [];
const emit = (rel, html) => built.push(write(rel, html));

// Overview
emit('index.html', page({
  title: `${profile.name} | ${profile.highlight}`,
  description: profile.description,
  canonical: `${SITE}/`,
  active: 'overview', profile, postCount: N,
  body: `
${card(`<div class="readme-head">${icon('octoface')}README<span>.md</span></div>
<article class="mb">${md(read('data/pages/readme.md'))}</article>`)}
<div style="height:24px;"></div>
${heatmap()}
<div class="section">
  <div class="section-head">
    <h2 class="section-h" style="margin:0;">Pinned</h2>
    <a href="${profile.github}?tab=repositories" style="font-size:12px;">View all repositories →</a>
  </div>
  <div class="repogrid">${repos.map(repoCard).join('')}</div>
</div>
<div class="section" style="margin-bottom:0;">
  <h2 class="section-h">Popular posts</h2>
  <div class="repogrid">${posts.slice(0, 4).map(postCard).join('')}</div>
</div>`,
}));

// Posts index
emit('posts/index.html', page({
  title: `Posts | ${profile.name}`,
  description: `Writing on data engineering, AI and cloud architecture by ${profile.name}.`,
  canonical: `${SITE}/posts/`,
  active: 'posts', profile, postCount: N,
  body: `
<h1 class="section-h" style="margin-bottom:16px;">All posts <span class="counter">${N}</span></h1>
<div class="card" id="postlist">${posts.map(postRow).join('')}</div>
<p id="noresults" style="display:none;color:var(--muted);font-size:14px;padding:16px 0;">No posts match that search.</p>`,
}));

// Long-form pages
for (const [slug, active, title] of [
  ['projects', 'projects', 'Projects & Portfolio'],
  ['skills', 'skills', 'Skills & Expertise'],
  ['about', 'about', 'About Me'],
]) {
  emit(`${slug}/index.html`, page({
    title: `${title} | ${profile.name}`,
    description: profile.description,
    canonical: `${SITE}/${slug}/`,
    active, profile, postCount: N,
    body: card(`<article class="mb">${md(read(`data/pages/${slug}.md`))}</article>`),
  }));
}

// Individual posts — same URL shape Hugo emitted, so nothing 404s.
for (const p of posts) {
  const ld = {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: p.title, datePublished: p.date, description: p.description,
    keywords: p.tags.join(', '), author: { '@type': 'Person', name: profile.name, url: profile.website },
    mainEntityOfPage: `${SITE}/post/${p.slug}/`,
  };
  emit(`post/${p.slug}/index.html`, page({
    title: `${p.title} | ${profile.name}`,
    description: p.description,
    canonical: `${SITE}/post/${p.slug}/`,
    active: 'posts', profile, postCount: N,
    extraHead: `<script type="application/ld+json">${JSON.stringify(ld)}</script>\n`,
    body: card(`
<article class="mb">
  <h1 style="border:0;padding:0;margin-top:0;">${esc(p.title)}</h1>
  <p style="color:var(--muted);font-size:14px;margin-top:-8px;">${fmtDate(p.date)}</p>
  ${tagPills(p.tags)}
  <div style="height:24px;"></div>
  ${md(read(`data/posts/${p.slug}.md`))}
</article>
<hr style="border:0;border-top:1px solid var(--border-muted);margin:24px 0;">
<a href="/posts/" style="font-size:14px;">← All posts</a>`),
  }));
}

// Tag pages — Hugo generated these and they're in the live sitemap; keep them.
const tags = new Map();
for (const p of posts) for (const t of p.tags) {
  const k = t.toLowerCase().replace(/\s+/g, '-');
  if (!tags.has(k)) tags.set(k, { label: t, posts: [] });
  tags.get(k).posts.push(p);
}
for (const [slug, { label, posts: tp }] of tags) {
  emit(`tags/${slug}/index.html`, page({
    title: `${label} | ${profile.name}`,
    description: `Posts tagged “${label}” by ${profile.name}.`,
    canonical: `${SITE}/tags/${slug}/`,
    active: 'posts', profile, postCount: N,
    body: `
<h1 class="section-h" style="margin-bottom:16px;">Tagged “${esc(label)}” <span class="counter">${tp.length}</span></h1>
<div class="card">${tp.map(postRow).join('')}</div>`,
  }));
}

// Tag index
emit('tags/index.html', page({
  title: `Tags | ${profile.name}`,
  description: `All topics written about by ${profile.name}.`,
  canonical: `${SITE}/tags/`,
  active: 'posts', profile, postCount: N,
  body: `
<h1 class="section-h" style="margin-bottom:16px;">Tags <span class="counter">${tags.size}</span></h1>
${card(`<div class="tags">${[...tags].sort((a, b) => b[1].posts.length - a[1].posts.length)
  .map(([s, { label, posts: tp }]) => `<a class="tag" href="/tags/${s}/">${esc(label)} ${tp.length}</a>`).join('')}</div>`, 16)}`,
}));

// Redirect stubs for URLs Hugo used to emit that this build renames.
// They're indexed and linked, so they must resolve rather than 404.
const redirect = (from, to) => emit(`${from}/index.html`, `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Redirecting…</title>
<link rel="canonical" href="${SITE}${to}">
<meta http-equiv="refresh" content="0; url=${to}">
<meta name="robots" content="noindex">
</head>
<body><p>Redirecting to <a href="${to}">${to}</a>…</p></body>
</html>
`);

redirect('post', '/posts/');        // Hugo's post list → our posts index
redirect('readme', '/');            // old README page → overview
redirect('categories', '/tags/');   // unused taxonomy → tags

// 404
emit('404.html', page({
  title: `Page not found | ${profile.name}`,
  description: 'That page does not exist.',
  canonical: `${SITE}/404.html`,
  active: '', profile, postCount: N,
  body: card(`<article class="mb">
  <h1 style="border:0;padding:0;margin-top:0;">404 — page not found</h1>
  <p>That page doesn't exist. Try the <a href="/">overview</a> or browse <a href="/posts/">all posts</a>.</p>
</article>`),
}));

/* ---------- feeds & assets ---------- */

const rfc822 = (iso) => new Date(iso + 'T10:00:00Z').toUTCString();

write('index.xml', `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(profile.name)} — Posts</title>
    <link>${SITE}/</link>
    <description>${esc(profile.description)}</description>
    <language>en-us</language>
    <managingEditor>${profile.email} (${esc(profile.name)})</managingEditor>
    <lastBuildDate>${rfc822(posts[0].date)}</lastBuildDate>
    <atom:link href="${SITE}/index.xml" rel="self" type="application/rss+xml"/>
${posts.map((p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE}/post/${p.slug}/</link>
      <pubDate>${rfc822(p.date)}</pubDate>
      <guid>${SITE}/post/${p.slug}/</guid>
      <description>${esc(p.description)}</description>
    </item>`).join('\n')}
  </channel>
</rss>
`);

const urls = [
  `${SITE}/`, `${SITE}/posts/`, `${SITE}/projects/`, `${SITE}/skills/`, `${SITE}/about/`, `${SITE}/tags/`,
  ...posts.map((p) => `${SITE}/post/${p.slug}/`),
  ...[...tags.keys()].map((t) => `${SITE}/tags/${t}/`),
];
write('sitemap.xml', `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`);

write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

// Search index — powers the header search box.
write('search.json', JSON.stringify(
  posts.map((p) => ({ t: p.title, u: `/post/${p.slug}/`, d: p.description, g: p.tags }))
));

copy('CNAME', 'CNAME');           // custom domain — must survive every build
copyDir('assets', 'assets');
copyDir('assets/img', 'images');  // /images/* paths are baked into old inbound links

console.log(`✓ ${built.length} pages → docs/`);
console.log(`  ${posts.length} posts · ${tags.size} tags · ${repos.length} pinned repos`);
console.log(`  heatmap: ${contrib.totalContributions.toLocaleString('en-US')} contributions (real)`);
