const fs   = require('fs');
const path = require('path');

module.exports = function buildPrompt(feature, sandboxPath) {
  const slug = feature
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  const schema = fs.readFileSync(path.join(sandboxPath, 'schema.sql'), 'utf8');
  const server = fs.readFileSync(path.join(sandboxPath, 'server.js'),  'utf8');
  const dbjs   = fs.readFileSync(path.join(sandboxPath, 'db.js'),      'utf8');

  return `
You are working inside an Express.js and SQLite e-commerce application.

EXISTING DATABASE SCHEMA:
${schema}

EXISTING SERVER:
${server}

EXISTING DB CONNECTION:
${dbjs}

FEATURE REQUEST: "${feature}"

Your task is to implement this feature by creating exactly four new files.
Do not modify any existing files under any circumstances.
Do not explain anything. Do not add markdown. Just create the files.

FILE 1 - ${slug}.migration.sql
Requirements:
- Use CREATE TABLE IF NOT EXISTS only
- No DROP TABLE, no ALTER TABLE, no DELETE
- All new tables must use INTEGER PRIMARY KEY AUTOINCREMENT for the id column
- Add REFERENCES constraints to link to existing tables where appropriate
- Add created_at DATETIME DEFAULT CURRENT_TIMESTAMP where relevant

FILE 2 - ${slug}.model.js
Requirements:
- First line must be: const db = require('./db');
- Export named functions for all common CRUD operations on the new table
- Use db.prepare().all() for SELECT queries
- Use db.prepare().run() for INSERT, UPDATE, DELETE
- Last line must be: module.exports = { ... all exported functions ... }

FILE 3 - ${slug}.routes.js
Requirements:
- First line must be: const router = require('express').Router();
- Import the model: const model = require('./${slug}.model');
- Implement at minimum one GET route and one POST route
- All routes must return JSON responses
- Handle errors with try/catch and return status 500 on failure
- Last line must be: module.exports = router;

FILE 4 - ${slug}.component.jsx
Write this file to: client/src/generated/${slug}.component.jsx
Requirements:
- Import React and useState, useEffect at the top
- Use fetch('/api/${slug}') for all API calls; the proxy handles routing
- Display a list of existing records fetched on mount via useEffect
- Include a form to create a new record
- On form submit, POST to '/api/${slug}' and refresh the list
- Style using inline styles only; light theme, white backgrounds, #0f172a text
- For ratings: include clickable star UI using star characters for selecting 1-5 stars
- For referrals: include a generate code button and a redeem code input
- Export as default function with a descriptive PascalCase name
- The component must be completely self-contained; no external imports

Create all four files now.
`.trim();
};
