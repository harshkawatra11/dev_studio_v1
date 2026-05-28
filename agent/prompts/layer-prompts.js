/**
 * Layer-specific prompt builders — one per agent.
 *
 * Each function receives (feature, slug, context) and returns a prompt string
 * that instructs Codex CLI to create exactly ONE file for that layer.
 *
 * `context` is an object whose keys are descriptive labels and values are the
 * literal file contents from upstream agents (e.g. the migration SQL, the model
 * code, the route code).
 */

const fs   = require('fs');
const path = require('path');

const SANDBOX = path.join(__dirname, '../../sandbox');

// ── Helpers ──────────────────────────────────────────────────────────────────

function readSandboxFile(name) {
  return fs.readFileSync(path.join(SANDBOX, name), 'utf8');
}

// ── Database Agent Prompt ────────────────────────────────────────────────────

function buildDatabasePrompt(feature, slug, _context) {
  const schema = readSandboxFile('schema.sql');

  return `
You are a database migration specialist working on an Express.js + SQLite e-commerce application.

EXISTING DATABASE SCHEMA:
${schema}

FEATURE REQUEST: "${feature}"

Create exactly ONE file: ${slug}.migration.sql

Requirements:
- Use CREATE TABLE IF NOT EXISTS only
- No DROP TABLE, no ALTER TABLE, no DELETE
- All new tables must use INTEGER PRIMARY KEY AUTOINCREMENT for the id column
- Add REFERENCES constraints to link to existing tables where appropriate
- Add created_at DATETIME DEFAULT CURRENT_TIMESTAMP where relevant
- Design the schema to fully support the requested feature
- Include any necessary indexes or constraints

Do not create any other files. Do not modify existing files. Do not explain anything.
Create ${slug}.migration.sql now.
`.trim();
}

// ── ORM Agent Prompt ─────────────────────────────────────────────────────────

function buildORMPrompt(feature, slug, context) {
  const dbjs = readSandboxFile('db.js');
  const migrationSQL = context.migration || '';

  return `
You are an ORM model specialist working on an Express.js + SQLite e-commerce application.

EXISTING DB CONNECTION (db.js):
${dbjs}

THE DATABASE MIGRATION THAT WAS JUST CREATED FOR THIS FEATURE:
${migrationSQL}

FEATURE REQUEST: "${feature}"

Create exactly ONE file: ${slug}.model.js

Requirements:
- First line must be: const db = require('./db');
- Export named functions for all common CRUD operations on the new table(s) from the migration above
- Use db.prepare().all() for SELECT queries
- Use db.prepare().run() for INSERT, UPDATE, DELETE
- Include JOINs to users/products tables where relevant so query results include human-readable names
- Last line must be: module.exports = { ... all exported functions ... }

Do not create any other files. Do not modify existing files. Do not explain anything.
Create ${slug}.model.js now.
`.trim();
}

// ── API Agent Prompt ─────────────────────────────────────────────────────────

function buildAPIPrompt(feature, slug, context) {
  const server    = readSandboxFile('server.js');
  const modelCode = context.model || '';

  return `
You are an API routing specialist working on an Express.js + SQLite e-commerce application.

EXISTING SERVER (server.js) for reference on coding style:
${server}

THE MODEL FILE THAT WAS JUST CREATED FOR THIS FEATURE:
${modelCode}

FEATURE REQUEST: "${feature}"

Create exactly ONE file: ${slug}.routes.js

Requirements:
- First line must be: const router = require('express').Router();
- Import the model: const model = require('./${slug}.model');
- Implement at minimum one GET route (list all) and one POST route (create)
- Add a GET /options route that returns dropdown data (users, products) if relevant
- All routes must return JSON responses
- Handle errors with try/catch and return status 500 on failure
- Last line must be: module.exports = router;

Do not create any other files. Do not modify existing files. Do not explain anything.
Create ${slug}.routes.js now.
`.trim();
}

// ── Frontend Agent Prompt ────────────────────────────────────────────────────

function buildFrontendPrompt(feature, slug, context) {
  const routesCode = context.routes || '';

  return `
You are a frontend component specialist working on a React + Vite application.

THE API ROUTES FILE THAT WAS JUST CREATED FOR THIS FEATURE:
${routesCode}

FEATURE REQUEST: "${feature}"

Create exactly ONE file at this path: client/src/generated/${slug}.component.jsx

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
- The component must be completely self-contained; no external imports beyond React

Do not create any other files. Do not modify existing files. Do not explain anything.
Create client/src/generated/${slug}.component.jsx now.
`.trim();
}

module.exports = {
  buildDatabasePrompt,
  buildORMPrompt,
  buildAPIPrompt,
  buildFrontendPrompt
};
