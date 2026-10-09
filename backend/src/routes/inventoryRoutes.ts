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
        COALESCE(SUM(CASE WHEN b.status = 'ACTIVE' THEN b.current_quantity ELSE 0 END), 0) as current_stock
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
    const { sku, name, category, unit, min_stock_level, unit_cost, unit_price, description, initial_stock = 0 } = req.body;

    if (!sku || !name || !category || !unit || unit_cost === undefined || unit_price === undefined) {
      res.status(400).json({ error: 'SKU, name, category, unit, unit_cost, and unit_price are required' });
      return;
    }

    const existing = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku);
    if (existing) {
      res.status(400).json({ error: `Product with SKU "${sku}" already exists` });
      return;
    }

    const tx = db.transaction(() => {
      const insert = db.prepare(`
        INSERT INTO products (sku, name, category, unit, min_stock_level, unit_cost, unit_price, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(sku, name, category, unit, min_stock_level || 10, unit_cost, unit_price, description || '');

      const newId = insert.lastInsertRowid;

      if (Number(initial_stock) > 0) {
        const batchCode = `STK-${Date.now().toString().slice(-6)}`;
        const today = new Date().toISOString().split('T')[0];

        db.prepare(`
          INSERT INTO batches (product_id, batch_number, initial_quantity, current_quantity, production_date, expiry_date, cost_per_unit, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
        `).run(newId, batchCode, initial_stock, initial_stock, today, '2099-12-31', unit_cost);

        db.prepare(`
          INSERT INTO inventory_logs (product_id, batch_id, type, quantity, reason, user_id)
          VALUES (?, null, 'STOCK_IN', ?, 'Initial inventory balance', ?)
        `).run(newId, initial_stock, req.user?.id);
      }

      return newId;
    });

    const newProductId = tx();
    const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(newProductId);
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

// POST /api/inventory/stock-in - Quick Stock In
router.post('/stock-in', authorizeRoles('ADMIN', 'MANAGER', 'INVENTORY_CLERK'), (req: AuthRequest, res: Response): void => {
  try {
    const { product_id, quantity, cost_per_unit, reference_note } = req.body;

    if (!product_id || !quantity || Number(quantity) <= 0) {
      res.status(400).json({ error: 'Product and positive quantity are required' });
      return;
    }

    const product = db.prepare('SELECT id, name, unit_cost FROM products WHERE id = ?').get(product_id) as any;
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const numQty = Number(quantity);
    const unitCost = cost_per_unit !== undefined ? Number(cost_per_unit) : product.unit_cost;
    const batchCode = `STK-${Date.now().toString().slice(-6)}`;
    const today = new Date().toISOString().split('T')[0];

    const tx = db.transaction(() => {
      const insert = db.prepare(`
        INSERT INTO batches (product_id, batch_number, initial_quantity, current_quantity, production_date, expiry_date, cost_per_unit, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
      `).run(product_id, batchCode, numQty, numQty, today, '2099-12-31', unitCost);

      const batchId = insert.lastInsertRowid;

      db.prepare(`
        INSERT INTO inventory_logs (product_id, batch_id, type, quantity, reason, user_id)
        VALUES (?, ?, 'STOCK_IN', ?, ?, ?)
      `).run(product_id, batchId, numQty, reference_note || 'Stock intake', req.user?.id);

      return batchId;
    });

    tx();
    res.status(201).json({ message: `Successfully added ${numQty} units to stock` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/adjust - Record Stock Adjustment / Loss / Spoilage
router.post('/adjust', authorizeRoles('ADMIN', 'MANAGER', 'INVENTORY_CLERK'), (req: AuthRequest, res: Response): void => {
  try {
    const { product_id, quantity, reason } = req.body;

    if (!product_id || !quantity || Number(quantity) <= 0 || !reason) {
      res.status(400).json({ error: 'Product, valid quantity, and reason are required' });
      return;
    }

    const numQty = Number(quantity);

    // Find available stock
    const availableBatches = db.prepare(`
      SELECT id, current_quantity
      FROM batches
      WHERE product_id = ? AND status = 'ACTIVE' AND current_quantity > 0
      ORDER BY id ASC
    `).all(product_id) as any[];

    const totalStock = availableBatches.reduce((sum, b) => sum + b.current_quantity, 0);
    if (totalStock < numQty) {
      res.status(400).json({ error: `Cannot deduct ${numQty}. Current stock available is only ${totalStock}` });
      return;
    }

    const tx = db.transaction(() => {
      let needed = numQty;
      for (const batch of availableBatches) {
        if (needed <= 0) break;
        const take = Math.min(batch.current_quantity, needed);
        const newQty = batch.current_quantity - take;
        const newStatus = newQty === 0 ? 'DEPLETED' : 'ACTIVE';

        db.prepare('UPDATE batches SET current_quantity = ?, status = ? WHERE id = ?').run(newQty, newStatus, batch.id);
        needed -= take;
      }

      db.prepare(`
        INSERT INTO inventory_logs (product_id, batch_id, type, quantity, reason, user_id)
        VALUES (?, null, 'ADJUSTMENT', ?, ?, ?)
      `).run(product_id, numQty, reason, req.user?.id);
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
        u.full_name as user_name
      FROM inventory_logs l
      JOIN products p ON l.product_id = p.id
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
