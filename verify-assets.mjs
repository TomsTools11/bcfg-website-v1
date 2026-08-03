#!/usr/bin/env node
/*
 * verify-assets.mjs — checks bcfg/ against what the pages actually reference.
 *
 *   node verify-assets.mjs
 *
 * Reports two failures:
 *   MISSING   a page asks for a file that is not on disk (broken image)
 *   ORPHANED  a file sits in bcfg/ that no page asks for (dead weight)
 *
 * Most of the photography is not referenced literally: the hero slideshow walks
 * hero-01..hero-<HERO_COUNT>, and each lake gallery walks <id>-01..<id>-<n>
 * from the LAKES table. So this reads those two numbers straight out of the
 * EDIT block and expands them, which is also what makes it catch the common
 * mistake — dropping photos into a lake folder and forgetting to bump `n`.
 *
 * Plain Node, no dependencies, not part of the deployed site.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const ASSET_DIR = join(ROOT, 'bcfg');
const PAGES = ['index.html', 'preview.html'];
const ASSET_EXT = /\.(jpe?g|png|svg|webp|gif|avif|ico)$/i;

const pad = (n) => String(n).padStart(2, '0');

/* ---------- what is on disk ---------------------------------------- */

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push('/' + relative(ROOT, full).split('\\').join('/'));
  }
  return out;
}

const onDisk = new Set(walk(ASSET_DIR));

/* ---------- what the pages reference -------------------------------- */

const referenced = new Map(); // path -> Set of pages that ask for it
const notes = [];

function refer(path, page) {
  if (!referenced.has(path)) referenced.set(path, new Set());
  referenced.get(path).add(page);
}

for (const page of PAGES) {
  let src;
  try {
    src = readFileSync(join(ROOT, page), 'utf8');
  } catch {
    console.error(`verify-assets: cannot read ${page}`);
    process.exitCode = 1;
    continue;
  }

  // Literal paths in markup and script. Anything without a file extension is a
  // string being concatenated into a path at runtime ('/bcfg/hero/hero-'), and
  // is covered by the expansions below instead.
  for (const m of src.matchAll(/\/bcfg\/[^"'`)\s>]+/g)) {
    if (ASSET_EXT.test(m[0])) refer(m[0], page);
  }

  // Hero slideshow: hero-01.jpg .. hero-<HERO_COUNT>.jpg
  const hero = src.match(/HERO_COUNT\s*=\s*(\d+)/);
  if (hero) {
    const n = Number(hero[1]);
    notes.push(`${page}: HERO_COUNT = ${n}`);
    for (let i = 1; i <= n; i++) refer(`/bcfg/hero/hero-${pad(i)}.jpg`, page);
  }

  // Lake galleries: <id>/<id>-01.jpg .. <id>-<n>.jpg from the LAKES table.
  const table = src.match(/var LAKES\s*=\s*\[([\s\S]*?)\n\s*\];/);
  if (table) {
    const lakes = [...table[1].matchAll(/id:\s*'([^']+)'[\s\S]*?n:\s*(\d+)/g)];
    notes.push(`${page}: LAKES = ${lakes.map((l) => `${l[1]}:${l[2]}`).join(' ')}`);
    for (const [, id, count] of lakes) {
      for (let i = 1; i <= Number(count); i++) {
        refer(`/bcfg/${id}/${id}-${pad(i)}.jpg`, page);
      }
    }
  }
}

/* ---------- compare -------------------------------------------------- */

const missing = [...referenced.keys()].filter((p) => !onDisk.has(p)).sort();
const orphaned = [...onDisk].filter((p) => !referenced.has(p)).sort();

for (const note of notes) console.log(`  ${note}`);
console.log(`  ${onDisk.size} files in bcfg/, ${referenced.size} referenced by ${PAGES.join(' + ')}`);

if (missing.length) {
  console.log(`\nMISSING (${missing.length}) — referenced but not on disk:`);
  for (const p of missing) console.log(`  ${p}   <- ${[...referenced.get(p)].join(', ')}`);
}

if (orphaned.length) {
  console.log(`\nORPHANED (${orphaned.length}) — on disk but never referenced:`);
  for (const p of orphaned) console.log(`  ${p}`);
  console.log('\n  If these are new lake photos, bump that lake\'s `n` in the LAKES');
  console.log('  table (or HERO_COUNT for hero shots) in site/index.html.');
}

if (missing.length || orphaned.length) {
  console.log(`\nFAIL: ${missing.length} missing, ${orphaned.length} orphaned.`);
  process.exit(1);
}

console.log('\nOK: zero missing, zero orphaned.');
