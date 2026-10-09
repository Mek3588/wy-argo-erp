import { Router, Response } from 'express';
import { db } from '../db/database';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// GET /api/sales - List sales orders
router.get('/', (_req: AuthRequest, res: Response): void => {
  try {
    const sales = db.prepare(`
      SELECT 
        s.*,
        u.full_name as cashier_name,
        (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) as item_count
      FROM sales s
      LEFT JOIN users u ON s.recorded_by_user_id = u.id
      ORDER BY s.created_at DESC
      LIMIT 100
    `).all();

    res.json({ sales });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sales/:id - Get sale details with line items
router.get('/:id', (req: AuthRequest, res: Response): void => {
  try {
    const saleId = Number(req.params.id);
    const sale = db.prepare(`
      SELECT s.*, u.full_name as cashier_name
      FROM sales s
      LEFT JOIN users u ON s.recorded_by_user_id = u.id
      WHERE s.id = ?
    `).get(saleId);

    if (!sale) {
      res.status(404).json({ error: 'Sale record not found' });
      return;
    }

    const items = db.prepare(`
      SELECT 
        si.*,
        p.name as product_name,
        p.unit as product_unit,
        b.batch_number
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      LEFT JOIN batches b ON si.batch_id = b.id
      WHERE si.sale_id = ?
    `).all(saleId);

    res.json({ sale, items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

interface CreateSaleItem {
  product_id: number;
  quantity: number;
  unit_price?: number; // optional, defaults to product unit_price
}

// POST /api/sales - Create sale (Any role with sales permission)
router.post('/', authorizeRoles('ADMIN', 'MANAGER', 'SALES_CASHIER'), (req: AuthRequest, res: Response): void => {
  try {
    const {
      customer_name,
      customer_phone,
      payment_method,
      discount = 0,
      notes,
      items
    }: {
      customer_name?: string;
      customer_phone?: string;
      payment_method: 'CASH' | 'TELEBIRR' | 'BANK_TRANSFER' | 'CREDIT';
      discount?: number;
      notes?: string;
      items: CreateSaleItem[];
    } = req.body;

    if (!payment_method || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Payment method and at least one item are required' });
      return;
    }

    const validMethods = ['CASH', 'TELEBIRR', 'BANK_TRANSFER', 'CREDIT'];
    if (!validMethods.includes(payment_method)) {
      res.status(400).json({ error: 'Invalid payment method' });
      return;
    }

    // Execute transaction: verify stock, pick earliest expiring batch (FEFO), deduct stock, create sale, create cash flow entry
    const executeSale = db.transaction(() => {
      let subtotal = 0;
      const verifiedItems: Array<{
        product_id: number;
        batch_id: number | null;
        quantity: number;
        unit_price: number;
        subtotal: number;
      }> = [];

      for (const item of items) {
        const prod = db.prepare('SELECT id, name, unit_price FROM products WHERE id = ? AND is_active = 1').get(item.product_id) as any;
        if (!prod) {
          throw new Error(`Product ID ${item.product_id} not found or inactive`);
        }

        const price = item.unit_price ?? prod.unit_price;
        let qtyNeeded = Number(item.quantity);
        if (qtyNeeded <= 0) {
          throw new Error(`Quantity for ${prod.name} must be greater than 0`);
        }

        // Find available batches sorted by earliest expiry date (FEFO - First Expired First Out)
        const availableBatches = db.prepare(`
          SELECT id, batch_number, current_quantity, expiry_date
          FROM batches
          WHERE product_id = ? AND status = 'ACTIVE' AND current_quantity > 0 AND date(expiry_date) >= date('now')
          ORDER BY expiry_date ASC
        `).all(item.product_id) as any[];

        const totalAvail = availableBatches.reduce((acc, b) => acc + b.current_quantity, 0);
        if (totalAvail < qtyNeeded) {
          throw new Error(`Insufficient stock for "${prod.name}". Requested: ${qtyNeeded}, Available: ${totalAvail}`);
        }

        // Deduct from batches
        for (const batch of availableBatches) {
          if (qtyNeeded <= 0) break;
          const take = Math.min(batch.current_quantity, qtyNeeded);
          const newQty = batch.current_quantity - take;
          const newStatus = newQty === 0 ? 'DEPLETED' : 'ACTIVE';

          db.prepare('UPDATE batches SET current_quantity = ?, status = ? WHERE id = ?').run(newQty, newStatus, batch.id);

          // Log movement
          db.prepare(`
            INSERT INTO inventory_logs (product_id, batch_id, type, quantity, reason, user_id)
            VALUES (?, ?, 'SALE', ?, 'Customer purchase', ?)
          `).run(prod.id, batch.id, take, req.user?.id);

          const lineSubtotal = take * price;
          subtotal += lineSubtotal;

          verifiedItems.push({
            product_id: prod.id,
            batch_id: batch.id,
            quantity: take,
            unit_price: price,
            subtotal: lineSubtotal,
          });

          qtyNeeded -= take;
        }
      }

      const totalAmount = Math.max(0, subtotal - (Number(discount) || 0));
      const saleCode = `SL-${Date.now().toString().slice(-6)}`;

      // Insert sale
      const saleResult = db.prepare(`
        INSERT INTO sales (
          sale_code, customer_name, customer_phone, payment_method, payment_status,
          subtotal, discount, total_amount, recorded_by_user_id, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        saleCode,
        customer_name || 'Walk-in Customer',
        customer_phone || '',
        payment_method,
        payment_method === 'CREDIT' ? 'PENDING' : 'PAID',
        subtotal,
        discount || 0,
        totalAmount,
        req.user?.id,
        notes || ''
      );

      const saleId = saleResult.lastInsertRowid;

      // Insert sale line items
      const insertLine = db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, batch_id, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const vi of verifiedItems) {
        insertLine.run(saleId, vi.product_id, vi.batch_id, vi.quantity, vi.unit_price, vi.subtotal);
      }

      // If paid, record in Cash Flow ledger
      if (payment_method !== 'CREDIT') {
        db.prepare(`
          INSERT INTO cash_transactions (type, source, reference_id, amount, payment_method, description, recorded_by_user_id)
          VALUES ('IN', 'SALE', ?, ?, ?, ?, ?)
        `).run(
          saleId,
          totalAmount,
          payment_method,
          `Sale ${saleCode} - ${customer_name || 'Walk-in'}`,
          req.user?.id
        );
      }

      return saleId;
    });

    const newSaleId = executeSale();
    const createdSale = db.prepare('SELECT * FROM sales WHERE id = ?').get(newSaleId);

    res.status(201).json({
      message: 'Sale processed successfully',
      sale: createdSale,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

