import { Router, Response } from 'express';
import { db } from '../db/database';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// GET /api/sales - List sales orders with search, date, status & category filter
router.get('/', (req: AuthRequest, res: Response): void => {
  try {
    const { search, date, category, status } = req.query;

    let query = `
      SELECT 
        s.*,
        u.full_name as cashier_name,
        c.name as registered_customer_name,
        c.customer_type,
        c.current_balance as customer_balance,
        (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) as item_count
      FROM sales s
      LEFT JOIN users u ON s.recorded_by_user_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (date) {
      query += ` AND date(s.created_at) = date(?)`;
      params.push(date);
    }

    if (category && category !== 'ALL') {
      query += ` AND s.sale_category = ?`;
      params.push(category);
    }

    if (status && status !== 'ALL') {
      if (status === 'CREDIT' || status === 'UNPAID') {
        query += ` AND (s.payment_status IN ('PENDING', 'PARTIALLY_PAID') OR s.due_amount > 0)`;
      } else {
        query += ` AND s.payment_status = ?`;
        params.push(status);
      }
    }

    if (search) {
      const term = `%${search}%`;
      query += ` AND (
        s.sale_code LIKE ? OR
        s.customer_name LIKE ? OR
        s.customer_phone LIKE ? OR
        c.name LIKE ? OR
        u.full_name LIKE ? OR
        EXISTS (
          SELECT 1 FROM sale_items si 
          JOIN products p ON si.product_id = p.id 
          WHERE si.sale_id = s.id AND p.name LIKE ?
        )
      )`;
      params.push(term, term, term, term, term, term);
    }

    query += ` ORDER BY s.created_at DESC LIMIT 200`;

    const sales = db.prepare(query).all(...params);

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
        p.unit as product_unit
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
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
  unit_price?: number;
}

// POST /api/sales - Create sale (Any role with sales permission)
router.post('/', authorizeRoles('ADMIN', 'MANAGER', 'SALES_CASHIER'), (req: AuthRequest, res: Response): void => {
  try {
    let {
      customer_id,
      customer_name,
      customer_phone,
      sale_category = 'Retail / Walk-in',
      payment_method,
      upfront_payment_method,
      paid_amount,
      due_amount,
      due_date,
      discount = 0,
      notes,
      items
    }: {
      customer_id?: number;
      customer_name?: string;
      customer_phone?: string;
      sale_category?: string;
      payment_method: string;
      upfront_payment_method?: string;
      paid_amount?: number;
      due_amount?: number;
      due_date?: string;
      discount?: number;
      notes?: string;
      items: CreateSaleItem[];
    } = req.body;

    if (!payment_method || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Payment method and at least one item are required' });
      return;
    }

    // Normalize payment method to uppercase and map common aliases
    let normalizedMethod = String(payment_method).toUpperCase();
    if (normalizedMethod === 'CBE' || normalizedMethod === 'BANK') {
      normalizedMethod = 'BANK_TRANSFER';
    } else if (normalizedMethod === 'OTHER') {
      normalizedMethod = 'CASH';
    }

    const validMethods = ['CASH', 'TELEBIRR', 'BANK_TRANSFER', 'CREDIT'];
    if (!validMethods.includes(normalizedMethod)) {
      normalizedMethod = 'CASH';
    }
    payment_method = normalizedMethod as any;

    let finalCustomerId: number | null = customer_id ? Number(customer_id) : null;
    let finalCustName = (customer_name && customer_name.trim()) || 'Walk-in Customer';
    let finalCustPhone = customer_phone || '';

    if (finalCustomerId) {
      const cust = db.prepare('SELECT id, name, phone, current_balance, credit_limit FROM customers WHERE id = ?').get(finalCustomerId) as any;
      if (cust) {
        if (!customer_name || customer_name === 'Walk-in Customer') finalCustName = cust.name;
        if (!customer_phone) finalCustPhone = cust.phone || '';
      } else {
        finalCustomerId = null;
      }
    }

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

        // Available batches (ignoring expiry)
        const availableBatches = db.prepare(`
          SELECT id, batch_number, current_quantity
          FROM batches
          WHERE product_id = ? AND status = 'ACTIVE' AND current_quantity > 0
          ORDER BY id ASC
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

          db.prepare(`
            INSERT INTO inventory_logs (product_id, batch_id, type, quantity, reason, user_id)
            VALUES (?, ?, 'SALE', ?, 'Customer sale', ?)
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

      let finalPaid = 0;
      let finalDue = 0;
      let finalStatus: 'PAID' | 'PARTIALLY_PAID' | 'PENDING' = 'PAID';

      if (payment_method === 'CREDIT') {
        finalPaid = Math.min(totalAmount, Math.max(0, Number(paid_amount) || 0));
        finalDue = Math.max(0, totalAmount - finalPaid);
        finalStatus = finalDue <= 0 ? 'PAID' : (finalPaid > 0 ? 'PARTIALLY_PAID' : 'PENDING');

        // Increase registered customer's outstanding balance
        if (finalCustomerId && finalDue > 0) {
          db.prepare('UPDATE customers SET current_balance = current_balance + ? WHERE id = ?').run(finalDue, finalCustomerId);
        }
      } else {
        finalPaid = totalAmount;
        finalDue = 0;
        finalStatus = 'PAID';
      }

      // Insert sale
      const saleResult = db.prepare(`
        INSERT INTO sales (
          sale_code, customer_id, customer_name, customer_phone, sale_category, payment_method, payment_status,
          subtotal, discount, total_amount, paid_amount, due_amount, due_date, recorded_by_user_id, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        saleCode,
        finalCustomerId,
        finalCustName,
        finalCustPhone,
        sale_category,
        payment_method,
        finalStatus,
        subtotal,
        discount || 0,
        totalAmount,
        finalPaid,
        finalDue,
        due_date || null,
        req.user?.id,
        notes || ''
      );

      const saleId = saleResult.lastInsertRowid;

      // Insert line items
      const insertLine = db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, batch_id, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const vi of verifiedItems) {
        insertLine.run(saleId, vi.product_id, vi.batch_id, vi.quantity, vi.unit_price, vi.subtotal);
      }

      // Record in Cash Flow if any upfront money was received
      if (finalPaid > 0) {
        let cashMethod = payment_method === 'CREDIT' ? (upfront_payment_method || 'CASH') : payment_method;
        let normCashMethod = String(cashMethod).toUpperCase();
        if (normCashMethod === 'CBE' || normCashMethod === 'BANK') normCashMethod = 'BANK_TRANSFER';
        if (!['CASH', 'TELEBIRR', 'BANK_TRANSFER'].includes(normCashMethod)) normCashMethod = 'CASH';

        db.prepare(`
          INSERT INTO cash_transactions (type, source, reference_id, amount, payment_method, description, recorded_by_user_id)
          VALUES ('IN', 'SALE', ?, ?, ?, ?, ?)
        `).run(
          saleId,
          finalPaid,
          normCashMethod,
          `Sale ${saleCode} [${sale_category}] - ${finalCustName}${payment_method === 'CREDIT' ? ' (Partial Upfront)' : ''}`,
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

// PUT /api/sales/:id - Edit already sold sale record (Manager & Admin only)
router.put('/:id', authorizeRoles('ADMIN', 'MANAGER'), (req: AuthRequest, res: Response): void => {
  try {
    const saleId = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId) as any;

    if (!existing) {
      res.status(404).json({ error: 'Sale record not found' });
      return;
    }

    const {
      customer_name,
      customer_phone,
      sale_category,
      payment_method,
      discount,
      notes,
      items,
    } = req.body;

    const executeEdit = db.transaction(() => {
      let newSubtotal = existing.subtotal;
      let newDiscount = discount !== undefined ? Number(discount) : existing.discount;
      let rawMethod = String(payment_method || existing.payment_method || 'CASH').toUpperCase();
      if (rawMethod === 'CBE' || rawMethod === 'BANK') {
        rawMethod = 'BANK_TRANSFER';
      } else if (rawMethod === 'OTHER') {
        rawMethod = 'CASH';
      }
      let newPaymentMethod = ['CASH', 'TELEBIRR', 'BANK_TRANSFER', 'CREDIT'].includes(rawMethod) ? rawMethod : 'CASH';
      let newCategory = sale_category || existing.sale_category;
      let newCustName = customer_name !== undefined ? customer_name : existing.customer_name;
      let newCustPhone = customer_phone !== undefined ? customer_phone : existing.customer_phone;
      let newNotes = notes !== undefined ? notes : existing.notes;

      // If items changed, restore old items and deduct new items
      if (items && Array.isArray(items) && items.length > 0) {
        // 1. Revert previous sale items stock
        const oldItems = db.prepare('SELECT product_id, batch_id, quantity FROM sale_items WHERE sale_id = ?').all(saleId) as any[];
        for (const oldItem of oldItems) {
          if (oldItem.batch_id) {
            db.prepare('UPDATE batches SET current_quantity = current_quantity + ?, status = "ACTIVE" WHERE id = ?')
              .run(oldItem.quantity, oldItem.batch_id);
          }
        }

        // Delete old sale items
        db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(saleId);

        // 2. Process and deduct new items
        newSubtotal = 0;
        const insertLine = db.prepare(`
          INSERT INTO sale_items (sale_id, product_id, batch_id, quantity, unit_price, subtotal)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

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

          const availableBatches = db.prepare(`
            SELECT id, current_quantity
            FROM batches
            WHERE product_id = ? AND status = 'ACTIVE' AND current_quantity > 0
            ORDER BY id ASC
          `).all(item.product_id) as any[];

          const totalAvail = availableBatches.reduce((acc, b) => acc + b.current_quantity, 0);
          if (totalAvail < qtyNeeded) {
            throw new Error(`Insufficient stock for "${prod.name}" when updating sale. Requested: ${qtyNeeded}, Available: ${totalAvail}`);
          }

          for (const batch of availableBatches) {
            if (qtyNeeded <= 0) break;
            const take = Math.min(batch.current_quantity, qtyNeeded);
            const newQty = batch.current_quantity - take;
            const newStatus = newQty === 0 ? 'DEPLETED' : 'ACTIVE';

            db.prepare('UPDATE batches SET current_quantity = ?, status = ? WHERE id = ?').run(newQty, newStatus, batch.id);

            const lineSubtotal = take * price;
            newSubtotal += lineSubtotal;

            insertLine.run(saleId, prod.id, batch.id, take, price, lineSubtotal);
            qtyNeeded -= take;
          }
        }
      }

      const newTotal = Math.max(0, newSubtotal - newDiscount);

      // Update sales table
      db.prepare(`
        UPDATE sales
        SET customer_name = ?,
            customer_phone = ?,
            sale_category = ?,
            payment_method = ?,
            subtotal = ?,
            discount = ?,
            total_amount = ?,
            notes = ?
        WHERE id = ?
      `).run(
        newCustName,
        newCustPhone,
        newCategory,
        newPaymentMethod,
        newSubtotal,
        newDiscount,
        newTotal,
        newNotes,
        saleId
      );

      // Update Cash Flow transaction to keep books clean
      db.prepare(`
        UPDATE cash_transactions
        SET amount = ?,
            payment_method = ?,
            description = ?
        WHERE source = 'SALE' AND reference_id = ?
      `).run(
        newTotal,
        newPaymentMethod,
        `Sale ${existing.sale_code} [${newCategory}] - ${newCustName} (Edited by Manager)`,
        saleId
      );

      return saleId;
    });

    executeEdit();
    const updated = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);

    res.json({
      message: 'Sale record corrected and updated successfully',
      sale: updated,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
