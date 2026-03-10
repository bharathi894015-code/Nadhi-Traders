require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let db;
let isSupabase = false;

if (supabaseUrl && supabaseKey && supabaseUrl !== 'your_supabase_url') {
  db = createClient(supabaseUrl, supabaseKey);
  isSupabase = true;
  console.log('🌐 Connected to Supabase Cloud Database');
} else {
  const Database = require('better-sqlite3');
  const dbPath = process.env.VERCEL
    ? path.join('/tmp', 'nadhi.db')
    : path.join(__dirname, 'nadhi.db');

  if (process.env.VERCEL && !fs.existsSync(dbPath)) {
    const originalDbPath = path.join(__dirname, 'nadhi.db');
    if (fs.existsSync(originalDbPath)) fs.copyFileSync(originalDbPath, dbPath);
  }
  db = new Database(dbPath);
  console.log('📂 Using Local SQLite Database');

  // Create tables for SQLite
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

  // Seed products if empty for SQLite
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

  // Seed default admin if empty for SQLite
  const adminCount = db.prepare('SELECT COUNT(*) as c FROM admins').get();
  if (adminCount.c === 0) {
    const bcrypt = require('bcryptjs');
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin123', salt);
    db.prepare('INSERT INTO admins (email, password) VALUES (?, ?)').run('admin@nadhitraders.com', hash);
    console.log('✅ Default admin seeded: admin@nadhitraders.com / admin123');
  }
}

// Wrapper for common operations to maintain compatibility
const DB = {
  isSupabase,
  async products() {
    if (isSupabase) {
      const { data } = await db.from('products').select('*').order('id');
      return data || [];
    }
    return db.prepare('SELECT * FROM products ORDER BY id').all();
  },
  async product(id) {
    if (isSupabase) {
      const { data } = await db.from('products').select('*').eq('id', id).single();
      return data;
    }
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  },
  async createProduct(p) {
    if (isSupabase) {
      const { data, error } = await db.from('products').insert([p]).select().single();
      if (error) throw error;
      return data;
    }
    const res = db.prepare('INSERT INTO products (name, category, description, price, stock, image) VALUES (?, ?, ?, ?, ?, ?)').run(p.name, p.category, p.description, p.price, p.stock, p.image);
    return db.prepare('SELECT * FROM products WHERE id = ?').get(res.lastInsertRowid);
  },
  async updateProduct(id, p) {
    if (isSupabase) {
      const { data, error } = await db.from('products').update(p).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    db.prepare('UPDATE products SET name=?, category=?, description=?, price=?, stock=?, image=? WHERE id=?').run(p.name || existing.name, p.category || existing.category, p.description !== undefined ? p.description : existing.description, p.price || existing.price, p.stock !== undefined ? p.stock : existing.stock, p.image || existing.image, id);
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  },
  async deleteProduct(id) {
    if (isSupabase) return await db.from('products').delete().eq('id', id);
    return db.prepare('DELETE FROM products WHERE id = ?').run(id);
  },
  async orders() {
    if (isSupabase) {
      const { data } = await db.from('orders').select('*').order('id', { ascending: false });
      return data || [];
    }
    return db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  },
  async createOrder(o) {
    if (isSupabase) {
      const { data, error } = await db.from('orders').insert([{ ...o, products: JSON.stringify(o.products) }]).select().single();
      if (error) throw error;
      return data;
    }
    const res = db.prepare('INSERT INTO orders (customerName, phone, address, pincode, products, totalAmount, paymentMethod) VALUES (?, ?, ?, ?, ?, ?, ?)').run(o.customerName, o.phone, o.address, o.pincode, JSON.stringify(o.products), o.totalAmount, o.paymentMethod || 'COD');
    return db.prepare('SELECT * FROM orders WHERE id = ?').get(res.lastInsertRowid);
  },
  async getOrderById(id) {
    if (isSupabase) {
      const { data } = await db.from('orders').select('*').eq('id', id).single();
      if (data && typeof data.products === 'string') data.products = JSON.parse(data.products);
      return data;
    }
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (order) order.products = JSON.parse(order.products);
    return order;
  },
  async adminByEmail(email) {
    if (isSupabase) {
      const { data } = await db.from('admins').select('*').eq('email', email).single();
      return data;
    }
    return db.prepare('SELECT * FROM admins WHERE email = ?').get(email);
  },
  async createAdmin(a) {
    if (isSupabase) return await db.from('admins').insert([a]);
    return db.prepare('INSERT INTO admins (email, password) VALUES (?, ?)').run(a.email, a.password);
  }
};

module.exports = DB;
