import React from "react";
import { useAppState, useAppDispatch } from "../store";
import { swarmsApi } from "../api";
import { dlog } from "../debug-log";

export function SwarmSidebar() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [isCreating, setIsCreating] = React.useState(false);
  const [newSwarmName, setNewSwarmName] = React.useState("");
  const [newSwarmMode, setNewSwarmMode] = React.useState<"roundtable" | "divide_conquer" | "panel">("roundtable");

  const handleSelectSwarm = (swarmId: string) => {
    dlog.info("Swarm", `Selected swarm: ${swarmId}`);
    dispatch({ type: "SELECT_SWARM", swarmId });
    
    // Load swarm details
    swarmsApi.get(swarmId).then(({ swarm, members }) => {
      dispatch({ type: "SET_SWARM_MEMBERS", members });
    }).catch((err) => {
      dlog.error("Swarm", `Failed to load swarm details: ${err}`);
    });

    // Load swarm sessions
    swarmsApi.listSessions(swarmId).then(({ sessions }) => {
      dispatch({ type: "SET_SWARM_SESSIONS", sessions });
    }).catch((err) => {
      dlog.error("Swarm", `Failed to load swarm sessions: ${err}`);
    });
  };

  const handleCreateSwarm = async () => {
    if (!newSwarmName.trim()) return;
    
    try {
      const swarm = await swarmsApi.create({
        name: newSwarmName.trim(),
        mode: newSwarmMode,
      });
      
      dispatch({ type: "SET_SWARMS", swarms: [...state.swarms, swarm] });
      setNewSwarmName("");
      setIsCreating(false);
      
      // Select the new swarm
      handleSelectSwarm(swarm.id);
    } catch (err) {
      dlog.error("Swarm", `Failed to create swarm: ${err}`);
    }
  };

  const getSwarmIcon = (mode: string) => {
    switch (mode) {
      case "roundtable":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="9" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8" />
          </svg>
        );
      case "divide_conquer":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case "panel":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="9" strokeWidth={2} />
          </svg>
        );
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-surface)" }}>
      {/* Header */}
      <div className="flex items-center justify-between p-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <h2 className="text-caption font-bold" style={{ color: "var(--text-primary)" }}>
          Swarms
        </h2>
        <button
          onClick={() => setIsCreating(true)}
          className="p-1.5 rounded hover:bg-[--bg-hover] transition-colors"
          style={{ color: "var(--text-muted)" }}
          title="Create Swarm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Create Swarm Form */}
      {isCreating && (
        <div className="p-3 space-y-2" style={{ borderBottom: "1px solid var(--border)" }}>
          <input
            type="text"
            value={newSwarmName}
            onChange={(e) => setNewSwarmName(e.target.value)}
            placeholder="Swarm name..."
            className="w-full px-2 py-1.5 text-caption rounded"
            style={{ 
              background: "var(--bg-input)", 
              border: "1px solid var(--border)",
              color: "var(--text-primary)"
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateSwarm();
              if (e.key === "Escape") setIsCreating(false);
            }}
            autoFocus
          />
          <select
            value={newSwarmMode}
            onChange={(e) => setNewSwarmMode(e.target.value as typeof newSwarmMode)}
            className="w-full px-2 py-1.5 text-caption rounded"
            style={{ 
              background: "var(--bg-input)", 
              border: "1px solid var(--border)",
              color: "var(--text-primary)"
            }}
          >
            <option value="roundtable">Round Table</option>
            <option value="divide_conquer">Divide & Conquer</option>
            <option value="panel">Panel</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleCreateSwarm}
              className="flex-1 px-3 py-1.5 text-caption font-bold text-white rounded"
              style={{ background: "var(--bg-active)" }}
            >
              Create
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 text-caption rounded"
              style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Swarm List */}
      <div className="flex-1 overflow-y-auto">
        {state.swarms.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-tiny" style={{ color: "var(--text-muted)" }}>
              No swarms yet.
            </p>
            <p className="text-tiny mt-1" style={{ color: "var(--text-muted)" }}>
              Create one to start multi-agent conversations.
            </p>
          </div>
        ) : (
          state.swarms.map((swarm) => (
            <button
              key={swarm.id}
              onClick={() => handleSelectSwarm(swarm.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[--bg-hover] transition-colors"
              style={{
                background: state.selectedSwarmId === swarm.id ? "var(--bg-active-soft)" : undefined,
                borderLeft: state.selectedSwarmId === swarm.id ? "3px solid var(--bg-active)" : "3px solid transparent",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>
                {getSwarmIcon(swarm.mode)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-caption font-medium truncate" style={{ color: "var(--text-primary)" }}>
                  {swarm.name}
                </p>
                <p className="text-tiny capitalize" style={{ color: "var(--text-muted)" }}>
                  {swarm.mode.replace("_", " ")}
                  {swarm.members?.length ? ` • ${swarm.members.length} agents` : ""}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-2" style={{ borderTop: "1px solid var(--border)" }}>
        <button
          onClick={() => dispatch({ type: "SET_ACTIVE_VIEW", view: "deck" })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-left hover:bg-[--bg-hover] transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span className="text-caption">Bot Deck</span>
        </button>
      </div>
    </div>
  );
}