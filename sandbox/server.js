const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const db      = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Products
app.get('/api/products', (req, res) => {
  res.json(db.prepare('SELECT * FROM products').all());
});

app.post('/api/products', (req, res) => {
  const { name, price, description, inventory } = req.body;
  const result = db.prepare(
    'INSERT INTO products (name, price, description, inventory) VALUES (?, ?, ?, ?)'
  ).run(name, price, description, inventory ?? 100);
  res.json({ id: result.lastInsertRowid });
});

// Users
app.get('/api/users', (req, res) => {
  res.json(db.prepare('SELECT * FROM users ORDER BY created_at ASC').all());
});

app.post('/api/users', (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name and email are required' });
    const result = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(name, email);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Orders — with joined user + product details
app.get('/api/orders', (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT
        o.id,
        o.quantity,
        o.total,
        o.created_at,
        u.name  AS user_name,
        u.email AS user_email,
        p.name  AS product_name,
        p.price AS product_price
      FROM orders o
      JOIN users    u ON o.user_id    = u.id
      JOIN products p ON o.product_id = p.id
      ORDER BY o.created_at DESC
    `).all();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', (req, res) => {
  try {
    const { user_id, product_id, quantity = 1 } = req.body;
    if (!user_id || !product_id) {
      return res.status(400).json({ error: 'user_id and product_id are required' });
    }
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const total  = product.price * quantity;
    const result = db.prepare(
      'INSERT INTO orders (user_id, product_id, quantity, total) VALUES (?, ?, ?, ?)'
    ).run(user_id, product_id, quantity, total);

    res.status(201).json({ id: result.lastInsertRowid, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Features endpoint — lists currently-mounted generated routes for the sandbox UI banner
app.get('/api/features', (req, res) => {
  try {
    const routeFiles = fs.readdirSync(__dirname)
      .filter(f => f.endsWith('.routes.js'))
      .map(f => {
        const slug     = f.replace('.routes.js', '');
        const endpoint = '/api/' + slug;
        const label    = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        return { slug, endpoint, label, file: f };
      });
    res.json(routeFiles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', port: 5000 });
});

// ─── Dynamic generated-route mounting ───────────────────────────────────────
//
// Strategy: install a single delegating middleware at /api that dispatches to
// the currently-loaded generated routers. Reloading just rebuilds the table —
// no Express internals are touched, which keeps this safe across Express 4/5.
let generatedMounts = []; // [{ prefix: '/reviews', router }]
let currentMounts   = [];
let activeFeatures  = []; // [{ table: 'reviews', slug: 'add-a-ratings-and-reviews-system' }]

function tableNameFromMigration(baseSlug) {
  const sqlPath = path.join(__dirname, `${baseSlug}.migration.sql`);
  if (!fs.existsSync(sqlPath)) return null;
  const sql   = fs.readFileSync(sqlPath, 'utf8');
  const match = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?/i);
  return match ? match[1] : null;
}

function mountGeneratedRoutes() {
  generatedMounts = [];
  currentMounts   = [];
  activeFeatures  = [];

  const routeFiles = fs.readdirSync(__dirname)
    .filter(f => f.endsWith('.routes.js'));

  for (const file of routeFiles) {
    const routePath = path.join(__dirname, file);
    const baseSlug  = file.replace(/\.routes\.js$/, '');
    const fullSlug  = baseSlug.replace(/\./g, '/');
    const tableName = tableNameFromMigration(baseSlug);

    try {
      delete require.cache[require.resolve(routePath)];
      const router = require(routePath);

      const prefixes = new Set([`/${fullSlug}`]);
      if (tableName) prefixes.add(`/${tableName}`);

      for (const prefix of prefixes) {
        generatedMounts.push({ prefix, router });
        currentMounts.push(`/api${prefix}`);
        console.log(`[sandbox] Mounted: /api${prefix} ← ${file}`);
      }

      if (tableName) {
        activeFeatures.push({ table: tableName, slug: baseSlug });
      }
    } catch (err) {
      console.error(`[sandbox] Failed to mount ${file}:`, err.message);
    }
  }
}

// Single dispatcher — installed once, consults the live mount table.
app.use('/api', (req, res, next) => {
  for (const { prefix, router } of generatedMounts) {
    if (req.url === prefix || req.url.startsWith(prefix + '/') || req.url.startsWith(prefix + '?')) {
      // Strip the prefix so the router sees relative paths.
      const original = req.url;
      req.url = req.url.slice(prefix.length) || '/';
      return router(req, res, err => {
        req.url = original;
        next(err);
      });
    }
  }
  next();
});

mountGeneratedRoutes();

// Re-mount when agent signals new files after Apply Slice.
app.post('/api/reload', (req, res) => {
  mountGeneratedRoutes();
  res.json({ success: true, mounts: currentMounts, features: activeFeatures });
});

// Tell the frontend which generated features are live so it can render their UI.
app.get('/api/extensions', (req, res) => {
  res.json({ features: activeFeatures });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Sandbox running at http://localhost:${PORT}`));
