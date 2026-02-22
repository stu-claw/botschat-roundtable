import fetch from 'node-fetch';
import { getMessagesBySession, MessageModel } from '../db';
import WebSocket from 'ws';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface Agent {
  id: string;
  role: 'leader' | 'member';
  personality: string;
}

const SYSTEM_PROMPTS: { [role: string]: string } = {
  leader: `You are the leader of the swarm, acting as a coordinator and synthesizer of information. You help guide the conversation and ensure all perspectives are considered.`,
  member: `You are a specialist member of the swarm with unique expertise. Provide detailed, thoughtful responses based on your knowledge domain.`,
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'anthropic/claude-3.5-sonnet';
const FALLBACK_MODEL = 'openai/gpt-4o-mini';

export class AgentManager {
  async processRoundTableMessage(
    swarmId: string,
    sessionId: string,
    userMessage: string,
    wsClients: Map<string, WebSocket>
  ): Promise<void> {
    // Get conversation context - last 10 messages
    const history = await getMessagesBySession(parseInt(sessionId), 10);

    // Mock agents for now - in production, fetch from database
    const agents: Agent[] = [
      { id: 'agent_1', role: 'leader', personality: SYSTEM_PROMPTS.leader },
      { id: 'agent_2', role: 'member', personality: SYSTEM_PROMPTS.member },
      { id: 'agent_3', role: 'member', personality: SYSTEM_PROMPTS.member },
    ];

    // Process all agents in parallel
    await Promise.all(
      agents.map(agent => 
        this.streamAgentResponse(agent, sessionId, userMessage, history, wsClients.get(agent.id), wsClients)
      )
    );
  }

  async processDeckMessage(
    agentId: string,
    sessionId: string,
    userMessage: string,
    wsClient: WebSocket
  ): Promise<void> {
    const history = await getMessagesBySession(parseInt(sessionId), 10);
    const agent: Agent = { id: agentId, role: 'member', personality: SYSTEM_PROMPTS.member };
    await this.streamAgentResponse(agent, sessionId, userMessage, history, wsClient);
  }

  private async streamAgentResponse(
    agent: Agent,
    sessionId: string,
    userMessage: string,
    history: any[],
    wsClient?: WebSocket,
    wsClients?: Map<string, WebSocket>
  ): Promise<void> {
    if (!wsClient) {
      console.log(`No WebSocket client for agent ${agent.id}`);
      return;
    }

    // Build messages for OpenRouter
    const messages: OpenRouterMessage[] = [
      { role: 'system', content: agent.personality }
    ];

    // Include conversation context
    for (const msg of history) {
      messages.push({ 
        role: msg.sender === 'agent' ? 'assistant' : 'user', 
        content: msg.text 
      });
    }

    // Add the new user message
    messages.push({ role: 'user', content: userMessage });

    // Prepare request
    const payload = {
      model: DEFAULT_MODEL,
      messages,
      stream: false, // Use non-streaming for simplicity
      max_tokens: 500,
    };

    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
          'X-Title': 'BotsChat RoundTable'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const text = data.choices?.[0]?.message?.content || 'No response';

      // Send response to client
      wsClient.send(JSON.stringify({
        type: 'swarm:response',
        agentId: agent.id,
        sessionId,
        text,
        done: true
      }));

      // Broadcast to all clients in swarm (for context sharing)
      if (wsClients) {
        wsClients.forEach((client, clientId) => {
          if (clientId !== agent.id && client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'swarm:agent_response',
              agentId: agent.id,
              sessionId,
              text
            }));
          }
        });
      }

      // Save to database
      await MessageModel.create(parseInt(sessionId), 'agent', text, agent.id);

    } catch (error) {
      console.error(`Error getting response for agent ${agent.id}:`, error);
      
      // Send error response
      wsClient.send(JSON.stringify({
        type: 'swarm:response',
        agentId: agent.id,
        sessionId,
        text: 'Sorry, I encountered an error processing your message.',
        done: true,
        error: true
      }));
    }
  }
}