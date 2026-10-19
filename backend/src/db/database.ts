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
      sale_category TEXT DEFAULT 'Retail / Walk-in',
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

    -- Suppliers / Providers (Raw milk outgrowers, packaging, feed, etc.)
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      contact_person TEXT,
      category TEXT CHECK(category IN ('RAW_MILK', 'PACKAGING', 'FEED_FODDER', 'EQUIPMENT_INGREDIENTS', 'OTHER')) DEFAULT 'RAW_MILK',
      address TEXT,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Registered Customers (Hotels, cafes, supermarkets, regular buyers)
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      customer_type TEXT CHECK(customer_type IN ('RETAIL', 'WHOLESALE', 'HOTEL_CAFE', 'DISTRIBUTOR', 'STAFF')) DEFAULT 'RETAIL',
      credit_limit REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Customer Repayments (Accounts Receivable / Debt Collection Ledger)
    CREATE TABLE IF NOT EXISTS customer_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      sale_id INTEGER REFERENCES sales(id) ON DELETE SET NULL,
      amount REAL NOT NULL,
      payment_method TEXT CHECK(payment_method IN ('CASH', 'TELEBIRR', 'BANK_TRANSFER')) NOT NULL,
      receipt_ref TEXT,
      notes TEXT,
      recorded_by_user_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration checks
  try { db.exec(`ALTER TABLE users ADD COLUMN pin_hash TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE sales ADD COLUMN sale_category TEXT DEFAULT 'Retail / Walk-in';`); } catch (e) {}
  try { db.exec(`ALTER TABLE sales ADD COLUMN customer_id INTEGER REFERENCES customers(id);`); } catch (e) {}
  try { db.exec(`ALTER TABLE sales ADD COLUMN paid_amount REAL DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE sales ADD COLUMN due_amount REAL DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE sales ADD COLUMN due_date DATE;`); } catch (e) {}
  try { db.exec(`ALTER TABLE batches ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id);`); } catch (e) {}
  try { db.exec(`ALTER TABLE batches ADD COLUMN supplier_name TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE inventory_logs ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id);`); } catch (e) {}
  try { db.exec(`ALTER TABLE inventory_logs ADD COLUMN supplier_name TEXT;`); } catch (e) {}

  // Backfill existing sales paid_amount and due_amount if not populated
  try {
    db.exec(`UPDATE sales SET paid_amount = total_amount, due_amount = 0 WHERE (paid_amount IS NULL OR paid_amount = 0) AND payment_status = 'PAID';`);
    db.exec(`UPDATE sales SET paid_amount = 0, due_amount = total_amount WHERE (due_amount IS NULL OR due_amount = 0) AND payment_status = 'PENDING';`);
  } catch (e) {}

  // Seed default admin if users are empty
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (userCount === 0) {
    seedAdminOnly();
  }

  // Seed initial sample suppliers if empty
  const supplierCount = (db.prepare('SELECT COUNT(*) as count FROM suppliers').get() as { count: number }).count;
  if (supplierCount === 0) {
    seedInitialSuppliers();
  }

  // Seed initial sample customers if empty
  const customerCount = (db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number }).count;
  if (customerCount === 0) {
    seedInitialCustomers();
  }
}

function seedInitialSuppliers() {
  const insert = db.prepare(`
    INSERT INTO suppliers (name, phone, contact_person, category, address, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insert.run('Sululta Dairy Farmers Co-op', '+251 911 234567', 'Ato Tadesse', 'RAW_MILK', 'Sululta Outskirts, Oromia', 'Primary morning raw whole milk collection center');
  insert.run('Bishoftu Valley Dairy Farm', '+251 922 345678', 'W/ro Selamawit', 'RAW_MILK', 'Bishoftu Road', 'Grade-A chilled cow milk provider');
  insert.run('Ethio Pack & Print Ltd', '+251 933 456789', 'Dawit Mekonnen', 'PACKAGING', 'Kality Industrial Zone, Addis Ababa', 'Supplies milk pouches, yogurt cups, and tamper seals');
}

function seedInitialCustomers() {
  const insert = db.prepare(`
    INSERT INTO customers (name, phone, email, address, customer_type, credit_limit, current_balance, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insert.run('Bole Sky Hotel & Restaurant', '+251 911 887766', 'procurement@bolesky.com', 'Bole Medhanialem, Addis Ababa', 'HOTEL_CAFE', 50000, 0, 'Takes daily 40L milk and butter; settles on weekly credit');
  insert.run('Fresh Corner Supermarket', '+251 922 998877', 'orders@freshcorner.et', 'Kazanchis, Addis Ababa', 'DISTRIBUTOR', 30000, 0, 'Retail distribution partner for bottled milk & yogurt');
  insert.run('Abebe Kebede (Family)', '+251 933 112233', '', 'Sarbet, Near Canadian Embassy', 'RETAIL', 5000, 0, 'Regular neighborhood subscriber for pasteurized milk');
}

export function seedAdminOnly() {
  console.log('👤 Creating initial Administrator account...');
  const salt = bcrypt.genSaltSync(10);
  const adminPass = bcrypt.hashSync('Admin@WYArgo2026!', salt);
  const adminPin = bcrypt.hashSync('123456', salt);

  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash, pin_hash, full_name, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertUser.run('admin', 'admin@wyargo.com', adminPass, adminPin, 'Administrator', 'ADMIN');
  console.log('✅ Administrator account ready!');
}

export function resetToCleanAdminState() {
  console.log('🧹 Clearing all data and initializing clean production state...');
  const resetTx = db.transaction(() => {
    db.exec(`
      DELETE FROM sale_items;
      DELETE FROM sales;
      DELETE FROM expenses;
      DELETE FROM cash_transactions;
      DELETE FROM inventory_logs;
      DELETE FROM batches;
      DELETE FROM products;
      DELETE FROM users;
      DELETE FROM sqlite_sequence;
    `);

    const salt = bcrypt.genSaltSync(10);
    const adminPass = bcrypt.hashSync('Admin@WYArgo2026!', salt);
    const adminPin = bcrypt.hashSync('123456', salt);

    db.prepare(`
      INSERT INTO users (username, email, password_hash, pin_hash, full_name, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('admin', 'admin@wyargo.com', adminPass, adminPin, 'Administrator', 'ADMIN');
  });

  resetTx();
  console.log('✅ Database cleared! Single Administrator account created.');
}

