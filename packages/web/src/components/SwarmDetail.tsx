import React from "react";
import { useAppState, useAppDispatch } from "../store";
import { swarmsApi, agentsApi } from "../api";
import { dlog } from "../debug-log";

export function SwarmDetail() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [isAddingMember, setIsAddingMember] = React.useState(false);
  const [isCreatingSession, setIsCreatingSession] = React.useState(false);
  const [sessionMode, setSessionMode] = React.useState<"roundtable" | "deck">("roundtable");

  const selectedSwarm = state.swarms.find((s) => s.id === state.selectedSwarmId);

  const handleAddMember = async (agentId: string) => {
    if (!selectedSwarm) return;
    
    try {
      const member = await swarmsApi.addMember(selectedSwarm.id, {
        agentId,
        role: "member",
        orderIndex: state.swarmMembers.length,
      });
      
      dispatch({ type: "ADD_SWARM_MEMBER", member });
      setIsAddingMember(false);
    } catch (err) {
      dlog.error("Swarm", `Failed to add member: ${err}`);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedSwarm) return;
    
    try {
      await swarmsApi.removeMember(selectedSwarm.id, memberId);
      dispatch({ type: "REMOVE_SWARM_MEMBER", memberId });
    } catch (err) {
      dlog.error("Swarm", `Failed to remove member: ${err}`);
    }
  };

  const handleCreateSession = async () => {
    if (!selectedSwarm) return;
    
    try {
      const session = await swarmsApi.createSession(selectedSwarm.id, {
        mode: sessionMode,
        contextSharing: true,
      });
      
      dispatch({ type: "ADD_SWARM_SESSION", session });
      dispatch({ type: "SELECT_SWARM_SESSION", sessionId: session.id });
      
      // If deck mode, switch to deck view
      if (sessionMode === "deck") {
        dispatch({ type: "SET_ACTIVE_VIEW", view: "deck" });
      }
      
      setIsCreatingSession(false);
    } catch (err) {
      dlog.error("Swarm", `Failed to create session: ${err}`);
    }
  };

  const handleLaunchRoundTable = () => {
    dispatch({ type: "SET_ROUND_TABLE_MODE", enabled: true });
    dispatch({ type: "SET_ACTIVE_VIEW", view: "messages" });
  };

  const handleLaunchDeck = () => {
    // Set up deck agents from swarm members
    const deckAgents = state.swarmMembers.map((member, index) => ({
      agentId: member.agentId,
      sessionKey: `agent:${member.agentId}:${Date.now()}`,
      name: member.agentName || `Agent ${index + 1}`,
      color: member.agentColor || `hsl(${(index * 360) / Math.max(state.swarmMembers.length, 1)}, 70%, 50%)`,
    }));
    
    dispatch({ type: "SET_DECK_AGENTS", agents: deckAgents });
    dispatch({ type: "SET_ACTIVE_VIEW", view: "deck" });
  };

  if (!selectedSwarm) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: "var(--bg-surface)" }}>
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
            style={{ color: "var(--text-muted)" }}
          >
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m-4-4h8" />
          </svg>
          <p className="text-body font-bold" style={{ color: "var(--text-muted)" }}>
            Select a Swarm
          </p>
          <p className="text-caption mt-1" style={{ color: "var(--text-muted)" }}>
            Choose a swarm from the sidebar to manage agents
          </p>
        </div>
      </div>
    );
  }

  // Available agents that aren't already members
  const availableAgents = state.agents.filter(
    (a) => !state.swarmMembers.some((m) => m.agentId === a.id)
  );

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-surface)" }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <div>
          <h1 className="text-h1 font-bold" style={{ color: "var(--text-primary)" }}>
            {selectedSwarm.name}
          </h1>
          <p className="text-caption mt-0.5" style={{ color: "var(--text-muted)" }}>
            {selectedSwarm.description || `${selectedSwarm.mode.replace("_", " ")} mode`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCreatingSession(true)}
            className="px-4 py-2 text-caption font-bold text-white rounded flex items-center gap-2"
            style={{ background: "var(--bg-active)" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Start Session
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Quick Launch Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={handleLaunchRoundTable}
            className="p-4 rounded-lg text-left hover:opacity-90 transition-opacity"
            style={{ background: "var(--bg-active-soft)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded" style={{ background: "var(--bg-active)" }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="9" strokeWidth={2} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8" />
                </svg>
              </div>
              <span className="text-body font-bold" style={{ color: "var(--text-primary)" }}>
                Round Table
              </span>
            </div>
            <p className="text-caption" style={{ color: "var(--text-secondary)" }}>
              All agents participate in the same conversation, responding to each message
            </p>
          </button>

          <button
            onClick={handleLaunchDeck}
            className="p-4 rounded-lg text-left hover:opacity-90 transition-opacity"
            style={{ background: "var(--bg-active-soft)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded" style={{ background: "var(--bg-active)" }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <span className="text-body font-bold" style={{ color: "var(--text-primary)" }}>
                Bot Deck
              </span>
            </div>
            <p className="text-caption" style={{ color: "var(--text-secondary)" }}>
              View all agents side-by-side in a multi-column layout
            </p>
          </button>
        </div>

        {/* Members Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-caption font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              Agents ({state.swarmMembers.length})
            </h2>
            <button
              onClick={() => setIsAddingMember(true)}
              className="text-caption flex items-center gap-1 px-2 py-1 rounded hover:bg-[--bg-hover]"
              style={{ color: "var(--bg-active)" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Agent
            </button>
          </div>

          {isAddingMember && (
            <div className="mb-3 p-3 rounded" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
              <p className="text-caption mb-2" style={{ color: "var(--text-secondary)" }}>
                Select an agent to add:
              </p>
              {availableAgents.length === 0 ? (
                <p className="text-tiny" style={{ color: "var(--text-muted)" }}>
                  No available agents. Create channels first.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableAgents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => handleAddMember(agent.id)}
                      className="px-3 py-1.5 text-caption rounded hover:opacity-80 transition-opacity"
                      style={{ background: "var(--bg-active)", color: "white" }}
                    >
                      {agent.name}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setIsAddingMember(false)}
                className="mt-2 text-tiny"
                style={{ color: "var(--text-muted)" }}
              >
                Cancel
              </button>
            </div>
          )}

          <div className="space-y-2">
            {state.swarmMembers.length === 0 ? (
              <p className="text-caption p-4 text-center rounded" style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}>
                No agents in this swarm yet. Add agents to begin.
              </p>
            ) : (
              state.swarmMembers.map((member, index) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-caption font-bold"
                      style={{
                        background: member.agentColor || `hsl(${(index * 360) / state.swarmMembers.length}, 70%, 50%)`,
                        color: "white",
                      }}
                    >
                      {member.agentName?.[0] || "A"}
                    </div>
                    <div>
                      <p className="text-caption font-medium" style={{ color: "var(--text-primary)" }}>
                        {member.agentName || `Agent ${index + 1}`}
                      </p>
                      <p className="text-tiny capitalize" style={{ color: "var(--text-muted)" }}>
                        {member.role}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-1.5 rounded hover:bg-red-500/20 hover:text-red-500 transition-colors"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sessions Section */}
        {state.swarmSessions.length > 0 && (
          <div>
            <h2 className="text-caption font-bold uppercase tracking-wide mb-3" style={{ color: "var(--text-secondary)" }}>
              Active Sessions
            </h2>
            <div className="space-y-2">
              {state.swarmSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => dispatch({ type: "SELECT_SWARM_SESSION", sessionId: session.id })}
                  className="w-full flex items-center justify-between p-3 rounded text-left hover:bg-[--bg-hover] transition-colors"
                  style={{
                    background: state.selectedSwarmSessionId === session.id ? "var(--bg-active-soft)" : "var(--bg-input)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <p className="text-caption font-medium" style={{ color: "var(--text-primary)" }}>
                      {session.mode === "roundtable" ? "Round Table" : "Deck"} Session
                    </p>
                    <p className="text-tiny" style={{ color: "var(--text-muted)" }}>
                      {new Date(session.createdAt * 1000).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className="px-2 py-0.5 text-tiny rounded-full capitalize"
                    style={{
                      background: session.status === "active" ? "var(--success-bg)" : "var(--bg-hover)",
                      color: session.status === "active" ? "var(--success)" : "var(--text-muted)",
                    }}
                  >
                    {session.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      {isCreatingSession && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setIsCreatingSession(false)}
        >
          <div
            className="rounded-lg p-6 w-96"
            style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-h1 font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              Start Swarm Session
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-caption font-bold mb-2" style={{ color: "var(--text-secondary)" }}>
                  Session Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSessionMode("roundtable")}
                    className="p-3 rounded text-left border-2 transition-all"
                    style={{
                      borderColor: sessionMode === "roundtable" ? "var(--bg-active)" : "var(--border)",
                      background: sessionMode === "roundtable" ? "var(--bg-active-soft)" : "var(--bg-input)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <circle cx="12" cy="12" r="9" strokeWidth={2} />
                      </svg>
                      <span className="text-caption font-medium" style={{ color: "var(--text-primary)" }}>
                        Round Table
                      </span>
                    </div>
                    <p className="text-tiny" style={{ color: "var(--text-muted)" }}>
                      Collaborative discussion
                    </p>
                  </button>
                  
                  <button
                    onClick={() => setSessionMode("deck")}
                    className="p-3 rounded text-left border-2 transition-all"
                    style={{
                      borderColor: sessionMode === "deck" ? "var(--bg-active)" : "var(--border)",
                      background: sessionMode === "deck" ? "var(--bg-active-soft)" : "var(--bg-input)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                      </svg>
                      <span className="text-caption font-medium" style={{ color: "var(--text-primary)" }}>
                        Bot Deck
                      </span>
                    </div>
                    <p className="text-tiny" style={{ color: "var(--text-muted)" }}>
                      Side-by-side view
                    </p>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreateSession}
                className="flex-1 px-4 py-2 text-caption font-bold text-white rounded"
                style={{ background: "var(--bg-active)" }}
              >
                Start Session
              </button>
              <button
                onClick={() => setIsCreatingSession(false)}
                className="px-4 py-2 text-caption rounded"
                style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}