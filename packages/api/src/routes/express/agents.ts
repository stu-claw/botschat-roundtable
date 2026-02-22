import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { AgentModel } from '../../db';

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

// List agents
router.get('/', authMiddleware, async (req, res) => {
  try {
    const agents = await AgentModel.list();
    res.json({ agents });
  } catch (err) {
    console.error('List agents error:', err);
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

export { router as agentsRouter };