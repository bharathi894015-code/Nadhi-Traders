const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');

// Vercel uses a read-only filesystem except for /tmp
const dbPath = process.env.VERCEL
  ? path.join('/tmp', 'nadhi.db')
  : path.join(__dirname, 'nadhi.db');

// If on Vercel and db doesn't exist in /tmp, copy the initial one from the repo
if (process.env.VERCEL && !fs.existsSync(dbPath)) {
  const originalDbPath = path.join(__dirname, 'nadhi.db');
  if (fs.existsSync(originalDbPath)) {
    fs.copyFileSync(originalDbPath, dbPath);
  }
}

const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    image TEXT DEFAULT 'default.jpg',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerName TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    pincode TEXT NOT NULL,
    products TEXT NOT NULL,
    totalAmount REAL NOT NULL,
    paymentMethod TEXT DEFAULT 'COD',
    status TEXT DEFAULT 'Pending',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    mobile TEXT,
    whatsapp TEXT,
    bio TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );
`);

// Seed products if empty
const count = db.prepare('SELECT COUNT(*) as c FROM products').get();
if (count.c === 0) {
  const insert = db.prepare(`
    INSERT INTO products (name, category, description, price, stock, image)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const products = [
    ['Badham (Almonds)', 'Dry Fruit', 'Premium California almonds, rich in Vitamin E and healthy fats. Great for brain health and skin.', 320, 100, 'almonds.jpg'],
    ['Cashew', 'Dry Fruit', 'Creamy and buttery cashews loaded with magnesium and zinc. Perfect for snacking or cooking.', 280, 80, 'cashew.jpg'],
    ['Pistachio', 'Dry Fruit', 'Crunchy and delicious pistachios packed with antioxidants and high-quality protein.', 450, 60, 'pistachio.jpg'],
    ['Dry Amla', 'Dry Fruit', 'Dried Indian gooseberry, a powerhouse of Vitamin C. Boosts immunity and digestion.', 150, 120, 'amla.jpg'],
    ['Dates', 'Dry Fruit', 'Soft and naturally sweet Medjool dates. Rich in fiber, iron, and natural energy.', 200, 90, 'dates.jpg'],
    ['Sunflower Seeds', 'Seed', 'Nutrient-dense sunflower seeds high in Vitamin E and selenium. Great for skin health.', 120, 150, 'sunflower.jpg'],
    ['Chia Seeds', 'Seed', 'Tiny but mighty chia seeds loaded with omega-3, fiber, and calcium. Perfect for smoothies.', 180, 130, 'chia.jpg'],
    ['Sabja Seeds', 'Seed', 'Sweet basil seeds that swell in water. Cooling, digestive, and great in drinks and desserts.', 130, 110, 'sabja.jpg'],
    ['Pumpkin Seeds', 'Seed', 'Crunchy pumpkin seeds rich in zinc and magnesium. Excellent for heart and prostate health.', 160, 140, 'pumpkin.jpg'],
  ];

  const insertMany = db.transaction((items) => {
    for (const item of items) insert.run(...item);
  });
  insertMany(products);
  console.log('✅ Sample products seeded.');
}

// Seed default admin if empty
const adminCount = db.prepare('SELECT COUNT(*) as c FROM admins').get();
if (adminCount.c === 0) {
  const bcrypt = require('bcryptjs');
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync('admin123', salt);
  db.prepare('INSERT INTO admins (email, password) VALUES (?, ?)').run('admin@nadhitraders.com', hash);
  console.log('✅ Default admin seeded: admin@nadhitraders.com / admin123');
}

module.exports = db;
