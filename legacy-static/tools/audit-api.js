#!/usr/bin/env node
/**
 * Food Express — tools/audit-api.js
 *
 * Static consistency audit for the front-end. It parses every hand-written JS
 * file, collects the identifiers each file *uses* from the shared namespaces
 * (FX.store.*, FX.u.*, FX.ui.*, FX.constants.*, FX.media.*, FX.pricing.*,
 * FX.backend.*, FX.config.*, FX.app.*, FX.components.*) and compares them with
 * the identifiers those modules actually *export*. It also checks that every
 * `totals.*` key referenced by the pages is really produced by
 * `FX.pricing.computeCart`.
 *
 * Usage: node tools/audit-api.js [--quiet]
 * Exit code 1 when at least one mismatch is found.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const QUIET = process.argv.includes('--quiet');

/* ------------------------------------------------------------------ helpers */

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function listDir(rel) {
  const dir = path.join(ROOT, rel);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => path.posix.join(rel, name));
}

/** Load a UMD module in Node and return its exported object. */
function loadUmd(rel) {
  const sandboxModule = { exports: {} };
  const fn = new Function('module', 'exports', 'require', '__filename', '__dirname', read(rel));
  fn(sandboxModule, sandboxModule.exports, require, path.join(ROOT, rel), path.dirname(path.join(ROOT, rel)));
  return sandboxModule.exports;
}

/** Strip comments and string/template literals so brace counting is reliable. */
function neutralize(source) {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (two === '//') {
      while (i < source.length && source[i] !== '\n') i += 1;
      continue;
    }
    if (two === '/*') {
      i += 2;
      while (i < source.length && source.slice(i, i + 2) !== '*/') i += 1;
      i += 2;
      out += ' ';
      continue;
    }
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i += 1;
      while (i < source.length) {
        if (source[i] === '\\') {
          i += 2;
          continue;
        }
        if (source[i] === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      out += quote + quote;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/**
 * Given source and the index of an opening `{`, return the top-level keys of
 * that object literal (both `key:` and shorthand `key,` forms).
 */
function objectKeys(source, openIndex) {
  const keys = new Set();
  let depth = 0;
  let i = openIndex;
  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') {
      depth += 1;
      if (depth === 1) continue;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) break;
    } else if (ch === '(') {
      // Skip over call parens at depth 1 (e.g. computed values).
      let paren = 1;
      i += 1;
      while (i < source.length && paren > 0) {
        if (source[i] === '(') paren += 1;
        else if (source[i] === ')') paren -= 1;
        i += 1;
      }
      i -= 1;
      continue;
    } else if (ch === '[') {
      let bracket = 1;
      i += 1;
      while (i < source.length && bracket > 0) {
        if (source[i] === '[') bracket += 1;
        else if (source[i] === ']') bracket -= 1;
        i += 1;
      }
      i -= 1;
      continue;
    }
    if (depth !== 1) continue;
    // At depth 1: look for `identifier :` or `identifier ,` / `identifier }`
    const match = /(^|[,{\s])([A-Za-z_$][\w$]*)\s*(:|,|$)/.exec(source.slice(Math.max(openIndex, i - 80), i + 2));
    if (!match) continue;
    if (match[3] === ':' || match[3] === ',') {
      const candidate = match[2];
      // Verify the identifier really sits at this position.
      const window = source.slice(openIndex, i + 2);
      const tail = new RegExp('(^|[,{\\s])' + candidate.replace(/\$/g, '\\$') + '\\s*[:,:]?$').exec(window.slice(-100));
      if (tail || match[3] === ':') keys.add(candidate);
    }
  }
  return keys;
}

/**
 * Line/indent based key extraction for the object literals in this codebase.
 * Works on raw source (no comment/string stripping) because every literal we
 * care about is formatted one key per line, indented two spaces past the
 * literal itself, and closed by a `}` at the literal's own indent.
 */
function keysOfLiteral(source, startMarker) {
  const marker = startMarker.replace(/^\n/, '').replace(/^\s+/, '');
  let at = -1;
  let scan = 0;
  // Locate the marker at the beginning of a line (only whitespace before it).
  while (scan < source.length) {
    const found = source.indexOf(marker, scan);
    if (found === -1) break;
    const lineStart = source.lastIndexOf('\n', found) + 1;
    if (source.slice(lineStart, found).trim() === '') {
      at = found;
      break;
    }
    scan = found + 1;
  }
  if (at === -1) return null;

  const markerLineStart = source.lastIndexOf('\n', at) + 1;
  const literalIndent = at - markerLineStart;
  const markerLineEnd = source.indexOf('\n', at);
  const markerLine = source.slice(markerLineStart, markerLineEnd === -1 ? source.length : markerLineEnd);

  // Single-line literal, e.g. `FX.media = { a, b, c };`
  if (markerLine.indexOf('}') !== -1) {
    const inner = markerLine.slice(markerLine.indexOf('{') + 1, markerLine.lastIndexOf('}'));
    return new Set(
      inner
        .split(',')
        .map((part) => part.split(':').shift().trim())
        .filter((part) => /^[A-Za-z_$][\w$]*$/.test(part))
    );
  }

  const keys = new Set();
  const lines = source.slice(markerLineEnd + 1).split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const indent = /^\s*/.exec(line)[0].length;
    if (indent <= literalIndent && /^\s*\}/.test(line)) break;
    if (indent !== literalIndent + 2) continue;
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;
    const named = /^(?:get |set |async )?([A-Za-z_$][\w$]*)\s*[:(]/.exec(trimmed);
    if (named) {
      keys.add(named[1]);
      continue;
    }
    const shorthand = /^([A-Za-z_$][\w$]*)\s*,?$/.exec(trimmed);
    if (shorthand) keys.add(shorthand[1]);
  }
  return keys;
}

/* ------------------------------------------------------- definition sources */

const storeSource = read('js/store.js');
const uiSource = read('js/ui.js');
const utilsSource = read('js/utils.js');
const mediaSource = read('js/media.js');
const configSource = read('js/config.js');
const appSource = read('js/app.js');
const backendSource = read('js/backend-integration.js');

const constants = loadUmd('shared/constants.js');
const pricing = loadUmd('shared/pricing.js');
const settings = loadUmd('shared/settings.js');

/* FX.store: top-level members + per-namespace methods */
const storeTop = keysOfLiteral(storeSource, 'FX.store = {') || new Set();
['boot', 'emit', 'persist', 'hashPassword', 'randomSalt', 'isDemo', 'mode', 'query', 'search', 'suggestions'].forEach((name) => {
  if (new RegExp('\\n  (?:async )?function ' + name + '\\b').test(storeSource)) storeTop.add(name);
});
storeTop.add('state');
storeTop.add('bus');

const storeNamespaces = {};
['catalog', 'location', 'cart', 'wishlist', 'recent', 'history', 'auth', 'addresses', 'notifications', 'rewards', 'coupons', 'orders', 'support', 'preferences', 'settings', 'admin', 'home', 'facets'].forEach((ns) => {
  const keys = keysOfLiteral(storeSource, '\n  const ' + ns + ' = {');
  if (keys) storeNamespaces[ns] = keys;
});

const backendNamespaces = {};
['auth', 'catalog', 'cart', 'wishlist', 'addresses', 'orders', 'coupons', 'notifications', 'support', 'admin'].forEach((ns) => {
  const keys = keysOfLiteral(backendSource, '\n    ' + ns + ': {');
  if (keys) backendNamespaces[ns] = keys;
});
const backendTop = keysOfLiteral(backendSource, '\n  const backend = {') || new Set();

const definitions = {
  storeTop,
  storeNamespaces,
  backendTop,
  backendNamespaces,
  u: keysOfLiteral(utilsSource, 'FX.u = {') || new Set(),
  ui: keysOfLiteral(uiSource, 'FX.ui = {') || new Set(),
  media: new Set((/FX\.media = \{([^}]*)\}/.exec(mediaSource) || [, ''])[1].split(',').map((s) => s.trim()).filter(Boolean)),
  config: new Set([...(keysOfLiteral(configSource, 'const CONFIG = {') || []), ...Object.keys(loadUmd('js/config.js') || {})]),
  app: keysOfLiteral(appSource, 'FX.app = {') || new Set(),
  constants: new Set(Object.keys(constants)),
  pricing: new Set(Object.keys(pricing)),
  settings: new Set(Object.keys(settings)),
};

/* FX.components registry names */
const componentNames = new Set();
listDir('js/components').forEach((file) => {
  const source = read(file);
  const found = source.match(/FX\.components\.([A-Za-z_$][\w$]*)\s*=/g) || [];
  found.forEach((entry) => componentNames.add(entry.replace('FX.components.', '').replace('=', '').trim()));
});

/* ------------------------------------------------------------- usage scan */

const files = []
  .concat(listDir('js/pages'))
  .concat(listDir('js/components'))
  .concat(['js/app.js', 'js/ui.js', 'js/store.js', 'js/backend-integration.js', 'js/media.js', 'js/api.js', 'js/config.js', 'js/utils.js', 'script.js'].filter(exists));

const problems = [];
let checked = 0;

function record(kind, used, file, line) {
  problems.push({ kind, used, file, line });
}

/* Files that alias the constants module as `C` (store.js and friends). */
const constantAliasFiles = new Set(files.filter((file) => /const C = (?:FX\.)?constants\b/.test(read(file))));

function checkEnumMember(key, member, file, line) {
  if (!(key in constants)) {
    record('FX.constants key', key, file, line);
    return;
  }
  const value = constants[key];
  if (value && typeof value === 'object' && !(member in value)) {
    record('FX.constants member', key + '.' + member, file, line);
  }
}

/* Tokens that are file extensions in paths, not namespace members. */
const FILE_EXTENSION_TOKENS = new Set(['js', 'html', 'css', 'json', 'md']);

const CHECKS = [
  {
    label: 'store namespace',
    re: /(?:^|[^.\w$])(?:FX\.)?store\.([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*\(/g,
    test(m, file, line) {
      const ns = m[1];
      const method = m[2];
      if (ns === 'state' || ns === 'bus') return;
      if (!storeNamespaces[ns]) {
        if (!storeTop.has(ns)) record('store member', ns + '.' + method, file, line);
        return;
      }
      if (!storeNamespaces[ns].has(method)) record('store method', ns + '.' + method, file, line);
    },
  },
  {
    label: 'store member',
    re: /(?:^|[^.\w$])(?:FX\.)?store\.([A-Za-z_$][\w$]*)\s*\(/g,
    test(m, file, line) {
      if (!storeTop.has(m[1])) record('store member', m[1] + '()', file, line);
    },
  },
  {
    label: 'backend namespace',
    re: /(?:^|[^.\w$])(?:FX\.)?backend\.([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*\(/g,
    test(m, file, line) {
      const ns = m[1];
      if (ns === 'state') return;
      if (!backendNamespaces[ns]) {
        if (!backendTop.has(ns)) record('backend member', ns + '.' + m[2], file, line);
        return;
      }
      if (!backendNamespaces[ns].has(m[2])) record('backend method', ns + '.' + m[2], file, line);
    },
  },
  {
    label: 'FX.u helper',
    re: /(?:^|[^.\w$])(?:FX\.)?u\.([A-Za-z_$][\w$]*)/g,
    test(m, file, line) {
      if (!definitions.u.has(m[1])) record('FX.u helper', m[1], file, line);
    },
  },
  {
    label: 'FX.ui helper',
    re: /(?:^|[^.\w$])ui\.([A-Za-z_$][\w$]*)/g,
    test(m, file, line) {
      if (!definitions.ui.has(m[1])) record('FX.ui helper', m[1], file, line);
    },
  },
  {
    label: 'FX.media helper',
    re: /(?:^|[^.\w$])(?:FX\.)?media\.([A-Za-z_$][\w$]*)/g,
    test(m, file, line) {
      if (!definitions.media.has(m[1])) record('FX.media helper', m[1], file, line);
    },
  },
  {
    label: 'FX.constants key',
    re: /(?:^|[^.\w$])(?:FX\.)?constants\.([A-Z_0-9]+)/g,
    test(m, file, line) {
      if (!definitions.constants.has(m[1])) record('FX.constants key', m[1], file, line);
    },
  },
  {
    label: 'FX.constants helper',
    re: /(?:^|[^.\w$])(?:FX\.)?constants\.([a-z][\w$]*)\s*\(/g,
    test(m, file, line) {
      if (!definitions.constants.has(m[1])) record('FX.constants helper', m[1], file, line);
    },
  },
  {
    label: 'FX.constants enum member',
    re: /(?:^|[^.\w$])(?:FX\.)?constants\.([A-Z_0-9]+)\.([A-Z_0-9]+)/g,
    test(m, file, line) {
      checkEnumMember(m[1], m[2], file, line);
    },
  },
  {
    label: 'C.* enum alias',
    re: /(?:^|[^.\w$])C\.([A-Z_0-9]+)(?:\.([A-Z_0-9]+))?/g,
    test(m, file, line) {
      if (!constantAliasFiles.has(file)) return;
      if (m[2]) checkEnumMember(m[1], m[2], file, line);
      else if (!(m[1] in constants)) record('FX.constants key', m[1], file, line);
    },
  },
  {
    label: 'FX.pricing helper',
    re: /(?:^|[^.\w$])(?:FX\.)?pricing\.([A-Za-z_$][\w$]*)/g,
    test(m, file, line) {
      if (!definitions.pricing.has(m[1])) record('FX.pricing helper', m[1], file, line);
    },
  },
  {
    label: 'FX.config key',
    re: /(?:^|[^.\w$])(?:FX\.)?config\.([A-Za-z_$][\w$]*)/g,
    test(m, file, line) {
      // Ignore path fragments such as `js/config.js` mentioned in comments/strings.
      if (FILE_EXTENSION_TOKENS.has(m[1])) return;
      if (!definitions.config.has(m[1])) record('FX.config key', m[1], file, line);
    },
  },
  {
    label: 'FX.app member',
    re: /(?:^|[^.\w$])FX\.app\.([A-Za-z_$][\w$]*)/g,
    test(m, file, line) {
      if (!definitions.app.has(m[1])) record('FX.app member', m[1], file, line);
    },
  },
  {
    label: 'FX.components entry',
    re: /(?:^|[^.\w$])FX\.components\.([A-Za-z_$][\w$]*)/g,
    test(m, file, line) {
      if (!componentNames.has(m[1])) record('FX.components entry', m[1], file, line);
    },
  },
];

files.forEach((file) => {
  const source = read(file);
  source.split('\n').forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    CHECKS.forEach((check) => {
      check.re.lastIndex = 0;
      let m;
      while ((m = check.re.exec(line))) {
        checked += 1;
        check.test(m, file, index + 1);
        if (m.index === check.re.lastIndex) check.re.lastIndex += 1;
      }
    });
  });
});

/* ------------------------------------------- pricing totals key validation */

const sample = pricing.computeCart({
  items: [
    { itemId: 'x', type: 'product', qty: 2, unitPrice: 100, gstRate: 0.05, mrp: 140 },
    { itemId: 'y', type: 'menu-item', qty: 1, unitPrice: 200, addons: [{ label: 'Cheese', price: 40 }] },
  ],
  coupon: null,
  settings: settings.DEFAULT_SETTINGS,
  cartType: 'store',
  tip: 10,
  redeemPoints: 100,
  availablePoints: 500,
  orderCount: 2,
  isNewUser: false,
  cityId: 'vijayawada',
});
const totalsKeys = new Set(Object.keys(sample));
if (sample.items && sample.items.length) Object.keys(sample.items[0]).forEach((k) => totalsKeys.add('items().' + k));

const totalsProblems = [];
files.forEach((file) => {
  read(file)
    .split('\n')
    .forEach((line, index) => {
      const re = /\btotals\.([a-z][A-Za-z0-9_]*)/g;
      let m;
      while ((m = re.exec(line))) {
        if (!totalsKeys.has(m[1])) totalsProblems.push({ used: m[1], file, line: index + 1 });
      }
    });
});

/* --------------------------------------------------------------- debug dump */

if (process.argv.includes('--dump')) {
  console.log('\n--- parsed definitions ---');
  console.log('backendTop: ' + Array.from(backendTop).join(', '));
  Object.keys(backendNamespaces).forEach((ns) => console.log('backend.' + ns + ': ' + Array.from(backendNamespaces[ns]).join(', ')));
  Object.keys(storeNamespaces).forEach((ns) => console.log('store.' + ns + ': ' + Array.from(storeNamespaces[ns]).join(', ')));
  console.log('u: ' + Array.from(definitions.u).join(', '));
  console.log('ui: ' + Array.from(definitions.ui).join(', '));
  console.log('app: ' + Array.from(definitions.app).join(', '));
  console.log('config: ' + Array.from(definitions.config).join(', '));
}

/* --------------------------------------------------------------- reporting */

const grouped = new Map();
problems.concat(totalsProblems.map((p) => ({ kind: 'pricing totals key', used: p.used, file: p.file, line: p.line }))).forEach((problem) => {
  const key = problem.kind + ' → ' + problem.used;
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(problem.file + ':' + problem.line);
});

if (!QUIET) {
  console.log('Audited ' + files.length + ' files · ' + checked + ' namespace references checked');
  console.log('Definitions: store ' + storeTop.size + ' top-level + ' + Object.keys(storeNamespaces).length + ' namespaces · ui ' + definitions.ui.size + ' · u ' + definitions.u.size + ' · media ' + definitions.media.size + ' · config ' + definitions.config.size + ' · constants ' + definitions.constants.size);
  console.log('pricing.computeCart keys (' + totalsKeys.size + '): ' + Array.from(totalsKeys).sort().join(', '));
}

if (grouped.size) {
  console.log('\nMISMATCHES (' + grouped.size + ' distinct):');
  Array.from(grouped.entries())
    .sort()
    .forEach(([key, where]) => {
      const unique = Array.from(new Set(where));
      console.log('  ✗ ' + key + '  ← ' + unique.slice(0, 4).join(', ') + (unique.length > 4 ? ' (+' + (unique.length - 4) + ' more)' : ''));
    });
  process.exitCode = 1;
} else {
  console.log('\n✓ No API mismatches found.');
}
