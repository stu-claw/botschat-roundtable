import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { initDatabase, closeDatabase } from './db';
import { authRouter } from './routes/express/auth';
import { swarmsRouter } from './routes/express/swarms';
import { agentsRouter } from './routes/express/agents';
import { channelsRouter } from './routes/express/channels';
import { messagesRouter } from './routes/express/messages';
import { modelsRouter } from './routes/express/models';
import { pushRouter } from './routes/express/push';
import { devAuthRouter } from './routes/express/dev-auth';
import { AgentManager } from './agents/agent-manager';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/api/ws' });

// Middleware - CORS allows all origins for development
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

// Debug logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${req.headers.origin || 'no origin'}`);
  next();
});

// Track WebSocket clients
const wsClients = new Map<string, WebSocket>();

// Initialize agent manager
const agentManager = new AgentManager();

// WebSocket handling
wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const userId = url.searchParams.get('userId');
  const sessionId = url.searchParams.get('sessionId');
  
  if (userId) {
    wsClients.set(userId, ws);
    console.log(`WebSocket connected: ${userId}`);
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'swarm.message') {
          // Handle round table message
          await agentManager.processRoundTableMessage(
            data.swarmId,
            data.sessionId,
            data.text,
            wsClients
          );
        } else if (data.type === 'deck.message') {
          // Handle deck message (single agent)
          await agentManager.processDeckMessage(
            data.agentId,
            data.sessionId,
            data.text,
            ws
          );
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });
    
    ws.on('close', () => {
      wsClients.delete(userId);
      console.log(`WebSocket disconnected: ${userId}`);
    });
  }
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/swarms', swarmsRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/models', modelsRouter);
app.use('/api/push-tokens', pushRouter);
app.use('/api/auth', devAuthRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await initDatabase();
    console.log('Database initialized');
    
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`WebSocket server ready on ws://localhost:${PORT}/api/ws`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await closeDatabase();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await closeDatabase();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

start();