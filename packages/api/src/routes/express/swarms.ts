import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { SwarmModel, SwarmMemberModel, SwarmSessionModel, MessageModel } from '../../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Auth middleware - adds userId to request
const authMiddleware = (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// List swarms
router.get('/', authMiddleware, async (req: any, res) => {
  try {
    const swarms = await SwarmModel.list();
    res.json({ swarms });
  } catch (err) {
    console.error('List swarms error:', err);
    res.status(500).json({ error: 'Failed to list swarms' });
  }
});

// Create swarm
router.post('/', authMiddleware, async (req: any, res) => {
  try {
    const { name, description, mode, leaderAgentId } = req.body;
    const swarm = await SwarmModel.create({
      name,
      description,
      mode: mode || 'roundtable',
      leaderAgentId,
      createdBy: req.userId
    });
    res.json(swarm);
  } catch (err) {
    console.error('Create swarm error:', err);
    res.status(500).json({ error: 'Failed to create swarm' });
  }
});

// Get swarm with members
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const swarm = await SwarmModel.get(parseInt(req.params.id));
    if (!swarm) {
      return res.status(404).json({ error: 'Swarm not found' });
    }
    
    const members = await SwarmMemberModel.listBySwarm(swarm.id);
    res.json({ swarm, members });
  } catch (err) {
    console.error('Get swarm error:', err);
    res.status(500).json({ error: 'Failed to get swarm' });
  }
});

// Delete swarm
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await SwarmModel.delete(parseInt(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete swarm error:', err);
    res.status(500).json({ error: 'Failed to delete swarm' });
  }
});

// Add member
router.post('/:id/members', authMiddleware, async (req, res) => {
  try {
    const { agentId, role, orderIndex } = req.body;
    const member = await SwarmMemberModel.create(
      parseInt(req.params.id),
      agentId,
      role,
      orderIndex
    );
    res.json(member);
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// Remove member
router.delete('/:id/members/:memberId', authMiddleware, async (req, res) => {
  try {
    await SwarmMemberModel.remove(parseInt(req.params.memberId));
    res.json({ ok: true });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// List sessions
router.get('/:id/sessions', authMiddleware, async (req, res) => {
  try {
    const sessions = await SwarmSessionModel.listBySwarm(parseInt(req.params.id));
    res.json({ sessions });
  } catch (err) {
    console.error('List sessions error:', err);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// Create session
router.post('/:id/sessions', authMiddleware, async (req: any, res) => {
  try {
    const { mode } = req.body;
    const sessionKey = `swarm:${req.params.id}:${Date.now()}`;
    const session = await SwarmSessionModel.create({
      swarmId: parseInt(req.params.id),
      sessionKey,
      mode: mode || 'roundtable',
      createdBy: req.userId
    });
    res.json(session);
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Post message (round table)
router.post('/:id/sessions/:sessionId/messages', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    // Store user message
    const message = await MessageModel.create(
      parseInt(req.params.sessionId),
      'user',
      text
    );
    res.json({ messageId: message.id, distributed: 1 });
  } catch (err) {
    console.error('Post message error:', err);
    res.status(500).json({ error: 'Failed to post message' });
  }
});

export { router as swarmsRouter };