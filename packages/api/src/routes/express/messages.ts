import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { MessageModel } from '../../db';

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

// Get messages for session
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const { sessionKey } = req.query;
    if (!sessionKey) {
      return res.status(400).json({ error: 'sessionKey required' });
    }
    
    const messages = await MessageModel.getBySessionKey(sessionKey as string);
    res.json({ messages });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

export { router as messagesRouter };