import { Router, Response } from 'express';
import { db } from '../db/database';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// GET /api/cashflow/summary - Summary of inflows, outflows, net balance, and breakdown
router.get('/summary', (_req: AuthRequest, res: Response): void => {
  try {
    // Total IN and OUT
    const totals = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'IN' THEN amount ELSE 0 END), 0) as total_in,
        COALESCE(SUM(CASE WHEN type = 'OUT' THEN amount ELSE 0 END), 0) as total_out
      FROM cash_transactions
    `).get() as { total_in: number; total_out: number };

    const net_balance = totals.total_in - totals.total_out;

    // By Payment Method
    const byMethod = db.prepare(`
      SELECT 
        payment_method,
        COALESCE(SUM(CASE WHEN type = 'IN' THEN amount ELSE 0 END), 0) as in_amount,
        COALESCE(SUM(CASE WHEN type = 'OUT' THEN amount ELSE 0 END), 0) as out_amount,
        (COALESCE(SUM(CASE WHEN type = 'IN' THEN amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN type = 'OUT' THEN amount ELSE 0 END), 0)) as balance
      FROM cash_transactions
      GROUP BY payment_method
    `).all();

    // Inflows by Source
    const inBySource = db.prepare(`
      SELECT source, SUM(amount) as amount
      FROM cash_transactions
      WHERE type = 'IN'
      GROUP BY source
    `).all();

    // Outflows by Category (from expenses table)
    const outByCategory = db.prepare(`
      SELECT category, SUM(amount) as amount
      FROM expenses
      GROUP BY category
    `).all();

    res.json({
      summary: {
        total_in: totals.total_in,
        total_out: totals.total_out,
        net_balance,
      },
      by_method: byMethod,
      in_by_source: inBySource,
      out_by_category: outByCategory,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cashflow/transactions - Ledger transactions
router.get('/transactions', (_req: AuthRequest, res: Response): void => {
  try {
    const transactions = db.prepare(`
      SELECT 
        ct.*,
        u.full_name as recorded_by_name
      FROM cash_transactions ct
      LEFT JOIN users u ON ct.recorded_by_user_id = u.id
      ORDER BY ct.created_at DESC
      LIMIT 100
    `).all();

    res.json({ transactions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cashflow/transactions - Manual adjustment / Capital injection / Float
router.post('/transactions', authorizeRoles('ADMIN', 'MANAGER'), (req: AuthRequest, res: Response): void => {
  try {
    const { type, source, amount, payment_method, description } = req.body;

    if (!type || !source || !amount || !payment_method || !description) {
      res.status(400).json({ error: 'Type (IN/OUT), source, amount, payment_method, and description are required' });
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: 'Amount must be greater than 0' });
      return;
    }

    let normMethod = String(payment_method).toUpperCase();
    if (normMethod === 'CBE' || normMethod === 'BANK') normMethod = 'BANK_TRANSFER';
    if (normMethod === 'E_BIRR' || normMethod === 'E-BIRR' || normMethod === 'EB' || normMethod === 'E BIRR') normMethod = 'EBIRR';
    if (!['CASH', 'TELEBIRR', 'BANK_TRANSFER', 'EBIRR'].includes(normMethod)) normMethod = 'CASH';

    const result = db.prepare(`
      INSERT INTO cash_transactions (type, source, amount, payment_method, description, recorded_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(type, source, numAmount, normMethod, description, req.user?.id);

    const created = db.prepare('SELECT * FROM cash_transactions WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Cash transaction recorded', transaction: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

