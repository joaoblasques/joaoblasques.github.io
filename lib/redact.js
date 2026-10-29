const fs = require('fs');
const path = require('path');

const PATTERNS = [
  /(?<!\d)\d{12}(?!\d)/,                                                    // AWS account ID
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,      // GUID (tenant, client, Org)
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,                                          // access key
];

// Returns what matched. `extra` = literal strings (case-insensitive).
const findLeaks = (text, extra = []) => [
  ...PATTERNS.flatMap((re) => {
    const m = text.match(new RegExp(re.source, re.flags + 'g'));
    return m || [];
  }),
  ...extra.filter((s) => s && text.toLowerCase().includes(s.toLowerCase())),
];

const TEXT = /\.(html|json|svg|txt|xml|css|js|vtt|md)$/i;

// Scans every file name and every text file under dir. shortcut: binaries (png/mp4) are checked by
// name only, not by pixels or metadata; upgrade if capture tools ever embed EXIF/IDs.
const scanDir = (dir, extra = []) => {
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      const rel = path.relative(dir, p);
      for (const h of findLeaks(rel, extra)) out.push(`${rel} (file name): ${h}`);
      if (e.isDirectory()) walk(p);
      else if (TEXT.test(e.name)) {
        for (const h of findLeaks(fs.readFileSync(p, 'utf8'), extra)) out.push(`${rel}: ${h}`);
      }
    }
  })(dir);
  return out;
};

// Extra patterns from the gitignored local file; absent file means none.
const loadExtra = (file) => fs.existsSync(file)
  ? fs.readFileSync(file, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean) : [];

module.exports = { findLeaks, scanDir, loadExtra };
