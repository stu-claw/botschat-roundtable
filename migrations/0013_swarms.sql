-- Migration: Add Swarm support for multi-agent coordination
-- Created: 2025-02-21

-- Swarms table: Groups of agents that work together
CREATE TABLE IF NOT EXISTS swarms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    mode TEXT NOT NULL DEFAULT 'roundtable', -- 'roundtable', 'divide_conquer', 'panel'
    leader_agent_id TEXT, -- The coordinator agent (optional)
    config TEXT, -- JSON: { maxParallelJobs, consensusThreshold, etc }
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Swarm members: Agents belonging to a swarm
CREATE TABLE IF NOT EXISTS swarm_members (
    id TEXT PRIMARY KEY,
    swarm_id TEXT NOT NULL,
    agent_id TEXT NOT NULL, -- Reference to channels.openclaw_agent_id
    role TEXT NOT NULL DEFAULT 'member', -- 'leader', 'member', 'observer'
    order_index INTEGER DEFAULT 0, -- For ordering in roundtable
    config TEXT, -- JSON: agent-specific swarm config
    created_at INTEGER NOT NULL,
    FOREIGN KEY (swarm_id) REFERENCES swarms(id) ON DELETE CASCADE
);

-- Swarm sessions: Active conversations involving a swarm
CREATE TABLE IF NOT EXISTS swarm_sessions (
    id TEXT PRIMARY KEY,
    swarm_id TEXT NOT NULL,
    session_key TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'roundtable', -- 'roundtable', 'deck'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'completed'
    context_sharing INTEGER DEFAULT 1, -- Whether agents see each other's messages
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (swarm_id) REFERENCES swarms(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Swarm messages: Track which agent sent what in swarm mode
CREATE TABLE IF NOT EXISTS swarm_messages (
    id TEXT PRIMARY KEY,
    swarm_session_id TEXT NOT NULL,
    message_id TEXT NOT NULL, -- Reference to messages.id
    agent_id TEXT, -- Which agent sent this (NULL for user)
    message_type TEXT DEFAULT 'response', -- 'response', 'reaction', 'suggestion'
    parent_message_id TEXT, -- For threaded swarm discussions
    created_at INTEGER NOT NULL,
    FOREIGN KEY (swarm_session_id) REFERENCES swarm_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_swarms_created_by ON swarms(created_by);
CREATE INDEX IF NOT EXISTS idx_swarm_members_swarm ON swarm_members(swarm_id);
CREATE INDEX IF NOT EXISTS idx_swarm_sessions_swarm ON swarm_sessions(swarm_id);
CREATE INDEX IF NOT EXISTS idx_swarm_messages_session ON swarm_messages(swarm_session_id);

-- Migration tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES ('0013_swarms', strftime('%s', 'now'));