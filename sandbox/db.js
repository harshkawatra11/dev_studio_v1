const Database = require('better-sqlite3');
const fs       = require('fs');
const path     = require('path');

const db = new Database(path.join(__dirname, 'sandbox.db'));

// Initialize schema
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Seed products if empty
const count = db.prepare('SELECT COUNT(*) as c FROM products').get();
if (count.c === 0) {
  const insert = db.prepare(
    'INSERT INTO products (name, price, description, inventory) VALUES (?, ?, ?, ?)'
  );
  insert.run('Codex Smart Coffee Mug',   49.99, 'Temperature-controlled mug linked to your IDE activity.', 87);
  insert.run('Mechanical Keyboard Pro',  129.00, 'Tactile switches optimized for long coding sessions.', 42);
  insert.run('Developer Desk Lamp',       59.99, 'Adjustable color temperature to match your focus mode.', 134);
  insert.run('Noise Cancelling Earbuds',  89.00, 'Built-in white noise and focus timer integration.',  61);
}

// Seed two demo users if empty — referral demos need both referrer and referred.
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (userCount.c === 0) {
  const insertUser = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
  insertUser.run('Demo User',  'demo@workbench.dev');
  insertUser.run('Guest User', 'guest@workbench.dev');
}

// Top up with realistic ShopBase customers for the Orders/Users tabs.
const userCount2 = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (userCount2.c < 3) {
  const insertUser = db.prepare('INSERT OR IGNORE INTO users (name, email) VALUES (?, ?)');
  insertUser.run('Alex Chen',    'alex@shopbase.dev');
  insertUser.run('Maria Santos', 'maria@shopbase.dev');
  insertUser.run('James Kirk',   'james@shopbase.dev');
}

// Seed demo orders so the Orders tab has real content on first load.
const orderCount = db.prepare('SELECT COUNT(*) as c FROM orders').get();
if (orderCount.c === 0) {
  const insertOrder = db.prepare(
    'INSERT INTO orders (user_id, product_id, quantity, total) VALUES (?, ?, ?, ?)'
  );
  insertOrder.run(1, 1, 2, 99.98);
  insertOrder.run(2, 3, 1, 59.99);
  insertOrder.run(3, 2, 1, 129.00);
  insertOrder.run(1, 4, 1, 89.00);
}

module.exports = db;
