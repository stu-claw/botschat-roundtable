// Mock API for local development/testing
// Returns fake data when backend is not available

import type { Swarm, SwarmMember, SwarmSession } from "./api";

const MOCK_DELAY = 300;

let mockSwarms: Swarm[] = [
  {
    id: "swarm_1",
    name: "Research Team",
    description: "Multi-agent research swarm for analysis tasks",
    mode: "roundtable",
    leaderAgentId: "agent_1",
    config: { maxParallelJobs: 3 },
    createdBy: "user_1",
    createdAt: Date.now() / 1000,
    updatedAt: Date.now() / 1000,
  },
  {
    id: "swarm_2", 
    name: "Code Reviewers",
    description: "Code review and debugging specialists",
    mode: "panel",
    leaderAgentId: "agent_2",
    config: {},
    createdBy: "user_1",
    createdAt: Date.now() / 1000,
    updatedAt: Date.now() / 1000,
  },
];

let mockMembers: Record<string, SwarmMember[]> = {
  swarm_1: [
    { id: "m1", swarmId: "swarm_1", agentId: "agent_1", role: "leader", orderIndex: 0, agentName: "Researcher", agentColor: "#22d3ee" },
    { id: "m2", swarmId: "swarm_1", agentId: "agent_2", role: "member", orderIndex: 1, agentName: "Analyst", agentColor: "#a78bfa" },
    { id: "m3", swarmId: "swarm_1", agentId: "agent_3", role: "member", orderIndex: 2, agentName: "Skeptic", agentColor: "#f472b6" },
  ],
  swarm_2: [
    { id: "m4", swarmId: "swarm_2", agentId: "agent_2", role: "leader", orderIndex: 0, agentName: "Code Expert", agentColor: "#34d399" },
    { id: "m5", swarmId: "swarm_2", agentId: "agent_4", role: "member", orderIndex: 1, agentName: "Debugger", agentColor: "#fbbf24" },
  ],
};

let mockSessions: Record<string, SwarmSession[]> = {
  swarm_1: [],
  swarm_2: [],
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockSwarmsApi = {
  list: async (): Promise<{ swarms: Swarm[] }> => {
    await delay(MOCK_DELAY);
    return { swarms: mockSwarms };
  },

  get: async (id: string): Promise<{ swarm: Swarm; members: SwarmMember[] }> => {
    await delay(MOCK_DELAY);
    const swarm = mockSwarms.find((s) => s.id === id);
    if (!swarm) throw new Error("Swarm not found");
    return { swarm, members: mockMembers[id] || [] };
  },

  create: async (data: { name: string; description?: string; mode: string }): Promise<Swarm> => {
    await delay(MOCK_DELAY);
    const newSwarm: Swarm = {
      id: `swarm_${Date.now()}`,
      name: data.name,
      description: data.description,
      mode: data.mode as any,
      createdBy: "user_1",
      createdAt: Date.now() / 1000,
      updatedAt: Date.now() / 1000,
    };
    mockSwarms.push(newSwarm);
    mockMembers[newSwarm.id] = [];
    mockSessions[newSwarm.id] = [];
    return newSwarm;
  },

  addMember: async (swarmId: string, data: { agentId: string; role?: string; orderIndex?: number }): Promise<SwarmMember> => {
    await delay(MOCK_DELAY);
    const newMember: SwarmMember = {
      id: `m${Date.now()}`,
      swarmId,
      agentId: data.agentId,
      role: (data.role || "member") as any,
      orderIndex: data.orderIndex || 0,
      agentName: `Agent ${mockMembers[swarmId]?.length + 1 || 1}`,
      agentColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
    };
    if (!mockMembers[swarmId]) mockMembers[swarmId] = [];
    mockMembers[swarmId].push(newMember);
    return newMember;
  },

  removeMember: async (swarmId: string, memberId: string): Promise<{ ok: boolean }> => {
    await delay(MOCK_DELAY);
    if (mockMembers[swarmId]) {
      mockMembers[swarmId] = mockMembers[swarmId].filter((m) => m.id !== memberId);
    }
    return { ok: true };
  },

  listSessions: async (swarmId: string): Promise<{ sessions: SwarmSession[] }> => {
    await delay(MOCK_DELAY);
    return { sessions: mockSessions[swarmId] || [] };
  },

  createSession: async (swarmId: string, data: { mode?: string }): Promise<SwarmSession> => {
    await delay(MOCK_DELAY);
    const newSession: SwarmSession = {
      id: `session_${Date.now()}`,
      swarmId,
      sessionKey: `swarm:${swarmId}:${Date.now()}`,
      mode: (data.mode || "roundtable") as any,
      status: "active",
      contextSharing: true,
      createdBy: "user_1",
      createdAt: Date.now() / 1000,
      updatedAt: Date.now() / 1000,
    };
    if (!mockSessions[swarmId]) mockSessions[swarmId] = [];
    mockSessions[swarmId].push(newSession);
    return newSession;
  },
};

// Mock auth API
export const mockAuthApi = {
  me: async () => ({
    id: "user_1",
    email: "demo@botschat.app",
    displayName: "Demo User",
    settings: {},
  }),
};

// Mock agents API
export const mockAgentsApi = {
  list: async () => ({
    agents: [
      { id: "agent_1", name: "Researcher", sessionKey: "agent:1", isDefault: false, channelId: null },
      { id: "agent_2", name: "Analyst", sessionKey: "agent:2", isDefault: false, channelId: null },
      { id: "agent_3", name: "Skeptic", sessionKey: "agent:3", isDefault: false, channelId: null },
      { id: "agent_4", name: "Debugger", sessionKey: "agent:4", isDefault: false, channelId: null },
      { id: "agent_5", name: "Creative", sessionKey: "agent:5", isDefault: false, channelId: null },
    ],
  }),
};

// Enable/disable mock mode
export const USE_MOCK_API = true;