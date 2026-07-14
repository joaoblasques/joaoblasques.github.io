#!/usr/bin/env node
/**
 * Checks every external link in docs/ actually resolves.
 *
 *   npm run linkcheck
 *
 * Deliberately NOT part of `npm run build`: it needs the network, takes seconds
 * not milliseconds, and depends on other people's servers being up. Run it before
 * a deploy, or when you've touched links. check.js stays offline and instant.
 *
 * Exits non-zero if anything is dead, so it can gate a deploy if you ever want it to.
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'docs');
const TIMEOUT_MS = 15000;
const CONCURRENCY = 8;

// Hosts that block automated requests. A failure here means nothing, so don't cry wolf.
// LinkedIn returns 999 to anything without a browser session; GitHub Pages sites on the
// apex domain may 404 until this branch is merged (see UNPUBLISHED below).
const SKIP_HOSTS = [/(^|\.)linkedin\.com$/, /(^|\.)schema\.org$/, /(^|\.)w3\.org$/];

// Links to localhost are instructions for the reader to open their own local service
// (the Airflow/Kestra UI in the pipeline posts), not links this site expects to work.
const isLocal = (u) => /^https?:\/\/(localhost|127\.0\.0\.1)/.test(u);

// Our own canonical/self-links point at the live site. Until this branch is merged,
// pages that only exist in this build legitimately 404 there. Report separately.
const SITE = 'https://joaoblasques.com';

const pages = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p) : e.name.endsWith('.html') && pages.push(p);
  }
})(OUT);

// url -> Set of pages linking to it, so a failure names the file to fix.
const links = new Map();
for (const p of pages) {
  const html = fs.readFileSync(p, 'utf8');
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    const url = m[1].replace(/&amp;/g, '&');
    if (isLocal(url)) continue;
    let host;
    try { host = new URL(url).host; } catch { continue; }
    if (SKIP_HOSTS.some((re) => re.test(host))) continue;
    if (!links.has(url)) links.set(url, new Set());
    links.get(url).add(`/${path.relative(OUT, p)}`);
  }
}

const selfLink = (u) => u === SITE || u.startsWith(`${SITE}/`);
const localPageFor = (u) => {
  const p = u.slice(SITE.length) || '/';
  return p === '/' ? 'index.html' : p.endsWith('/') ? `${p.slice(1)}index.html` : p.slice(1);
};

const check = async (url) => {
  // HEAD first (cheap); some servers reject it, so fall back to GET.
  for (const method of ['HEAD', 'GET']) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
      const res = await fetch(url, { method, redirect: 'follow', signal: ctl.signal,
        headers: { 'user-agent': 'joaoblasques.com linkcheck' } });
      clearTimeout(t);
      if (res.status === 405 || res.status === 501) continue; // method not allowed → retry as GET
      return { ok: res.ok, status: res.status };
    } catch (e) {
      if (method === 'GET') return { ok: false, status: e.name === 'AbortError' ? 'timeout' : 'error' };
    }
  }
  return { ok: false, status: 'error' };
};

(async () => {
  const urls = [...links.keys()].sort();
  console.log(`\nChecking ${urls.length} external links (${CONCURRENCY} at a time)…\n`);

  const dead = [];
  const unpublished = [];
  let done = 0;

  const queue = [...urls];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const url = queue.shift();
      const { ok, status } = await check(url);
      done++;
      if (process.stdout.isTTY) process.stdout.write(`\r  ${done}/${urls.length}`);
      if (ok) continue;
      // A self-link that 404s but exists in this build = "not merged yet", not broken.
      (selfLink(url) && fs.existsSync(path.join(OUT, localPageFor(url)))
        ? unpublished : dead).push({ url, status, from: [...links.get(url)] });
    }
  }));

  if (process.stdout.isTTY) process.stdout.write('\r'.padEnd(30) + '\r');

  if (unpublished.length) {
    console.log(`${unpublished.length} link(s) to pages in this build that aren't live yet — expected before merge:`);
    for (const { url } of unpublished.slice(0, 8)) console.log(`  ${url}`);
    if (unpublished.length > 8) console.log(`  …and ${unpublished.length - 8} more`);
    console.log();
  }

  if (dead.length) {
    console.log(`✗ ${dead.length} dead link(s):\n`);
    for (const { url, status, from } of dead) {
      console.log(`  [${status}] ${url}`);
      for (const f of from.slice(0, 3)) console.log(`         from ${f}`);
      if (from.length > 3) console.log(`         …and ${from.length - 3} more page(s)`);
    }
    console.log();
    process.exit(1);
  }

  console.log(`✓ all ${urls.length} external links resolve\n`);
})();
