import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'dairy_erp.db');
export const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      pin_hash TEXT,
      full_name TEXT NOT NULL,
      role TEXT CHECK(role IN ('ADMIN', 'MANAGER', 'SALES_CASHIER', 'INVENTORY_CLERK')) NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Products table
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT CHECK(category IN ('Milk', 'Cheese', 'Butter', 'Yogurt', 'Cream', 'Other')) NOT NULL,
      unit TEXT CHECK(unit IN ('Liter', 'Kg', 'Pack', 'Bottle', 'Pcs')) NOT NULL,
      min_stock_level REAL DEFAULT 10,
      unit_cost REAL NOT NULL,
      unit_price REAL NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Product Batches (Perishable Dairy items)
    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      batch_number TEXT NOT NULL,
      initial_quantity REAL NOT NULL,
      current_quantity REAL NOT NULL,
      production_date DATE NOT NULL,
      expiry_date DATE NOT NULL,
      cost_per_unit REAL NOT NULL,
      status TEXT CHECK(status IN ('ACTIVE', 'EXPIRED', 'DEPLETED')) DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Inventory Adjustments / Spoilage / Stock Movement Logs
    CREATE TABLE IF NOT EXISTS inventory_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      batch_id INTEGER REFERENCES batches(id),
      type TEXT CHECK(type IN ('STOCK_IN', 'SALE', 'SPOILAGE_WASTE', 'ADJUSTMENT')) NOT NULL,
      quantity REAL NOT NULL,
      reason TEXT,
      user_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Sales Orders
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_code TEXT UNIQUE NOT NULL,
      customer_name TEXT DEFAULT 'Walk-in Customer',
      customer_phone TEXT,
      payment_method TEXT CHECK(payment_method IN ('CASH', 'TELEBIRR', 'BANK_TRANSFER', 'CREDIT')) NOT NULL,
      payment_status TEXT CHECK(payment_status IN ('PAID', 'PENDING')) DEFAULT 'PAID',
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      recorded_by_user_id INTEGER REFERENCES users(id),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Sale Line Items
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      batch_id INTEGER REFERENCES batches(id),
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL
    );

    -- Operating Expenses
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT CHECK(category IN (
        'RAW_MILK_PROCUREMENT',
        'FEED_FODDER',
        'PACKAGING_MATERIALS',
        'COLD_CHAIN_ELECTRICITY',
        'TRANSPORT_LOGISTICS',
        'STAFF_WAGES',
        'EQUIPMENT_MAINTENANCE',
        'SUPPLIES_OTHER'
      )) NOT NULL,
      amount REAL NOT NULL,
      expense_date DATE NOT NULL,
      payment_method TEXT CHECK(payment_method IN ('CASH', 'TELEBIRR', 'BANK_TRANSFER')) NOT NULL,
      vendor_name TEXT,
      recorded_by_user_id INTEGER REFERENCES users(id),
      receipt_ref TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Cash Transactions (The Cash Flow Ledger)
    CREATE TABLE IF NOT EXISTS cash_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT CHECK(type IN ('IN', 'OUT')) NOT NULL,
      source TEXT CHECK(source IN ('SALE', 'EXPENSE', 'MANUAL_DEPOSIT', 'MANUAL_WITHDRAWAL', 'CAPITAL')) NOT NULL,
      reference_id INTEGER,
      amount REAL NOT NULL,
      payment_method TEXT CHECK(payment_method IN ('CASH', 'TELEBIRR', 'BANK_TRANSFER')) NOT NULL,
      description TEXT NOT NULL,
      recorded_by_user_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration check: Ensure pin_hash column exists
  try {
    db.exec(`ALTER TABLE users ADD COLUMN pin_hash TEXT;`);
  } catch (e) {
    // Column already exists
  }

  // Update existing users with default PINs if empty
  const salt = bcrypt.genSaltSync(10);
  db.prepare("UPDATE users SET pin_hash = ? WHERE username = 'admin' AND (pin_hash IS NULL OR pin_hash = '')").run(bcrypt.hashSync('1111', salt));
  db.prepare("UPDATE users SET pin_hash = ? WHERE username = 'manager' AND (pin_hash IS NULL OR pin_hash = '')").run(bcrypt.hashSync('2222', salt));
  db.prepare("UPDATE users SET pin_hash = ? WHERE username = 'cashier' AND (pin_hash IS NULL OR pin_hash = '')").run(bcrypt.hashSync('3333', salt));
  db.prepare("UPDATE users SET pin_hash = ? WHERE username = 'inventory' AND (pin_hash IS NULL OR pin_hash = '')").run(bcrypt.hashSync('4444', salt));

  // Seed default demo data if users are empty
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (userCount === 0) {
    seedDemoData();
  }
}

function seedDemoData() {
  console.log('🌱 Seeding initial WY Argo Dairy ERP demo data...');

  const salt = bcrypt.genSaltSync(10);
  const adminPass = bcrypt.hashSync('admin123', salt);
  const managerPass = bcrypt.hashSync('manager123', salt);
  const cashierPass = bcrypt.hashSync('cashier123', salt);
  const inventoryPass = bcrypt.hashSync('inventory123', salt);

  const adminPin = bcrypt.hashSync('1111', salt);
  const managerPin = bcrypt.hashSync('2222', salt);
  const cashierPin = bcrypt.hashSync('3333', salt);
  const inventoryPin = bcrypt.hashSync('4444', salt);

  // 1. Insert Users
  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash, pin_hash, full_name, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const adminId = insertUser.run('admin', 'admin@wyargo.com', adminPass, adminPin, 'Abebe Bikila (Admin)', 'ADMIN').lastInsertRowid;
  const managerId = insertUser.run('manager', 'manager@wyargo.com', managerPass, managerPin, 'Sara Tadesse (Manager)', 'MANAGER').lastInsertRowid;
  const cashierId = insertUser.run('cashier', 'cashier@wyargo.com', cashierPass, cashierPin, 'Dawit Haile (Cashier)', 'SALES_CASHIER').lastInsertRowid;
  const inventoryId = insertUser.run('inventory', 'inventory@wyargo.com', inventoryPass, inventoryPin, 'Marta Girma (Inventory Clerk)', 'INVENTORY_CLERK').lastInsertRowid;

  // 2. Insert Dairy Products
  const insertProduct = db.prepare(`
    INSERT INTO products (sku, name, category, unit, min_stock_level, unit_cost, unit_price, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const products = [
    { sku: 'MK-PST-1L', name: 'Pasteurized Whole Milk (1L)', category: 'Milk', unit: 'Liter', min: 40, cost: 70, price: 95, desc: 'Fresh farm pasteurized milk 3.5% fat' },
    { sku: 'MK-RAW-1L', name: 'Raw Fresh Farm Milk (1L)', category: 'Milk', unit: 'Liter', min: 50, cost: 55, price: 80, desc: 'Fresh morning unpasteurized milk' },
    { sku: 'CH-MOZ-500', name: 'Mozzarella Cheese Block (500g)', category: 'Cheese', unit: 'Pack', min: 15, cost: 220, price: 320, desc: 'Fresh stretched curd pizza cheese' },
    { sku: 'CH-GOU-1KG', name: 'Gouda Aged Cheese (1kg)', category: 'Cheese', unit: 'Kg', min: 10, cost: 480, price: 650, desc: 'Natural rind aged Dutch gouda cheese' },
    { sku: 'BT-SLT-250', name: 'Pure Table Butter Salted (250g)', category: 'Butter', unit: 'Pack', min: 20, cost: 110, price: 160, desc: 'Traditional churned fresh butter' },
    { sku: 'YG-PLN-500', name: 'Natural Plain Yogurt (500ml)', category: 'Yogurt', unit: 'Bottle', min: 25, cost: 45, price: 70, desc: 'Probiotic unsweetened healthy yogurt' },
    { sku: 'YG-STR-300', name: 'Strawberry Drinking Yogurt (300ml)', category: 'Yogurt', unit: 'Bottle', min: 30, cost: 35, price: 55, desc: 'Sweetened strawberry flavored drink' },
    { sku: 'CR-HVY-500', name: 'Heavy Whipping Cream (500ml)', category: 'Cream', unit: 'Bottle', min: 12, cost: 130, price: 190, desc: '38% fat richness fresh dairy cream' },
  ];

  const productIds: Record<string, number | bigint> = {};
  for (const p of products) {
    const res = insertProduct.run(p.sku, p.name, p.category, p.unit, p.min, p.cost, p.price, p.desc);
    productIds[p.sku] = res.lastInsertRowid;
  }

  // 3. Insert Product Batches
  const insertBatch = db.prepare(`
    INSERT INTO batches (product_id, batch_number, initial_quantity, current_quantity, production_date, expiry_date, cost_per_unit, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const today = new Date();
  const dateStr = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  // Batches
  // Milk - 3 days left & 7 days left
  const b1 = insertBatch.run(productIds['MK-PST-1L'], 'BATCH-MK-2026-01', 100, 68, dateStr(-2), dateStr(4), 70, 'ACTIVE').lastInsertRowid;
  const b2 = insertBatch.run(productIds['MK-RAW-1L'], 'BATCH-RAW-2026-01', 120, 85, dateStr(-1), dateStr(2), 55, 'ACTIVE').lastInsertRowid; // Expiring soon!
  const b3 = insertBatch.run(productIds['CH-MOZ-500'], 'BATCH-CH-2026-01', 40, 28, dateStr(-10), dateStr(25), 220, 'ACTIVE').lastInsertRowid;
  const b4 = insertBatch.run(productIds['CH-GOU-1KG'], 'BATCH-GOU-2026-01', 20, 14, dateStr(-30), dateStr(90), 480, 'ACTIVE').lastInsertRowid;
  const b5 = insertBatch.run(productIds['BT-SLT-250'], 'BATCH-BT-2026-01', 50, 32, dateStr(-5), dateStr(35), 110, 'ACTIVE').lastInsertRowid;
  const b6 = insertBatch.run(productIds['YG-PLN-500'], 'BATCH-YG-2026-01', 60, 42, dateStr(-3), dateStr(12), 45, 'ACTIVE').lastInsertRowid;
  const b7 = insertBatch.run(productIds['YG-STR-300'], 'BATCH-STR-2026-01', 80, 55, dateStr(-2), dateStr(14), 35, 'ACTIVE').lastInsertRowid;
  const b8 = insertBatch.run(productIds['CR-HVY-500'], 'BATCH-CR-2026-01', 25, 16, dateStr(-4), dateStr(8), 130, 'ACTIVE').lastInsertRowid;

  // 4. Initial Capital Deposit in Cash Flow
  const insertCash = db.prepare(`
    INSERT INTO cash_transactions (type, source, reference_id, amount, payment_method, description, recorded_by_user_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCash.run('IN', 'CAPITAL', null, 50000, 'BANK_TRANSFER', 'Initial WY Argo Operating Float', adminId, dateStr(-10) + ' 09:00:00');

  // 5. Seed some realistic Expenses
  const insertExpense = db.prepare(`
    INSERT INTO expenses (expense_code, title, category, amount, expense_date, payment_method, vendor_name, recorded_by_user_id, receipt_ref, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const exp1 = insertExpense.run('EXP-2026-001', 'Morning Raw Milk Sourcing (300L)', 'RAW_MILK_PROCUREMENT', 15000, dateStr(-5), 'BANK_TRANSFER', 'Oromia Smallholder Cooperative', managerId, 'RCP-4991', 'Direct farm collection at 50 ETB/L').lastInsertRowid;
  insertCash.run('OUT', 'EXPENSE', Number(exp1), 15000, 'BANK_TRANSFER', 'Raw milk sourcing from cooperative', managerId, dateStr(-5) + ' 11:00:00');

  const exp2 = insertExpense.run('EXP-2026-002', 'Refrigeration Chiller Electricity Token', 'COLD_CHAIN_ELECTRICITY', 3200, dateStr(-3), 'TELEBIRR', 'Ethiopian Electric Utility', managerId, 'EEU-98213', 'Main cold room cooling unit').lastInsertRowid;
  insertCash.run('OUT', 'EXPENSE', Number(exp2), 3200, 'TELEBIRR', 'Cold room power token', managerId, dateStr(-3) + ' 14:30:00');

  const exp3 = insertExpense.run('EXP-2026-003', 'Food-grade Milk Bottles & Seal Caps', 'PACKAGING_MATERIALS', 4500, dateStr(-2), 'CASH', 'Afro Plastic Packaging Ltd', inventoryId, 'INV-8820', '500x 1L food grade HDPE bottles').lastInsertRowid;
  insertCash.run('OUT', 'EXPENSE', Number(exp3), 4500, 'CASH', 'Packaging bottles purchase', inventoryId, dateStr(-2) + ' 16:00:00');

  // 6. Seed Sample Sales Orders
  const insertSale = db.prepare(`
    INSERT INTO sales (sale_code, customer_name, customer_phone, payment_method, payment_status, subtotal, discount, total_amount, recorded_by_user_id, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSaleItem = db.prepare(`
    INSERT INTO sale_items (sale_id, product_id, batch_id, quantity, unit_price, subtotal)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Sale 1 - Cafe order
  const s1 = insertSale.run('SL-2026-001', 'Bole Garden Cafe', '+251911223344', 'TELEBIRR', 'PAID', 3200, 100, 3100, cashierId, 'Daily breakfast delivery', dateStr(-2) + ' 08:30:00').lastInsertRowid;
  insertSaleItem.run(s1, productIds['MK-PST-1L'], Number(b1), 20, 95, 1900);
  insertSaleItem.run(s1, productIds['CH-MOZ-500'], Number(b3), 4, 320, 1280);
  insertSaleItem.run(s1, productIds['BT-SLT-250'], Number(b5), 2, 160, 320); // subtotal adjusted
  insertCash.run('IN', 'SALE', Number(s1), 3100, 'TELEBIRR', 'Sale to Bole Garden Cafe (SL-2026-001)', cashierId, dateStr(-2) + ' 08:35:00');

  // Sale 2 - Walk-in retail customer
  const s2 = insertSale.run('SL-2026-002', 'Walk-in Retail', '+251922334455', 'CASH', 'PAID', 440, 0, 440, cashierId, 'Cash counter sale', dateStr(-1) + ' 11:15:00').lastInsertRowid;
  insertSaleItem.run(s2, productIds['MK-PST-1L'], Number(b1), 2, 95, 190);
  insertSaleItem.run(s2, productIds['YG-PLN-500'], Number(b6), 2, 70, 140);
  insertSaleItem.run(s2, productIds['YG-STR-300'], Number(b7), 2, 55, 110);
  insertCash.run('IN', 'SALE', Number(s2), 440, 'CASH', 'Retail sale SL-2026-002', cashierId, dateStr(-1) + ' 11:15:00');

  // Sale 3 - Supermarket delivery
  const s3 = insertSale.run('SL-2026-003', 'Fresh Corner Supermarket', '+251933445566', 'BANK_TRANSFER', 'PAID', 8450, 0, 8450, cashierId, 'Bulk grocery supply', dateStr(0) + ' 10:00:00').lastInsertRowid;
  insertSaleItem.run(s3, productIds['MK-PST-1L'], Number(b1), 30, 95, 2850);
  insertSaleItem.run(s3, productIds['CH-GOU-1KG'], Number(b4), 5, 650, 3250);
  insertSaleItem.run(s3, productIds['BT-SLT-250'], Number(b5), 10, 160, 1600);
  insertSaleItem.run(s3, productIds['CR-HVY-500'], Number(b8), 4, 190, 760);
  insertCash.run('IN', 'SALE', Number(s3), 8450, 'BANK_TRANSFER', 'Sale to Fresh Corner (SL-2026-003)', cashierId, dateStr(0) + ' 10:05:00');

  console.log('✅ WY Argo Dairy ERP demo data successfully seeded!');
}

