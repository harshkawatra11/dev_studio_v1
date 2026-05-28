const fs   = require('fs');
const path = require('path');

const SANDBOX = path.join(__dirname, '../sandbox');

const BASELINE_FILES = new Set([
  'schema.sql',
  'db.js',
  'server.js',
  'package.json',
  'package-lock.json',
  'sandbox.db'
]);

function snapshotDir(dir) {
  const snapshot = {};

  function walk(currentDir, prefix = '') {
    const entries = fs.readdirSync(currentDir);
    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      if (entry === 'node_modules') continue;
      if (entry === 'public') continue;

      const fullPath = path.join(currentDir, entry);
      const stat     = fs.statSync(fullPath);
      const key      = prefix ? `${prefix}/${entry}` : entry;

      if (stat.isDirectory()) {
        walk(fullPath, key);
      } else if (stat.isFile()) {
        snapshot[key] = fs.readFileSync(fullPath, 'utf8');
      }
    }
  }

  walk(dir);
  return snapshot;
}

function diffSnapshots(before, after) {
  const changes = {};

  for (const [file, content] of Object.entries(after)) {
    const isBaseline = BASELINE_FILES.has(path.basename(file));
    if (isBaseline) continue;

    const existed = Object.prototype.hasOwnProperty.call(before, file);
    const changed = existed && before[file] !== content;
    const isNew   = !existed;

    if (isNew || changed) {
      changes[file] = {
        original:  existed ? before[file] : '',
        generated: content,
        isNew,
        language:  detectLanguage(file)
      };
    }
  }

  return changes;
}

function detectLanguage(filename) {
  const ext = path.extname(filename).toLowerCase();
  const map  = {
    '.sql':  'sql',
    '.js':   'javascript',
    '.jsx':  'javascript',
    '.ts':   'typescript',
    '.tsx':  'typescript',
    '.json': 'json',
    '.md':   'markdown',
    '.css':  'css',
    '.html': 'html'
  };
  return map[ext] || 'plaintext';
}

function getSandboxPath() {
  return SANDBOX;
}

module.exports = { snapshotDir, diffSnapshots, getSandboxPath, SANDBOX };
