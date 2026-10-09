import { Router, Response } from 'express';
import { db } from '../db/database';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// GET /api/inventory/products - List products with current stock summary
router.get('/products', (_req: AuthRequest, res: Response): void => {
  try {
    const products = db.prepare(`
      SELECT 
        p.*,
        COALESCE(SUM(CASE WHEN b.status = 'ACTIVE' AND date(b.expiry_date) >= date('now') THEN b.current_quantity ELSE 0 END), 0) as current_stock,
        COUNT(CASE WHEN b.status = 'ACTIVE' AND date(b.expiry_date) >= date('now') THEN b.id END) as active_batches_count,
        COALESCE(SUM(CASE WHEN b.status = 'ACTIVE' AND date(b.expiry_date) < date('now') THEN b.current_quantity ELSE 0 END), 0) as expired_stock
      FROM products p
      LEFT JOIN batches b ON p.id = b.product_id
      WHERE p.is_active = 1
      GROUP BY p.id
      ORDER BY p.name ASC
    `).all();

    res.json({ products });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/products - Add product (Admin, Manager, Inventory Clerk)
router.post('/products', authorizeRoles('ADMIN', 'MANAGER', 'INVENTORY_CLERK'), (req: AuthRequest, res: Response): void => {
  try {
    const { sku, name, category, unit, min_stock_level, unit_cost, unit_price, description } = req.body;

    if (!sku || !name || !category || !unit || unit_cost === undefined || unit_price === undefined) {
      res.status(400).json({ error: 'SKU, name, category, unit, unit_cost, and unit_price are required' });
      return;
    }

    const existing = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku);
    if (existing) {
      res.status(400).json({ error: `Product with SKU "${sku}" already exists` });
      return;
    }

    const insert = db.prepare(`
      INSERT INTO products (sku, name, category, unit, min_stock_level, unit_cost, unit_price, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sku, name, category, unit, min_stock_level || 10, unit_cost, unit_price, description || '');

    const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(insert.lastInsertRowid);
    res.status(201).json({ message: 'Product created successfully', product: newProduct });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/inventory/products/:id - Edit product
router.put('/products/:id', authorizeRoles('ADMIN', 'MANAGER', 'INVENTORY_CLERK'), (req: AuthRequest, res: Response): void => {
  try {
    const productId = Number(req.params.id);
    const { name, category, unit, min_stock_level, unit_cost, unit_price, description, is_active } = req.body;

    db.prepare(`
      UPDATE products
      SET name = COALESCE(?, name),
          category = COALESCE(?, category),
          unit = COALESCE(?, unit),
          min_stock_level = COALESCE(?, min_stock_level),
          unit_cost = COALESCE(?, unit_cost),
          unit_price = COALESCE(?, unit_price),
          description = COALESCE(?, description),
          is_active = COALESCE(?, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, category, unit, min_stock_level, unit_cost, unit_price, description, is_active, productId);

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    res.json({ message: 'Product updated successfully', product: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/batches - List dairy batches with freshness status
router.get('/batches', (_req: AuthRequest, res: Response): void => {
  try {
    const batches = db.prepare(`
      SELECT 
        b.*,
        p.name as product_name,
        p.sku as product_sku,
        p.category as product_category,
        p.unit as product_unit,
        CAST(julianday(b.expiry_date) - julianday('now') AS INTEGER) as days_to_expiry
      FROM batches b
      JOIN products p ON b.product_id = p.id
      ORDER BY b.expiry_date ASC
    `).all();

    res.json({ batches });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/batches - Stock In / New dairy batch
router.post('/batches', authorizeRoles('ADMIN', 'MANAGER', 'INVENTORY_CLERK'), (req: AuthRequest, res: Response): void => {
  try {
    const { product_id, batch_number, quantity, production_date, expiry_date, cost_per_unit } = req.body;

    if (!product_id || !batch_number || !quantity || !production_date || !expiry_date || cost_per_unit === undefined) {
      res.status(400).json({ error: 'All batch fields are required (product, batch#, qty, prod date, exp date, cost)' });
      return;
    }

    const product = db.prepare('SELECT id, name FROM products WHERE id = ?').get(product_id) as any;
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const tx = db.transaction(() => {
      const insert = db.prepare(`
        INSERT INTO batches (product_id, batch_number, initial_quantity, current_quantity, production_date, expiry_date, cost_per_unit, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
      `).run(product_id, batch_number, quantity, quantity, production_date, expiry_date, cost_per_unit);

      const batchId = insert.lastInsertRowid;

      // Log movement
      db.prepare(`
        INSERT INTO inventory_logs (product_id, batch_id, type, quantity, reason, user_id)
        VALUES (?, ?, 'STOCK_IN', ?, ?, ?)
      `).run(product_id, batchId, quantity, `Initial stock intake for batch ${batch_number}`, req.user?.id);

      return batchId;
    });

    const newBatchId = tx();
    const newBatch = db.prepare(`
      SELECT b.*, p.name as product_name, p.unit as product_unit
      FROM batches b JOIN products p ON b.product_id = p.id
      WHERE b.id = ?
    `).get(newBatchId);

    res.status(201).json({ message: 'Stock-in recorded successfully', batch: newBatch });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/adjust - Record Spoilage/Wastage or Inventory Adjustment
router.post('/adjust', authorizeRoles('ADMIN', 'MANAGER', 'INVENTORY_CLERK'), (req: AuthRequest, res: Response): void => {
  try {
    const { batch_id, quantity, type, reason } = req.body;

    if (!batch_id || !quantity || !type || !reason) {
      res.status(400).json({ error: 'Batch, quantity, type (SPOILAGE_WASTE / ADJUSTMENT), and reason are required' });
      return;
    }

    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batch_id) as any;
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    if (quantity > batch.current_quantity) {
      res.status(400).json({ error: `Cannot adjust more than current stock in this batch (${batch.current_quantity})` });
      return;
    }

    const tx = db.transaction(() => {
      const remaining = batch.current_quantity - quantity;
      const status = remaining <= 0 ? 'DEPLETED' : batch.status;

      db.prepare(`
        UPDATE batches
        SET current_quantity = ?, status = ?
        WHERE id = ?
      `).run(remaining, status, batch_id);

      db.prepare(`
        INSERT INTO inventory_logs (product_id, batch_id, type, quantity, reason, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(batch.product_id, batch_id, type, quantity, reason, req.user?.id);
    });

    tx();
    res.json({ message: 'Stock adjustment saved successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/logs - Movement audit log
router.get('/logs', (_req: AuthRequest, res: Response): void => {
  try {
    const logs = db.prepare(`
      SELECT 
        l.*,
        p.name as product_name,
        p.unit as product_unit,
        b.batch_number,
        u.full_name as user_name
      FROM inventory_logs l
      JOIN products p ON l.product_id = p.id
      LEFT JOIN batches b ON l.batch_id = b.id
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 100
    `).all();

    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
