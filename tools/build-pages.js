#!/usr/bin/env node
/**
 * Food Express — static page assembler.
 *
 * Composes the root HTML pages from:
 *   tools/partials/shell.html    → <head>, meta, CSS, body wrapper
 *   tools/partials/scripts.html  → shared runtime script tags
 *   src/pages/<name>.body.html   → the page's semantic markup
 *   tools/pages.json             → per-page title/description/guards/scripts
 *
 * The generated root files are committed so the site can be opened directly
 * (or served by any static host) with no build step at runtime. Re-run
 * `npm run build:pages` whenever the shell or a fragment changes.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const manifestPath = path.join(__dirname, 'pages.json');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

/** Replace every `{{KEY}}` occurrence (not just the first) in a template. */
function fill(template, values) {
  return Object.keys(values).reduce((output, key) => output.split(`{{${key}}}`).join(values[key]), template);
}

/** Escape a value that lands inside an HTML attribute or text node. */
function escapeAttr(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function build() {
  const manifest = JSON.parse(read('tools/pages.json'));
  const shell = read('tools/partials/shell.html');
  const scripts = read('tools/partials/scripts.html');
  let count = 0;

  manifest.pages.forEach((page) => {
    const fragment = read(page.src);
    const bodyAttrs = [];
    const bodyClass = [];
    if (page.page) bodyAttrs.push(`data-page="${page.page}"`);
    if (page.protected) bodyAttrs.push(`data-protected="${page.protected}"`);
    if (page.chrome === 'none') {
      bodyAttrs.push('data-chrome="none"');
      bodyClass.push('fx-standalone');
    }
    Object.keys(page.attrs || {}).forEach((key) => bodyAttrs.push(`${key}="${page.attrs[key]}"`));

    const pageScripts = (page.scripts || [])
      .map((src) => `<script defer src="${src}"></script>`)
      .join('\n');

    const banner =
      `<!-- Generated from ${page.src} by tools/build-pages.js — edit the fragment, not this file. -->\n`;

    const html = fill(shell, {
      TITLE: escapeAttr(page.title),
      DESCRIPTION: escapeAttr(page.description),
      BODY_CLASS: bodyClass.length ? ' ' + bodyClass.join(' ') : '',
      BODY_ATTRS: bodyAttrs.length ? ' ' + bodyAttrs.join(' ') : '',
      CONTENT: banner + fragment.trim() + '\n' + fill(scripts, { PAGE_SCRIPTS: pageScripts }),
    });

    const leftovers = html.match(/\{\{[A-Z_]+\}\}/g);
    if (leftovers) {
      throw new Error(`${page.out}: unresolved placeholders ${Array.from(new Set(leftovers)).join(', ')}`);
    }

    fs.writeFileSync(path.join(ROOT, page.out), html, 'utf8');
    count += 1;
  });

  // A tiny 404 fallback for static hosts that support a custom error document.
  console.log(`Built ${count} pages from ${manifest.pages.length} manifest entries.`);
}

build();
