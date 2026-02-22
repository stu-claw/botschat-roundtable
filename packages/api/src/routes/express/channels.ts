import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { ChannelModel } from '../../db';

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

// List channels
router.get('/', authMiddleware, async (req, res) => {
  try {
    const channels = await ChannelModel.list();
    res.json({ channels });
  } catch (err) {
    console.error('List channels error:', err);
    res.status(500).json({ error: 'Failed to list channels' });
  }
});

// Create channel
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { id, name, description, openclawAgentId, systemPrompt } = req.body;
    const channel = await ChannelModel.create({
      id,
      name,
      description,
      openclawAgentId,
      systemPrompt
    });
    res.json(channel);
  } catch (err) {
    console.error('Create channel error:', err);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

export { router as channelsRouter };