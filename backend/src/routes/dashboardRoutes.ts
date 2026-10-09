import { Router, Response } from 'express';
import { db } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// GET /api/dashboard/stats
router.get('/stats', (_req: AuthRequest, res: Response): void => {
  try {
    // 1. Sales Stats
    const salesToday = db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total,
        COUNT(*) as count
      FROM sales
      WHERE date(created_at) = date('now')
    `).get() as { total: number; count: number };

    const salesThisMonth = db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total,
        COUNT(*) as count
      FROM sales
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get() as { total: number; count: number };

    // 2. Expense Stats
    const expensesThisMonth = db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
      FROM expenses
      WHERE strftime('%Y-%m', expense_date) = strftime('%Y-%m', 'now')
    `).get() as { total: number; count: number };

    // 3. Cash Flow Totals
    const cashTotals = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'IN' THEN amount ELSE 0 END), 0) as total_in,
        COALESCE(SUM(CASE WHEN type = 'OUT' THEN amount ELSE 0 END), 0) as total_out
      FROM cash_transactions
    `).get() as { total_in: number; total_out: number };

    const netCash = cashTotals.total_in - cashTotals.total_out;

    // 4. Inventory counts
    const activeProductsCount = (db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get() as any).count;

    // Batches expiring within 3 days
    const expiringBatches = db.prepare(`
      SELECT 
        b.id, b.batch_number, b.current_quantity, b.expiry_date,
        p.name as product_name, p.unit,
        CAST(julianday(b.expiry_date) - julianday('now') AS INTEGER) as days_left
      FROM batches b
      JOIN products p ON b.product_id = p.id
      WHERE b.status = 'ACTIVE' 
        AND b.current_quantity > 0 
        AND date(b.expiry_date) <= date('now', '+3 days')
      ORDER BY b.expiry_date ASC
      LIMIT 10
    `).all();

    // Low stock products
    const lowStockProducts = db.prepare(`
      SELECT 
        p.id, p.sku, p.name, p.min_stock_level, p.unit,
        COALESCE(SUM(CASE WHEN b.status = 'ACTIVE' AND date(b.expiry_date) >= date('now') THEN b.current_quantity ELSE 0 END), 0) as current_stock
      FROM products p
      LEFT JOIN batches b ON p.id = b.product_id
      WHERE p.is_active = 1
      GROUP BY p.id
      HAVING current_stock <= p.min_stock_level
      LIMIT 10
    `).all();

    // Recent 5 sales
    const recentSales = db.prepare(`
      SELECT s.*, u.full_name as cashier_name
      FROM sales s
      LEFT JOIN users u ON s.recorded_by_user_id = u.id
      ORDER BY s.created_at DESC
      LIMIT 5
    `).all();

    // Recent 5 expenses
    const recentExpenses = db.prepare(`
      SELECT e.*, u.full_name as recorded_by_name
      FROM expenses e
      LEFT JOIN users u ON e.recorded_by_user_id = u.id
      ORDER BY e.created_at DESC
      LIMIT 5
    `).all();

    res.json({
      salesToday,
      salesThisMonth,
      expensesThisMonth,
      cashTotals: {
        total_in: cashTotals.total_in,
        total_out: cashTotals.total_out,
        net_cash: netCash
      },
      inventory: {
        activeProductsCount,
        expiringBatchesCount: expiringBatches.length,
        lowStockProductsCount: lowStockProducts.length,
        expiringBatches,
        lowStockProducts
      },
      recentSales,
      recentExpenses
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
