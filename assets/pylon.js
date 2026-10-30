/* Pylon matrix: filter rows by badge. Without JS every row stays visible. */
(() => {
  const m = document.getElementById('matrix');
  if (!m) return;
  const rows = [...m.querySelectorAll('details.pylon-row')];
  const heads = [...m.querySelectorAll('h3')];
  const badges = [...new Set(rows.map((r) => r.dataset.badge))];
  const bar = document.createElement('div');
  bar.className = 'pylon-filter';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Filter rows by status');
  const show = (b) => {
    rows.forEach((r) => { r.hidden = b !== 'all' && r.dataset.badge !== b; });
    // hide a group heading when all its rows are hidden
    heads.forEach((h) => {
      let n = h.nextElementSibling, any = false;
      while (n && n.tagName === 'DETAILS') { any = any || !n.hidden; n = n.nextElementSibling; }
      h.hidden = !any;
    });
    bar.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.b === b)));
  };
  ['all', ...badges].forEach((b) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.b = b;
    btn.textContent = b === 'all' ? `All (${rows.length})`
      : `${rows.find((r) => r.dataset.badge === b).querySelector('.pylon-badge').textContent} (${rows.filter((r) => r.dataset.badge === b).length})`;
    btn.addEventListener('click', () => show(b));
    bar.appendChild(btn);
  });
  m.insertBefore(bar, heads[0] || null);
  show('all');
})();
