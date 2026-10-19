import { Router, Response } from 'express';
import { db } from '../db/database';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// GET /api/suppliers - List active suppliers with batch supply counts
router.get('/', (_req: AuthRequest, res: Response): void => {
  try {
    const suppliers = db.prepare(`
      SELECT 
        s.*,
        COUNT(b.id) as batches_supplied_count,
        COALESCE(SUM(b.initial_quantity), 0) as total_units_supplied
      FROM suppliers s
      LEFT JOIN batches b ON s.id = b.supplier_id
      WHERE s.is_active = 1
      GROUP BY s.id
      ORDER BY s.name ASC
    `).all();

    res.json({ suppliers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/suppliers/:id - Supplier details with supplied batches
router.get('/:id', (req: AuthRequest, res: Response): void => {
  try {
    const supplierId = Number(req.params.id);
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplierId);

    if (!supplier) {
      res.status(404).json({ error: 'Supplier not found' });
      return;
    }

    const batches = db.prepare(`
      SELECT b.*, p.name as product_name, p.unit as product_unit
      FROM batches b
      JOIN products p ON b.product_id = p.id
      WHERE b.supplier_id = ?
      ORDER BY b.created_at DESC
      LIMIT 50
    `).all(supplierId);

    res.json({ supplier, batches });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/suppliers - Add new supplier
router.post('/', authorizeRoles('ADMIN', 'MANAGER', 'INVENTORY_CLERK'), (req: AuthRequest, res: Response): void => {
  try {
    const { name, phone, email, contact_person, category, address, notes } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Supplier name is required' });
      return;
    }

    const insert = db.prepare(`
      INSERT INTO suppliers (name, phone, email, contact_person, category, address, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      name.trim(),
      phone || '',
      email || '',
      contact_person || '',
      category || 'RAW_MILK',
      address || '',
      notes || ''
    );

    const newSupplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(insert.lastInsertRowid);
    res.status(201).json({ message: 'Supplier registered successfully', supplier: newSupplier });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/suppliers/:id - Update supplier
router.put('/:id', authorizeRoles('ADMIN', 'MANAGER', 'INVENTORY_CLERK'), (req: AuthRequest, res: Response): void => {
  try {
    const supplierId = Number(req.params.id);
    const { name, phone, email, contact_person, category, address, notes, is_active } = req.body;

    const existing = db.prepare('SELECT id FROM suppliers WHERE id = ?').get(supplierId);
    if (!existing) {
      res.status(404).json({ error: 'Supplier not found' });
      return;
    }

    db.prepare(`
      UPDATE suppliers
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          contact_person = COALESCE(?, contact_person),
          category = COALESCE(?, category),
          address = COALESCE(?, address),
          notes = COALESCE(?, notes),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(name, phone, email, contact_person, category, address, notes, is_active, supplierId);

    const updated = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplierId);
    res.json({ message: 'Supplier updated successfully', supplier: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/suppliers/:id - Soft delete
router.delete('/:id', authorizeRoles('ADMIN', 'MANAGER'), (req: AuthRequest, res: Response): void => {
  try {
    const supplierId = Number(req.params.id);
    db.prepare('UPDATE suppliers SET is_active = 0 WHERE id = ?').run(supplierId);
    res.json({ message: 'Supplier deactivated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
