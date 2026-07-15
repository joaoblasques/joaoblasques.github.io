#!/usr/bin/env node
// Guards the data contract /createpost writes to. Run: node test-posts-validation.js
const assert = require('assert');
const { validatePosts } = require('./build-lib');

const valid = [{ slug: 'a', title: 'A', date: '2026-01-01', description: 'd', tags: ['x'] }];

// happy path
assert.doesNotThrow(() => validatePosts(valid), 'valid post should pass');

// each required field, missing
for (const field of ['slug', 'title', 'date', 'description', 'tags']) {
  const bad = [{ ...valid[0] }];
  delete bad[0][field];
  assert.throws(() => validatePosts(bad), new RegExp(field),
    `missing "${field}" must throw and name the field`);
}

// tags must be a non-empty array, not a string
assert.throws(() => validatePosts([{ ...valid[0], tags: 'x' }]), /tags/, 'string tags must throw');
assert.throws(() => validatePosts([{ ...valid[0], tags: [] }]), /tags/, 'empty tags must throw');

// date must be YYYY-MM-DD — a bad date silently breaks sort order and the RSS pubDate
assert.throws(() => validatePosts([{ ...valid[0], date: '14-07-2026' }]), /date/, 'bad date format must throw');

// duplicate slugs would overwrite each other's page
assert.throws(() => validatePosts([valid[0], valid[0]]), /duplicate/i, 'duplicate slug must throw');

// the error must name the offending slug, so the message is actionable
try { validatePosts([{ slug: 'oops', title: 'T', date: '2026-01-01', description: 'd' }]); }
catch (e) { assert.ok(e.message.includes('oops'), 'error must name the slug'); }

console.log('✓ posts.json validation: all cases pass');
