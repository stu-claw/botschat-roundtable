// Database layer using sqlite3 (pure JavaScript - works on Windows without native compilation)
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import * as crypto from 'crypto';

// Types
export interface User {
  id: number;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: number;
}

export interface Swarm {
  id: number;
  name: string;
  description?: string;
  mode: string;
  leaderAgentId?: string;
  config?: string;
  createdBy: number;
  createdAt: number;
  updatedAt: number;
}

export interface SwarmMember {
  id: number;
  swarmId: number;
  agentId: string;
  role: string;
  orderIndex: number;
  config?: string;
  createdAt: number;
}

export interface SwarmSession {
  id: number;
  swarmId: number;
  sessionKey: string;
  mode: string;
  status: string;
  contextSharing: boolean;
  createdBy: number;
  createdAt: number;
  updatedAt: number;
}

export interface SwarmMessage {
  id: number;
  swarmSessionId: number;
  messageId: string;
  agentId?: string;
  agentName?: string;
  agentColor?: string;
  messageType: string;
  parentMessageId?: string;
  createdAt: number;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  openclawAgentId: string;
  systemPrompt: string;
  createdAt: number;
  updatedAt: number;
}

export interface Agent {
  id: string;
  name: string;
  sessionKey: string;
  isDefault: boolean;
  channelId: string | null;
}

export interface Message {
  id: number;
  sessionId: number;
  agentId?: string;
  sender: string;
  text: string;
  timestamp: number;
  threadId?: string;
}

export interface Session {
  id: number;
  userId: number;
  name: string;
  sessionKey: string;
  createdAt: number;
  updatedAt: number;
}

// Database instance
let db: sqlite3.Database | null = null;

// Seed data
async function seedData(): Promise<void> {
  if (!db) return;
  
  // Check if we have any channels
  const count = await new Promise<number>((resolve, reject) => {
    db!.get('SELECT COUNT(*) as count FROM channels', (err, row: any) => {
      if (err) reject(err);
      else resolve(row?.count || 0);
    });
  });
  
  if (count === 0) {
    console.log('Seeding default data...');
    const createdAt = Date.now();
    const updatedAt = createdAt;
    
    // Create default channel
    await new Promise<void>((resolve, reject) => {
      db!.run(
        'INSERT INTO channels (id, name, description, openclawAgentId, systemPrompt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['default', 'General', 'Default channel', 'agent_1', '', createdAt, updatedAt],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    // Create default agent
    await new Promise<void>((resolve, reject) => {
      db!.run(
        'INSERT INTO agents (id, name, sessionKey, isDefault, channelId) VALUES (?, ?, ?, ?, ?)',
        ['agent_1', 'Assistant', 'agent:assistant:default', 1, 'default'],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    console.log('Default data seeded');
  }
}

// Initialize database and create tables
export async function initDatabase(path: string = './botschat.db'): Promise<void> {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(path, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
      createTables()
        .then(() => seedData())
        .then(() => resolve())
        .catch(reject);
    });
  });
}

// Create tables if not exists
async function createTables(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const run = promisify(db.run.bind(db));

  // Users table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      passwordSalt TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    )
  `);

  // Channels table
  await run(`
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      openclawAgentId TEXT NOT NULL,
      systemPrompt TEXT NOT NULL DEFAULT '',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);

  // Agents table
  await run(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sessionKey TEXT NOT NULL,
      isDefault INTEGER NOT NULL DEFAULT 0,
      channelId TEXT
    )
  `);

  // Sessions table
  await run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      sessionKey TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);

  // Messages table
  await run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId INTEGER NOT NULL,
      agentId TEXT,
      sender TEXT NOT NULL,
      text TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      threadId TEXT
    )
  `);

  // Swarms table
  await run(`
    CREATE TABLE IF NOT EXISTS swarms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      mode TEXT NOT NULL DEFAULT 'roundtable',
      leaderAgentId TEXT,
      config TEXT,
      createdBy INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);

  // Swarm members table
  await run(`
    CREATE TABLE IF NOT EXISTS swarm_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      swarmId INTEGER NOT NULL,
      agentId TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      orderIndex INTEGER NOT NULL DEFAULT 0,
      config TEXT,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (swarmId) REFERENCES swarms(id) ON DELETE CASCADE
    )
  `);

  // Swarm sessions table
  await run(`
    CREATE TABLE IF NOT EXISTS swarm_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      swarmId INTEGER NOT NULL,
      sessionKey TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'roundtable',
      status TEXT NOT NULL DEFAULT 'active',
      contextSharing INTEGER NOT NULL DEFAULT 1,
      createdBy INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (swarmId) REFERENCES swarms(id) ON DELETE CASCADE
    )
  `);

  // Swarm messages table
  await run(`
    CREATE TABLE IF NOT EXISTS swarm_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      swarmSessionId INTEGER NOT NULL,
      messageId TEXT NOT NULL,
      agentId TEXT,
      agentName TEXT,
      agentColor TEXT,
      messageType TEXT NOT NULL DEFAULT 'response',
      parentMessageId TEXT,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (swarmSessionId) REFERENCES swarm_sessions(id) ON DELETE CASCADE
    )
  `);

  console.log('Database tables created');
}

// Close database
export function closeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Helper function to get database instance
function getDb(): sqlite3.Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

// User model
export const UserModel = {
  async create(email: string, password: string): Promise<User> {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');
    const createdAt = Date.now();

    return new Promise((resolve, reject) => {
      const db = getDb();
      db.run(
        'INSERT INTO users (email, passwordHash, passwordSalt, createdAt) VALUES (?, ?, ?, ?)',
        [email, hash, salt, createdAt],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, email, passwordHash: hash, passwordSalt: salt, createdAt });
        }
      );
    });
  },

  async findByEmail(email: string): Promise<User | undefined> {
    return new Promise((resolve, reject) => {
      getDb().get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row as User | undefined);
      });
    });
  },

  async findById(id: number): Promise<User | undefined> {
    return new Promise((resolve, reject) => {
      getDb().get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row as User | undefined);
      });
    });
  },

  validatePassword(user: User, password: string): boolean {
    const hash = crypto.pbkdf2Sync(password, user.passwordSalt, 1000, 64, 'sha256').toString('hex');
    return hash === user.passwordHash;
  }
};

// Swarm model
export const SwarmModel = {
  async create(data: { name: string; description?: string; mode: string; leaderAgentId?: string; config?: string; createdBy: number }): Promise<Swarm> {
    const createdAt = Date.now();
    const updatedAt = createdAt;

    return new Promise((resolve, reject) => {
      getDb().run(
        'INSERT INTO swarms (name, description, mode, leaderAgentId, config, createdBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [data.name, data.description, data.mode, data.leaderAgentId, data.config, data.createdBy, createdAt, updatedAt],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...data, createdAt, updatedAt });
        }
      );
    });
  },

  async list(): Promise<Swarm[]> {
    return new Promise((resolve, reject) => {
      getDb().all('SELECT * FROM swarms ORDER BY updatedAt DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Swarm[]);
      });
    });
  },

  async get(id: number): Promise<Swarm | undefined> {
    return new Promise((resolve, reject) => {
      getDb().get('SELECT * FROM swarms WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row as Swarm | undefined);
      });
    });
  },

  async delete(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      getDb().run('DELETE FROM swarms WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// SwarmMember model
export const SwarmMemberModel = {
  async create(swarmId: number, agentId: string, role: string = 'member', orderIndex: number = 0): Promise<SwarmMember> {
    const createdAt = Date.now();

    return new Promise((resolve, reject) => {
      getDb().run(
        'INSERT INTO swarm_members (swarmId, agentId, role, orderIndex, createdAt) VALUES (?, ?, ?, ?, ?)',
        [swarmId, agentId, role, orderIndex, createdAt],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, swarmId, agentId, role, orderIndex, createdAt });
        }
      );
    });
  },

  async listBySwarm(swarmId: number): Promise<SwarmMember[]> {
    return new Promise((resolve, reject) => {
      getDb().all('SELECT * FROM swarm_members WHERE swarmId = ? ORDER BY orderIndex', [swarmId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows as SwarmMember[]);
      });
    });
  },

  async remove(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      getDb().run('DELETE FROM swarm_members WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// SwarmSession model
export const SwarmSessionModel = {
  async create(data: { swarmId: number; sessionKey: string; mode: string; createdBy: number }): Promise<SwarmSession> {
    const createdAt = Date.now();
    const updatedAt = createdAt;

    return new Promise((resolve, reject) => {
      getDb().run(
        'INSERT INTO swarm_sessions (swarmId, sessionKey, mode, createdBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        [data.swarmId, data.sessionKey, data.mode, data.createdBy, createdAt, updatedAt],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...data, status: 'active', contextSharing: true, createdAt, updatedAt });
        }
      );
    });
  },

  async listBySwarm(swarmId: number): Promise<SwarmSession[]> {
    return new Promise((resolve, reject) => {
      getDb().all('SELECT * FROM swarm_sessions WHERE swarmId = ? ORDER BY createdAt DESC', [swarmId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows as SwarmSession[]);
      });
    });
  },

  async endSession(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const updatedAt = Date.now();
      getDb().run('UPDATE swarm_sessions SET status = ?, updatedAt = ? WHERE id = ?', ['completed', updatedAt, id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// Message model
export const MessageModel = {
  async create(sessionId: number, sender: string, text: string, agentId?: string, threadId?: string): Promise<Message> {
    const timestamp = Date.now();

    return new Promise((resolve, reject) => {
      getDb().run(
        'INSERT INTO messages (sessionId, sender, text, agentId, threadId, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [sessionId, sender, text, agentId, threadId, timestamp],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, sessionId, sender, text, agentId, threadId, timestamp });
        }
      );
    });
  },

  async listBySession(sessionId: number, limit: number = 100): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      getDb().all(
        'SELECT * FROM messages WHERE sessionId = ? ORDER BY timestamp DESC LIMIT ?',
        [sessionId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve((rows as Message[]).reverse());
        }
      );
    });
  },

  async getBySessionKey(sessionKey: string): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      getDb().all(
        `SELECT m.* FROM messages m
         JOIN sessions s ON m.sessionId = s.id
         WHERE s.sessionKey = ?
         ORDER BY m.timestamp DESC LIMIT 100`,
        [sessionKey],
        (err, rows) => {
          if (err) reject(err);
          else resolve((rows as Message[]).reverse());
        }
      );
    });
  }
};

// Channel model
export const ChannelModel = {
  async list(): Promise<Channel[]> {
    return new Promise((resolve, reject) => {
      getDb().all('SELECT * FROM channels ORDER BY createdAt DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Channel[]);
      });
    });
  },

  async create(data: { id: string; name: string; description?: string; openclawAgentId: string; systemPrompt?: string }): Promise<Channel> {
    const createdAt = Date.now();
    const updatedAt = createdAt;
    const systemPrompt = data.systemPrompt || '';

    return new Promise((resolve, reject) => {
      getDb().run(
        'INSERT INTO channels (id, name, description, openclawAgentId, systemPrompt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [data.id, data.name, data.description, data.openclawAgentId, systemPrompt, createdAt, updatedAt],
        function(err) {
          if (err) reject(err);
          else resolve({ ...data, systemPrompt, createdAt, updatedAt });
        }
      );
    });
  }
};

// Agent model
export const AgentModel = {
  async list(): Promise<Agent[]> {
    return new Promise((resolve, reject) => {
      getDb().all('SELECT * FROM agents ORDER BY name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Agent[]);
      });
    });
  },

  async create(data: { id: string; name: string; sessionKey: string; isDefault?: boolean; channelId?: string | null }): Promise<Agent> {
    return new Promise((resolve, reject) => {
      getDb().run(
        'INSERT INTO agents (id, name, sessionKey, isDefault, channelId) VALUES (?, ?, ?, ?, ?)',
        [data.id, data.name, data.sessionKey, data.isDefault ? 1 : 0, data.channelId || null],
        function(err) {
          if (err) reject(err);
          else resolve({ 
            id: data.id, 
            name: data.name, 
            sessionKey: data.sessionKey, 
            isDefault: data.isDefault || false, 
            channelId: data.channelId || null 
          });
        }
      );
    });
  }
};

// Session model
export const SessionModel = {
  async create(data: { userId: number; name: string; sessionKey: string }): Promise<Session> {
    const createdAt = Date.now();
    const updatedAt = createdAt;

    return new Promise((resolve, reject) => {
      getDb().run(
        'INSERT INTO sessions (userId, name, sessionKey, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        [data.userId, data.name, data.sessionKey, createdAt, updatedAt],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...data, createdAt, updatedAt });
        }
      );
    });
  },

  async listByUser(userId: number): Promise<Session[]> {
    return new Promise((resolve, reject) => {
      getDb().all('SELECT * FROM sessions WHERE userId = ? ORDER BY updatedAt DESC', [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Session[]);
      });
    });
  }
};

// Export getMessagesBySession for agent-manager
export const getMessagesBySession = MessageModel.listBySession;

// Export the database instance for advanced usage if needed
export function getDatabaseInstance(): sqlite3.Database | null {
  return db;
}