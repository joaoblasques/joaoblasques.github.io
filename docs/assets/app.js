/* Theme toggle + post search. Everything else ships pre-rendered. */

const SUN = '<svg width="18" height="18" viewBox="0 0 16 16" style="fill:#ffdf5d;" aria-hidden="true"><path d="M8 12a4 4 0 100-8 4 4 0 000 8zM8 0a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V.75A.75.75 0 018 0zm0 13a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 018 13zm8-5a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0116 8zM3 8a.75.75 0 01-.75.75H.75a.75.75 0 010-1.5h1.5A.75.75 0 013 8zm10.657-5.657a.75.75 0 010 1.061l-1.06 1.06a.75.75 0 11-1.061-1.06l1.06-1.06a.75.75 0 011.061 0zM5.464 10.536a.75.75 0 010 1.06l-1.06 1.061a.75.75 0 11-1.061-1.06l1.06-1.061a.75.75 0 011.061 0zm8.193 2.121a.75.75 0 01-1.06 0l-1.061-1.06a.75.75 0 011.06-1.061l1.061 1.06a.75.75 0 010 1.061zM5.464 5.464a.75.75 0 01-1.06 0l-1.061-1.06a.75.75 0 011.06-1.061l1.061 1.06a.75.75 0 010 1.061z"></path></svg>';
const MOON = '<svg width="18" height="18" viewBox="0 0 16 16" style="fill:var(--header-fg);" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.598 1.591a.75.75 0 01.785-.175 7 7 0 11-8.967 8.967.75.75 0 01.961-.96 5.5 5.5 0 007.046-7.046.75.75 0 01.175-.786zm1.616 1.945a7 7 0 01-7.678 7.678 5.5 5.5 0 107.678-7.678z"></path></svg>';

/* ---------- theme ---------- */
const root = document.documentElement;
const btn = document.getElementById('theme-toggle');

// Sun in dark mode (click for light), moon in light mode (click for dark).
const paint = () => {
  const dark = root.dataset.theme === 'dark';
  btn.innerHTML = dark ? SUN : MOON;
  btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
};

btn.addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('jb-theme', root.dataset.theme); } catch (e) {}
  paint();
});
paint();

// Follow the OS only while the visitor hasn't chosen for themselves.
try {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (localStorage.getItem('jb-theme')) return;
    root.dataset.theme = e.matches ? 'dark' : 'light';
    paint();
  });
} catch (e) {}

/* ---------- search ---------- */
const input = document.getElementById('search');
const list = document.getElementById('postlist');

if (input) {
  let index = null;
  const load = () => index || (index = fetch('/search.json').then((r) => r.json()).catch(() => []));
  input.addEventListener('focus', load, { once: true });

  const onList = () => {
    // On /posts/ the rows are already in the DOM — filter them in place.
    const rows = [...list.querySelectorAll('.post-row')];
    const empty = document.getElementById('noresults');
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      let hits = 0;
      for (const row of rows) {
        const match = !q || row.textContent.toLowerCase().includes(q);
        row.style.display = match ? '' : 'none';
        if (match) hits++;
      }
      empty.style.display = hits ? 'none' : '';
      list.style.display = hits ? '' : 'none';
    });
  };

  const onOther = () => {
    // Elsewhere: Enter jumps to the best match, falling back to the posts page.
    input.addEventListener('keydown', async (e) => {
      if (e.key !== 'Enter') return;
      const q = input.value.trim().toLowerCase();
      if (!q) return;
      const posts = await load();
      const hit = posts.find((p) =>
        p.t.toLowerCase().includes(q) || p.d.toLowerCase().includes(q) ||
        p.g.some((t) => t.toLowerCase().includes(q)));
      location.href = hit ? hit.u : '/posts/';
    });
  };

  list ? onList() : onOther();
}
