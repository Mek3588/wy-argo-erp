import { Router, Response } from 'express';
import { db } from '../db/database';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// GET /api/customers/receivables/summary - Overall accounts receivable overview
router.get('/receivables/summary', (_req: AuthRequest, res: Response): void => {
  try {
    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(current_balance), 0) as total_receivables,
        COUNT(CASE WHEN current_balance > 0 THEN 1 END) as debtor_count,
        COALESCE(SUM(CASE WHEN current_balance > credit_limit AND credit_limit > 0 THEN 1 ELSE 0 END), 0) as over_limit_count
      FROM customers
      WHERE is_active = 1
    `).get() as any;

    const topDebtors = db.prepare(`
      SELECT id, name, phone, customer_type, credit_limit, current_balance
      FROM customers
      WHERE is_active = 1 AND current_balance > 0
      ORDER BY current_balance DESC
      LIMIT 10
    `).all();

    const pendingCreditSales = db.prepare(`
      SELECT 
        s.id, s.sale_code, s.customer_name, s.customer_phone, s.total_amount, 
        s.paid_amount, s.due_amount, s.due_date, s.created_at, s.payment_status,
        c.id as customer_id
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.payment_status IN ('PENDING', 'PARTIALLY_PAID') OR s.due_amount > 0
      ORDER BY s.created_at DESC
      LIMIT 50
    `).all();

    res.json({
      summary: {
        total_receivables: summary.total_receivables,
        debtor_count: summary.debtor_count,
        over_limit_count: summary.over_limit_count,
      },
      top_debtors: topDebtors,
      pending_credit_sales: pendingCreditSales,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers - List customers with balance and order stats
router.get('/', (req: AuthRequest, res: Response): void => {
  try {
    const { search, type, has_debt } = req.query;

    let query = `
      SELECT 
        c.*,
        COUNT(s.id) as total_orders_count,
        COALESCE(SUM(s.total_amount), 0) as total_spent
      FROM customers c
      LEFT JOIN sales s ON c.id = s.customer_id
      WHERE c.is_active = 1
    `;
    const params: any[] = [];

    if (type && type !== 'ALL') {
      query += ` AND c.customer_type = ?`;
      params.push(type);
    }

    if (has_debt === 'true') {
      query += ` AND c.current_balance > 0`;
    }

    if (search) {
      const term = `%${search}%`;
      query += ` AND (c.name LIKE ? OR c.phone LIKE ? OR c.address LIKE ?)`;
      params.push(term, term, term);
    }

    query += ` GROUP BY c.id ORDER BY c.current_balance DESC, c.name ASC`;

    const customers = db.prepare(query).all(...params);

    res.json({ customers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id - Customer details, purchases, and repayment history
router.get('/:id', (req: AuthRequest, res: Response): void => {
  try {
    const customerId = Number(req.params.id);
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const sales = db.prepare(`
      SELECT 
        s.*,
        u.full_name as cashier_name,
        (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) as item_count
      FROM sales s
      LEFT JOIN users u ON s.recorded_by_user_id = u.id
      WHERE s.customer_id = ?
      ORDER BY s.created_at DESC
      LIMIT 50
    `).all(customerId);

    const payments = db.prepare(`
      SELECT 
        cp.*,
        u.full_name as collected_by_name
      FROM customer_payments cp
      LEFT JOIN users u ON cp.recorded_by_user_id = u.id
      WHERE cp.customer_id = ?
      ORDER BY cp.created_at DESC
      LIMIT 50
    `).all(customerId);

    res.json({ customer, sales, payments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers - Register new customer
router.post('/', authorizeRoles('ADMIN', 'MANAGER', 'SALES_CASHIER'), (req: AuthRequest, res: Response): void => {
  try {
    const { name, phone, email, address, customer_type, credit_limit, notes } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Customer name is required' });
      return;
    }

    const insert = db.prepare(`
      INSERT INTO customers (name, phone, email, address, customer_type, credit_limit, current_balance, notes)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      name.trim(),
      phone || '',
      email || '',
      address || '',
      customer_type || 'RETAIL',
      Number(credit_limit) || 0,
      notes || ''
    );

    const newCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(insert.lastInsertRowid);
    res.status(201).json({ message: 'Customer registered successfully', customer: newCustomer });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/customers/:id - Update customer profile / credit limit
router.put('/:id', authorizeRoles('ADMIN', 'MANAGER'), (req: AuthRequest, res: Response): void => {
  try {
    const customerId = Number(req.params.id);
    const { name, phone, email, address, customer_type, credit_limit, notes, is_active } = req.body;

    const existing = db.prepare('SELECT id FROM customers WHERE id = ?').get(customerId);
    if (!existing) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    db.prepare(`
      UPDATE customers
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          address = COALESCE(?, address),
          customer_type = COALESCE(?, customer_type),
          credit_limit = COALESCE(?, credit_limit),
          notes = COALESCE(?, notes),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(name, phone, email, address, customer_type, credit_limit !== undefined ? Number(credit_limit) : null, notes, is_active, customerId);

    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    res.json({ message: 'Customer updated successfully', customer: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers/:id/payments - Record debt repayment (Accounts Receivable Collection)
router.post('/:id/payments', authorizeRoles('ADMIN', 'MANAGER', 'SALES_CASHIER'), (req: AuthRequest, res: Response): void => {
  try {
    const customerId = Number(req.params.id);
    const { amount, payment_method, receipt_ref, notes, sale_id } = req.body;

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      res.status(400).json({ error: 'Valid payment amount greater than 0 is required' });
      return;
    }

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId) as any;
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    let rawMethod = String(payment_method || 'CASH').toUpperCase();
    if (rawMethod === 'CBE' || rawMethod === 'BANK') {
      rawMethod = 'BANK_TRANSFER';
    } else if (rawMethod === 'E_BIRR' || rawMethod === 'E-BIRR' || rawMethod === 'EB' || rawMethod === 'E BIRR') {
      rawMethod = 'EBIRR';
    }
    const validMethods = ['CASH', 'TELEBIRR', 'BANK_TRANSFER', 'EBIRR'];
    const finalMethod = validMethods.includes(rawMethod) ? rawMethod : 'CASH';

    const executePayment = db.transaction(() => {
      // 1. Insert customer payment record
      const payResult = db.prepare(`
        INSERT INTO customer_payments (customer_id, sale_id, amount, payment_method, receipt_ref, notes, recorded_by_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        customerId,
        sale_id ? Number(sale_id) : null,
        payAmount,
        finalMethod,
        receipt_ref || '',
        notes || 'Debt repayment',
        req.user?.id
      );

      // 2. Decrement customer balance
      const newBalance = Math.max(0, customer.current_balance - payAmount);
      db.prepare('UPDATE customers SET current_balance = ? WHERE id = ?').run(newBalance, customerId);

      // 3. Settle unpaid sales (FIFO or specific sale)
      let remainingToApply = payAmount;

      if (sale_id) {
        // Apply directly to specific sale
        const sale = db.prepare('SELECT * FROM sales WHERE id = ? AND customer_id = ?').get(sale_id, customerId) as any;
        if (sale && sale.due_amount > 0) {
          const apply = Math.min(sale.due_amount, remainingToApply);
          const newDue = sale.due_amount - apply;
          const newPaid = (sale.paid_amount || 0) + apply;
          const newStatus = newDue <= 0 ? 'PAID' : 'PARTIALLY_PAID';

          db.prepare('UPDATE sales SET paid_amount = ?, due_amount = ?, payment_status = ? WHERE id = ?')
            .run(newPaid, newDue, newStatus, sale.id);

          remainingToApply -= apply;
        }
      }

      // If money remains or no specific sale was selected, apply to oldest unpaid sales
      if (remainingToApply > 0) {
        const unpaidSales = db.prepare(`
          SELECT id, total_amount, paid_amount, due_amount
          FROM sales
          WHERE customer_id = ? AND (due_amount > 0 OR payment_status IN ('PENDING', 'PARTIALLY_PAID'))
          ORDER BY created_at ASC
        `).all(customerId) as any[];

        for (const s of unpaidSales) {
          if (remainingToApply <= 0) break;
          const currentDue = s.due_amount > 0 ? s.due_amount : (s.total_amount - (s.paid_amount || 0));
          if (currentDue <= 0) continue;

          const apply = Math.min(currentDue, remainingToApply);
          const newDue = currentDue - apply;
          const newPaid = (s.paid_amount || 0) + apply;
          const newStatus = newDue <= 0 ? 'PAID' : 'PARTIALLY_PAID';

          db.prepare('UPDATE sales SET paid_amount = ?, due_amount = ?, payment_status = ? WHERE id = ?')
            .run(newPaid, newDue, newStatus, s.id);

          remainingToApply -= apply;
        }
      }

      // 4. Log in Cash Flow ledger as INFLOW
      db.prepare(`
        INSERT INTO cash_transactions (type, source, reference_id, amount, payment_method, description, recorded_by_user_id)
        VALUES ('IN', 'SALE', ?, ?, ?, ?, ?)
      `).run(
        customerId,
        payAmount,
        finalMethod,
        `Receivable Repayment - ${customer.name}${receipt_ref ? ' (Ref: ' + receipt_ref + ')' : ''}`,
        req.user?.id
      );

      return {
        paymentId: payResult.lastInsertRowid,
        newBalance,
      };
    });

    const result = executePayment();
    res.status(201).json({
      message: `Successfully collected ${payAmount} ETB from ${customer.name}`,
      payment_id: result.paymentId,
      new_balance: result.newBalance,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
