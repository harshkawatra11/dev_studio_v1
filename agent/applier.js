const fs          = require('fs');
const path        = require('path');
const Database    = require('better-sqlite3');
const { getTarget, getSandboxPath } = require('./target');
const { isWithinWriteScope, getLayerForFile } = require('./layers');

const GENERATED_DIR = path.join(getSandboxPath(), 'client/src/generated');

function applyMigration(changes) {
  const target = getTarget();
  const sqlEntry = Object.entries(changes)
    .find(([filename]) => filename.endsWith('.migration.sql'));

  if (!sqlEntry) {
    return { applied: false, reason: 'No migration file found in changes' };
  }

  const [sqlFilename, { generated }] = sqlEntry;

  if (!generated || !generated.trim()) {
    return { applied: false, reason: 'Migration file is empty' };
  }

  // Run the SQL inside a transaction so any failure leaves the DB clean
  const dbPath = path.join(target, 'sandbox.db');
  const db = new Database(dbPath);
  try {
    db.transaction(() => {
      db.exec(generated);
    })();
  } catch (err) {
    throw new Error(`Migration failed: ${err.message}`);
  } finally {
    db.close();
  }

  const written = [];
  const violations = [];

  for (const [filename, { generated: content }] of Object.entries(changes)) {
    if (!content || !content.trim()) continue;
    if (filename.endsWith('.migration.sql')) continue; // SQL already applied above

    // Write-scope guard: reject files outside the agent's declared write directory
    const layer = getLayerForFile(filename);
    if (layer && layer.id !== 'unknown' && !isWithinWriteScope(filename, layer.id)) {
      violations.push(filename);
      console.warn(`[applier] BLOCKED write outside scope: ${filename} (agent: ${layer.id})`);
      continue;
    }

    // Determine output path
    let outPath;
    if (filename.endsWith('.component.jsx')) {
      // React components always go to the generated dir (relative to sandbox client)
      const outFile = path.basename(filename);
      fs.mkdirSync(GENERATED_DIR, { recursive: true });
      outPath = path.join(GENERATED_DIR, outFile);
    } else {
      // Other generated files (model, routes) go to the target root, preserving one-level sub-paths
      const relDir  = path.dirname(filename);
      const outDir  = (relDir && relDir !== '.') ? path.join(target, relDir) : target;
      fs.mkdirSync(outDir, { recursive: true });
      outPath = path.join(outDir, path.basename(filename));
    }

    // Path traversal guard
    const resolved = path.resolve(outPath);
    const targetAbs = path.resolve(target);
    const genAbs    = path.resolve(GENERATED_DIR);
    if (!resolved.startsWith(targetAbs) && !resolved.startsWith(genAbs)) {
      violations.push(filename);
      console.warn(`[applier] BLOCKED path traversal: ${filename}`);
      continue;
    }

    fs.writeFileSync(outPath, content, 'utf8');
    written.push(filename);
  }

  return {
    applied:    true,
    file:       path.basename(sqlFilename),
    written,
    violations: violations.length ? violations : undefined,
  };
}

function resetGeneratedTables(tableNames = []) {
  if (!tableNames.length) return;
  const target = getTarget();
  const db = new Database(path.join(target, 'sandbox.db'));
  try {
    db.transaction(() => {
      for (const table of tableNames) {
        // Sanitize table name to prevent injection
        if (/^\w+$/.test(table)) db.exec(`DROP TABLE IF EXISTS "${table}"`);
      }
    })();
  } finally {
    db.close();
  }
}

function resetGeneratedComponents() {
  if (!fs.existsSync(GENERATED_DIR)) return;
  const files = fs.readdirSync(GENERATED_DIR).filter(f => f !== '.gitkeep');
  for (const file of files) {
    try { fs.unlinkSync(path.join(GENERATED_DIR, file)); } catch { /* file locked or gone */ }
  }
}

module.exports = { applyMigration, resetGeneratedTables, resetGeneratedComponents };
