const { icon, LANG_COLOR } = require('./icons');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'book', href: '/' },
  { key: 'posts', label: 'Posts', icon: 'repo', href: '/posts/' },
  { key: 'projects', label: 'Projects', icon: 'project', href: '/projects/' },
  { key: 'skills', label: 'Skills', icon: 'gear', href: '/skills/' },
  { key: 'about', label: 'About', icon: 'person', href: '/about/' },
  { key: 'cv', label: 'CV', icon: 'link', href: '/cv/' },
];

const fmtDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${M[m - 1]} ${d}, ${y}`;
};

const header = () => `
<header class="gh-header">
  <a href="/" class="iconbtn" style="flex-shrink:0;" aria-label="Home">
    <span class="dotwrap">${icon('octocat', 32, 'fill:var(--header-fg)')}<span class="dot"></span></span>
  </a>
  <label class="gh-search">
    ${icon('search', 16, 'fill:var(--header-muted)')}
    <input type="text" placeholder="Search or jump to…" aria-label="Search posts" id="search" autocomplete="off">
  </label>
  <div style="flex:1;"></div>
  <button class="theme-btn iconbtn" id="theme-toggle" aria-label="Toggle theme"></button>
</header>`;

const nav = (active, postCount) => `
<div class="navbar">
  <div class="wrap">
    <div class="layout" style="gap:0;">
      <div class="sidebar hide-sm" style="margin-top:0;"></div>
      <div class="maincol">
        <nav class="unav" aria-label="Main">
          ${TABS.map((t) => `<a class="unav-item" href="${t.href}"${t.key === active ? ' aria-current="page"' : ''}>
            <span style="display:inline-flex;">${icon(t.icon)}</span>
            <span>${t.label}</span>
            ${t.key === 'posts' ? `<span class="counter">${postCount}</span>` : ''}
          </a>`).join('')}
        </nav>
      </div>
    </div>
  </div>
</div>`;

const sidebar = (p) => `
<aside class="sidebar">
  <div class="sm-inline">
    <div class="avatarwrap">
      <img class="avatar" src="${p.avatar}" alt="${esc(p.name)}" width="260" height="260">
    </div>
    <div style="padding-top:8px;">
      <div class="vname">${esc(p.name)} <span>(${esc(p.nickname)})</span></div>
      <div class="vlogin">${esc(p.login)}</div>
      <p class="vbio">${esc(p.tagline)}</p>
    </div>
  </div>
  <a class="btn-primary" href="mailto:${p.email}">Get in touch</a>
  <ul class="vlist">
    <li>${icon('location')} ${esc(p.location)}</li>
    <li>${icon('mail')} <a href="mailto:${p.email}">${esc(p.email)}</a></li>
    <li>${icon('link')} <a rel="nofollow me" href="${p.website}">${esc(p.websiteLabel)}</a></li>
    <li>${icon('linkedin')} <a href="${p.linkedin}">${esc(p.linkedinLabel)}</a></li>
  </ul>
  <div class="vsection hide-sm">
    <h2>Highlights</h2>
    <div class="chip">${icon('star', 16, 'fill:var(--btn-primary);flex-shrink:0')} ${esc(p.highlight)}</div>
  </div>
  <div class="vsection hide-sm">
    <h2>Connect</h2>
    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      <a href="${p.github}" aria-label="GitHub" class="iconbtn" style="position:relative;">
        ${icon('octocat', 26, 'fill:var(--fg)')}<span class="dot dot--canvas"></span>
      </a>
      <a href="${p.linkedin}" aria-label="LinkedIn" class="iconbtn">${icon('linkedin', 26, 'fill:#0a66c2')}</a>
    </div>
  </div>
</aside>`;

const footer = (p) => `
<footer class="gh-footer">
  <div class="wrap">
    <div class="foot-brand">
      <span class="dotwrap">${icon('octocat', 20, 'fill:var(--faint)')}<span class="dot dot--footer"></span></span>
      <span>© ${new Date().getFullYear()} ${esc(p.name)}</span>
    </div>
    <div class="foot-links">
      <a href="/">Overview</a>
      <a href="/posts/">Posts</a>
      <a href="${p.github}">GitHub</a>
      <a href="${p.linkedin}">LinkedIn</a>
      <a href="mailto:${p.email}">Email</a>
    </div>
    <span>Built with HTML · CSS · JS</span>
  </div>
</footer>`;

// Full page. Theme is applied before first paint by the inline head script.
const page = ({ title, description, canonical, active, body, profile, postCount, extraHead = '' }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="${esc(profile.name)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${profile.website}/images/avatar.jpg">
<meta name="twitter:card" content="summary">
<link rel="icon" href="/images/favicon.ico">
<link rel="alternate" type="application/rss+xml" title="${esc(profile.name)} — Posts" href="/index.xml">
<script>try{document.documentElement.dataset.theme=localStorage.getItem('jb-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')}catch(e){document.documentElement.dataset.theme='light'}</script>
<link rel="stylesheet" href="/assets/styles.css">
${extraHead}</head>
<body>
${header()}
${nav(active, postCount)}
<div class="wrap content">
  <div class="layout">
    ${sidebar(profile)}
    <main class="maincol">
${body}
    </main>
  </div>
</div>
${footer(profile)}
<script src="/assets/app.js" defer></script>
</body>
</html>
`;

module.exports = { page, esc, fmtDate, TABS, LANG_COLOR };
