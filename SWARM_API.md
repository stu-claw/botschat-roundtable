# Swarm API Implementation Guide

## Overview
This document outlines the backend API routes needed to fully support the Multi-Swarm, Round Table, and Bot Deck features.

## Database Schema

See `migrations/0013_swarms.sql` for the complete schema.

Key tables:
- `swarms` — Swarm definitions
- `swarm_members` — Agents in each swarm
- `swarm_sessions` — Active swarm conversations
- `swarm_messages` — Message metadata for swarm coordination

## API Routes to Implement

### Swarm Management

#### GET /api/swarms
List all swarms for the current user.

**Response:**
```json
{
  "swarms": [
    {
      "id": "swarm_123",
      "name": "Research Team",
      "description": "Multi-agent research swarm",
      "mode": "roundtable",
      "leaderAgentId": "agent_456",
      "config": { "maxParallelJobs": 3 },
      "createdBy": "user_789",
      "createdAt": 1708531200,
      "updatedAt": 1708531200
    }
  ]
}
```

#### GET /api/swarms/:id
Get swarm details with members.

**Response:**
```json
{
  "swarm": {
    "id": "swarm_123",
    "name": "Research Team",
    "mode": "roundtable",
    ...
  },
  "members": [
    {
      "id": "member_1",
      "swarmId": "swarm_123",
      "agentId": "agent_456",
      "role": "leader",
      "orderIndex": 0,
      "agentName": "Researcher",
      "agentColor": "#22d3ee"
    }
  ]
}
```

#### POST /api/swarms
Create a new swarm.

**Request:**
```json
{
  "name": "Research Team",
  "description": "Optional description",
  "mode": "roundtable",
  "leaderAgentId": "agent_456",
  "config": {}
}
```

#### PATCH /api/swarms/:id
Update swarm settings.

#### DELETE /api/swarms/:id
Delete a swarm and all associated data.

### Swarm Members

#### POST /api/swarms/:id/members
Add an agent to the swarm.

**Request:**
```json
{
  "agentId": "agent_789",
  "role": "member",
  "orderIndex": 1,
  "config": {}
}
```

#### PATCH /api/swarms/:id/members/:memberId
Update member role/order.

#### DELETE /api/swarms/:id/members/:memberId
Remove an agent from the swarm.

### Swarm Sessions

#### GET /api/swarms/:id/sessions
List all sessions for a swarm.

#### POST /api/swarms/:id/sessions
Create a new swarm session.

**Request:**
```json
{
  "mode": "roundtable",
  "contextSharing": true
}
```

**Response:**
```json
{
  "id": "session_123",
  "swarmId": "swarm_456",
  "sessionKey": "swarm:swarm_456:session_123",
  "mode": "roundtable",
  "status": "active",
  "contextSharing": true,
  "createdBy": "user_789",
  "createdAt": 1708531200,
  "updatedAt": 1708531200
}
```

#### POST /api/swarms/:id/sessions/:sessionId/end
End a swarm session.

### Round Table Messages

#### POST /api/swarms/:id/sessions/:sessionId/messages
Send a message to the round table (distributes to all agents).

**Request:**
```json
{
  "text": "What do you all think about this?",
  "targetAgentIds": ["agent_1", "agent_2"] // Optional: specific agents only
}
```

**Response:**
```json
{
  "messageId": "msg_123",
  "distributed": 3 // Number of agents that received the message
}
```

**Behavior:**
1. Store the user message
2. Broadcast to all agents in the swarm (or targetAgentIds if specified)
3. Each agent processes independently
4. Agent responses are tagged with swarm metadata
5. Responses are shown in the shared conversation thread

### WebSocket Protocol Extensions

New message types for swarm coordination:

#### `swarm.message` (Client → Server)
Send a message to a swarm session.

```json
{
  "type": "swarm.message",
  "swarmId": "swarm_123",
  "sessionId": "session_456",
  "text": "Message content",
  "targetAgentIds": []
}
```

#### `swarm.broadcast` (Server → Client)
Broadcast a message to all swarm participants.

```json
{
  "type": "swarm.broadcast",
  "swarmId": "swarm_123",
  "sessionId": "session_456",
  "messageId": "msg_789",
  "senderAgentId": "agent_1",
  "senderAgentName": "Researcher",
  "text": "Agent response",
  "timestamp": 1708531200
}
```

#### `swarm.typing` (Server → Client)
Typing indicator from an agent.

```json
{
  "type": "swarm.typing",
  "swarmId": "swarm_123",
  "sessionId": "session_456",
  "agentId": "agent_1",
  "agentName": "Researcher"
}
```

## Implementation Notes

### Round Table Mode
- User messages are broadcast to ALL agents in the swarm
- Each agent responds independently
- Responses include agent identification (name, color, avatar)
- Context is shared: agents see the conversation history including other agents' responses

### Divide & Conquer Mode
- User message goes to the swarm leader
- Leader breaks down the task and assigns to members
- Members work in parallel
- Leader synthesizes responses
- Final response shown to user

### Panel Mode
- Like Round Table but agents respond in a structured format
- Each agent has a designated "expertise area"
- Responses are organized by category

### Bot Deck Mode
- Each agent has independent conversation
- No automatic broadcasting
- User can send different messages to each agent
- Agents don't see each other's conversations

## Frontend State Management

The frontend store (`store.ts`) already includes:
- `swarms` — List of swarms
- `selectedSwarmId` — Currently selected swarm
- `swarmMembers` — Members of selected swarm
- `swarmSessions` — Active sessions
- `isRoundTableMode` — Toggle for round table UI
- `deckAgents` — Agents configured for deck view

## Security Considerations

1. Verify user owns the swarm before allowing modifications
2. Validate agent IDs belong to user's channels
3. Rate limit swarm message broadcasts
4. Implement proper access control for swarm sessions

## Testing

Test cases to implement:
1. Create swarm → add members → start session → send messages
2. Round table: verify all agents receive broadcast
3. Deck view: verify independent conversations
4. Session persistence: reload page, verify state restored
5. Member removal: verify agent no longer receives messages