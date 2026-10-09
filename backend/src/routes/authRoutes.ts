import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database';
import { generateToken, authenticateToken, AuthRequest, AuthUser } from '../middleware/auth';

const router = Router();

// GET /api/auth/staff-list (Public for PIN screen profile selection)
router.get('/staff-list', (_req: Request, res: Response): void => {
  try {
    const staff = db.prepare(`
      SELECT id, username, full_name, role
      FROM users
      WHERE is_active = 1
      ORDER BY 
        CASE role
          WHEN 'ADMIN' THEN 1
          WHEN 'MANAGER' THEN 2
          WHEN 'SALES_CASHIER' THEN 3
          WHEN 'INVENTORY_CLERK' THEN 4
          ELSE 5
        END, full_name ASC
    `).all();

    res.json({ staff });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/pin-login
router.post('/pin-login', (req: Request, res: Response): void => {
  try {
    const { pin, user_id } = req.body;

    if (!pin) {
      res.status(400).json({ error: 'PIN is required' });
      return;
    }

    const cleanPin = String(pin).trim();

    let matchedUser: any = null;

    if (user_id) {
      // Check PIN for specific user
      const user = db.prepare(`
        SELECT id, username, email, pin_hash, password_hash, full_name, role, is_active
        FROM users
        WHERE id = ? AND is_active = 1
      `).get(user_id) as any;

      if (!user) {
        res.status(404).json({ error: 'Staff account not found or deactivated' });
        return;
      }

      if (user.pin_hash && bcrypt.compareSync(cleanPin, user.pin_hash)) {
        matchedUser = user;
      }
    } else {
      // Find matching user by PIN across all active users
      const activeUsers = db.prepare(`
        SELECT id, username, email, pin_hash, full_name, role, is_active
        FROM users
        WHERE is_active = 1 AND pin_hash IS NOT NULL
      `).all() as any[];

      for (const u of activeUsers) {
        if (u.pin_hash && bcrypt.compareSync(cleanPin, u.pin_hash)) {
          matchedUser = u;
          break;
        }
      }
    }

    if (!matchedUser) {
      res.status(401).json({ error: 'Invalid PIN. Please try again.' });
      return;
    }

    const authUser: AuthUser = {
      id: matchedUser.id,
      username: matchedUser.username,
      email: matchedUser.email,
      role: matchedUser.role,
      full_name: matchedUser.full_name,
    };

    const token = generateToken(authUser);

    res.json({
      message: 'PIN login successful',
      token,
      user: authUser,
    });
  } catch (err: any) {
    console.error('PIN Login error:', err);
    res.status(500).json({ error: 'Internal server error during PIN login' });
  }
});

// POST /api/auth/login (Standard login fallback)
router.post('/login', (req: Request, res: Response): void => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      res.status(400).json({ error: 'Username/Email and password are required' });
      return;
    }

    const user = db.prepare(`
      SELECT id, username, email, password_hash, full_name, role, is_active
      FROM users
      WHERE email = ? OR username = ?
    `).get(login, login) as any;

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ error: 'Account is deactivated. Please contact an Administrator.' });
      return;
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    };

    const token = generateToken(authUser);

    res.json({
      message: 'Login successful',
      token,
      user: authUser,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const user = db.prepare(`
    SELECT id, username, email, full_name, role, is_active, created_at
    FROM users WHERE id = ?
  `).get(req.user.id);
  res.json({ user });
});

export default router;
