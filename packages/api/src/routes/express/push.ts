import { Router } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Auth middleware
const authMiddleware = (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.slice(7);
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Register push token
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { token, platform } = req.body;
    // Mock implementation - just acknowledge
    res.json({ ok: true, id: `push_${Date.now()}` });
  } catch (err) {
    console.error('Push token error:', err);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

// Unregister push token
router.delete('/', authMiddleware, async (req, res) => {
  try {
    res.json({ ok: true });
  } catch (err) {
    console.error('Push token delete error:', err);
    res.status(500).json({ error: 'Failed to unregister push token' });
  }
});

export { router as pushRouter };