import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply auth to all user routes
router.use(authenticateToken);

// GET /api/users - List users (Admin or Manager)
router.get('/', authorizeRoles('ADMIN', 'MANAGER'), (_req: AuthRequest, res: Response): void => {
  try {
    const users = db.prepare(`
      SELECT id, username, email, full_name, role, is_active, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users - Create new user with assigned role (Admin only)
router.post('/', authorizeRoles('ADMIN'), (req: AuthRequest, res: Response): void => {
  try {
    const { username, email, password, full_name, role } = req.body;

    if (!username || !email || !password || !full_name || !role) {
      res.status(400).json({ error: 'All fields (username, email, password, full_name, role) are required' });
      return;
    }

    const validRoles = ['ADMIN', 'MANAGER', 'SALES_CASHIER', 'INVENTORY_CLERK'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: `Invalid role. Allowed roles: ${validRoles.join(', ')}` });
      return;
    }

    // Check unique
    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      res.status(400).json({ error: 'Username or email already exists' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, role, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(username, email, password_hash, full_name, role);

    const newUser = db.prepare(`
      SELECT id, username, email, full_name, role, is_active, created_at
      FROM users WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id - Update user details or role (Admin only)
router.put('/:id', authorizeRoles('ADMIN'), (req: AuthRequest, res: Response): void => {
  try {
    const userId = Number(req.params.id);
    const { full_name, email, role, is_active, password } = req.body;

    const existing = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId) as any;
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Prevent removing the last active ADMIN
    if (existing.role === 'ADMIN' && (role && role !== 'ADMIN' || is_active === 0)) {
      const adminCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN' AND is_active = 1").get() as any).count;
      if (adminCount <= 1) {
        res.status(400).json({ error: 'Cannot deactivate or change role of the last active Administrator' });
        return;
      }
    }

    const validRoles = ['ADMIN', 'MANAGER', 'SALES_CASHIER', 'INVENTORY_CLERK'];
    if (role && !validRoles.includes(role)) {
      res.status(400).json({ error: `Invalid role. Allowed roles: ${validRoles.join(', ')}` });
      return;
    }

    if (password) {
      const salt = bcrypt.genSaltSync(10);
      const password_hash = bcrypt.hashSync(password, salt);
      db.prepare(`
        UPDATE users
        SET full_name = COALESCE(?, full_name),
            email = COALESCE(?, email),
            role = COALESCE(?, role),
            is_active = COALESCE(?, is_active),
            password_hash = ?
        WHERE id = ?
      `).run(full_name, email, role, is_active, password_hash, userId);
    } else {
      db.prepare(`
        UPDATE users
        SET full_name = COALESCE(?, full_name),
            email = COALESCE(?, email),
            role = COALESCE(?, role),
            is_active = COALESCE(?, is_active)
        WHERE id = ?
      `).run(full_name, email, role, is_active, userId);
    }

    const updatedUser = db.prepare(`
      SELECT id, username, email, full_name, role, is_active, created_at
      FROM users WHERE id = ?
    `).get(userId);

    res.json({ message: 'User updated successfully', user: updatedUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id', authorizeRoles('ADMIN'), (req: AuthRequest, res: Response): void => {
  try {
    const userId = Number(req.params.id);
    if (req.user?.id === userId) {
      res.status(400).json({ error: 'Cannot delete your own user account' });
      return;
    }

    const existing = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId) as any;
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    res.json({ message: 'User deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
