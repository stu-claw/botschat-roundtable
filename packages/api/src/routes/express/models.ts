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

// List models (mock data for now - matches OpenClaw's model list)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const models = [
      { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
      { id: 'claude-opus-4-6', name: 'Claude Opus 4', provider: 'anthropic' },
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google' },
      { id: 'gemini-flash', name: 'Gemini Flash', provider: 'google' },
      { id: 'kimi-k2.5', name: 'Kimi K2.5', provider: 'moonshot' },
    ];
    res.json({ models });
  } catch (err) {
    console.error('List models error:', err);
    res.status(500).json({ error: 'Failed to list models' });
  }
});

export { router as modelsRouter };