const fs          = require('fs');
const path        = require('path');
const Database    = require('better-sqlite3');
const { SANDBOX } = require('./parser');

const GENERATED_DIR = path.join(__dirname, '../sandbox/client/src/generated');

function applyMigration(changes) {
  const sqlEntry = Object.entries(changes)
    .find(([filename]) => filename.endsWith('.migration.sql'));

  if (!sqlEntry) {
    return { applied: false, reason: 'No migration file found in changes' };
  }

  const [filename, { generated }] = sqlEntry;

  if (!generated || !generated.trim()) {
    return { applied: false, reason: 'Migration file is empty' };
  }

  const db = new Database(path.join(SANDBOX, 'sandbox.db'));
  try {
    db.exec(generated);
  } catch (err) {
    throw new Error(`Migration failed: ${err.message}`);
  } finally {
    db.close();
  }

  for (const [filename, { generated: content }] of Object.entries(changes)) {
    if (!content || !content.trim()) continue;

    const outFile = path.basename(filename);

    if (filename.endsWith('.component.jsx')) {
      if (!fs.existsSync(GENERATED_DIR)) {
        fs.mkdirSync(GENERATED_DIR, { recursive: true });
      }
      fs.writeFileSync(path.join(GENERATED_DIR, outFile), content);
    } else if (!filename.endsWith('.migration.sql')) {
      fs.writeFileSync(path.join(SANDBOX, outFile), content);
    }
  }

  return { applied: true, file: path.basename(filename) };
}

function resetGeneratedTables(tableNames = []) {
  if (!tableNames.length) return;

  const db = new Database(path.join(SANDBOX, 'sandbox.db'));
  try {
    for (const table of tableNames) {
      db.exec(`DROP TABLE IF EXISTS ${table}`);
    }
  } finally {
    db.close();
  }
}

function resetGeneratedComponents() {
  if (!fs.existsSync(GENERATED_DIR)) return;

  const files = fs.readdirSync(GENERATED_DIR)
    .filter(f => f !== '.gitkeep');

  for (const file of files) {
    fs.unlinkSync(path.join(GENERATED_DIR, file));
  }
}

module.exports = { applyMigration, resetGeneratedTables, resetGeneratedComponents };
