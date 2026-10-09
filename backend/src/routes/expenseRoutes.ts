import { Router, Response } from 'express';
import { db } from '../db/database';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// GET /api/expenses - List expenses
router.get('/', (_req: AuthRequest, res: Response): void => {
  try {
    const expenses = db.prepare(`
      SELECT 
        e.*,
        u.full_name as recorded_by_name
      FROM expenses e
      LEFT JOIN users u ON e.recorded_by_user_id = u.id
      ORDER BY e.expense_date DESC, e.created_at DESC
      LIMIT 100
    `).all();

    res.json({ expenses });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/expenses - Record expense (Admin, Manager, Inventory Clerk)
router.post('/', authorizeRoles('ADMIN', 'MANAGER', 'INVENTORY_CLERK'), (req: AuthRequest, res: Response): void => {
  try {
    const {
      title,
      category,
      amount,
      expense_date,
      payment_method,
      vendor_name,
      receipt_ref,
      notes
    } = req.body;

    if (!title || !category || !amount || !expense_date || !payment_method) {
      res.status(400).json({ error: 'Title, category, amount, expense_date, and payment_method are required' });
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: 'Amount must be a positive number' });
      return;
    }

    const validCategories = [
      'RAW_MILK_PROCUREMENT',
      'FEED_FODDER',
      'PACKAGING_MATERIALS',
      'COLD_CHAIN_ELECTRICITY',
      'TRANSPORT_LOGISTICS',
      'STAFF_WAGES',
      'EQUIPMENT_MAINTENANCE',
      'SUPPLIES_OTHER'
    ];

    if (!validCategories.includes(category)) {
      res.status(400).json({ error: 'Invalid expense category' });
      return;
    }

    const expenseCode = `EXP-${Date.now().toString().slice(-6)}`;

    const tx = db.transaction(() => {
      // 1. Insert expense
      const insert = db.prepare(`
        INSERT INTO expenses (
          expense_code, title, category, amount, expense_date, payment_method,
          vendor_name, recorded_by_user_id, receipt_ref, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        expenseCode,
        title,
        category,
        numAmount,
        expense_date,
        payment_method,
        vendor_name || '',
        req.user?.id,
        receipt_ref || '',
        notes || ''
      );

      const expenseId = insert.lastInsertRowid;

      // 2. Automatically log Cash Flow OUT
      db.prepare(`
        INSERT INTO cash_transactions (
          type, source, reference_id, amount, payment_method, description, recorded_by_user_id
        )
        VALUES ('OUT', 'EXPENSE', ?, ?, ?, ?, ?)
      `).run(
        expenseId,
        numAmount,
        payment_method,
        `Expense: ${title} (${category.replace(/_/g, ' ')})`,
        req.user?.id
      );

      return expenseId;
    });

    const newExpenseId = tx();
    const createdExpense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(newExpenseId);

    res.status(201).json({
      message: 'Expense recorded successfully',
      expense: createdExpense
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/expenses/:id - Delete expense and reverse cash transaction (Admin/Manager)
router.delete('/:id', authorizeRoles('ADMIN', 'MANAGER'), (req: AuthRequest, res: Response): void => {
  try {
    const expenseId = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
    if (!existing) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    const tx = db.transaction(() => {
      // Remove related cash transaction
      db.prepare("DELETE FROM cash_transactions WHERE source = 'EXPENSE' AND reference_id = ?").run(expenseId);
      // Remove expense
      db.prepare('DELETE FROM expenses WHERE id = ?').run(expenseId);
    });

    tx();
    res.json({ message: 'Expense and cash record deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
