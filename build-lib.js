// Shared helpers for build.js and its tests.

const REQUIRED = ['slug', 'title', 'date', 'description', 'tags'];

// The data contract for data/posts.json. /createpost writes this file
// programmatically, so a malformed entry must fail here with a readable message
// rather than as a TypeError deep inside a render function.
function validatePosts(posts) {
  if (!Array.isArray(posts)) throw new Error('posts.json must be an array');

  const seen = new Set();
  for (const [i, p] of posts.entries()) {
    const id = p && p.slug ? `"${p.slug}"` : `entry #${i}`;

    for (const field of REQUIRED) {
      if (p[field] === undefined || p[field] === null) {
        throw new Error(`posts.json: ${id} is missing required field "${field}"`);
      }
    }
    if (typeof p.slug !== 'string' || !/^[a-zA-Z0-9-]+$/.test(p.slug)) {
      throw new Error(`posts.json: ${id} has an invalid "slug" (letters, numbers and hyphens only)`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) {
      throw new Error(`posts.json: ${id} has an invalid "date" — want YYYY-MM-DD, got "${p.date}"`);
    }
    if (!Array.isArray(p.tags) || p.tags.length === 0) {
      throw new Error(`posts.json: ${id} needs "tags" to be a non-empty array`);
    }
    if (seen.has(p.slug)) throw new Error(`posts.json: duplicate slug ${id}`);
    seen.add(p.slug);
  }
  return posts;
}

module.exports = { validatePosts };
