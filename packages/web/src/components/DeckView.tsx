import React, { useRef, useEffect, useState, useCallback } from "react";
import { useAppState, useAppDispatch, type ChatMessage } from "../store";
import { messagesApi, type MessageRecord } from "../api";
import { dlog } from "../debug-log";
import { E2eService } from "../e2e";
import { randomUUID } from "../utils/uuid";

// Agent column in deck view
type DeckAgent = {
  agentId: string;
  sessionKey: string;
  name: string;
  color: string;
  messages: ChatMessage[];
  isStreaming?: boolean;
  streamingText?: string;
};

// Keyboard shortcut help
const KEYBOARD_SHORTCUTS = [
  { key: "Tab", action: "Next column" },
  { key: "Shift+Tab", action: "Previous column" },
  { key: "Cmd/Ctrl+1-7", action: "Focus column 1-7" },
  { key: "Esc", action: "Exit deck view" },
];

export function DeckView() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [agents, setAgents] = useState<DeckAgent[]>([]);
  const [activeColumn, setActiveColumn] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [columnCount, setColumnCount] = useState(3);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const messagesEndRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Initialize agents from deckAgents state
  useEffect(() => {
    if (state.deckAgents.length > 0) {
      const initialAgents = state.deckAgents.slice(0, columnCount).map((da) => ({
        ...da,
        messages: [],
        isStreaming: false,
        streamingText: "",
      }));
      setAgents(initialAgents);
      
      // Load message history for each agent
      initialAgents.forEach((agent, index) => {
        loadMessages(agent.sessionKey, index);
      });
    } else {
      // Create default agents from available channels
      const defaultAgents = state.agents.slice(0, columnCount).map((a, i) => ({
        agentId: a.id,
        sessionKey: a.sessionKey,
        name: a.name,
        color: `hsl(${(i * 360) / columnCount}, 70%, 50%)`,
        messages: [] as ChatMessage[],
        isStreaming: false,
        streamingText: "",
      }));
      setAgents(defaultAgents);
    }
  }, [state.deckAgents, state.agents, columnCount]);

  // Load message history
  const loadMessages = async (sessionKey: string, agentIndex: number) => {
    if (!state.user) return;
    
    try {
      const { messages } = await messagesApi.list(state.user.id, sessionKey);
      
      // Decrypt if needed
      const decryptedMessages = await Promise.all(
        messages.map(async (m: MessageRecord) => {
          if (m.encrypted && E2eService.hasKey()) {
            try {
              const plaintext = await E2eService.decrypt(m.text, m.id);
              return { ...m, text: plaintext };
            } catch {
              return m;
            }
          }
          return m;
        })
      );

      setAgents((prev) => {
        const updated = [...prev];
        if (updated[agentIndex]) {
          updated[agentIndex] = {
            ...updated[agentIndex],
            messages: decryptedMessages.map((m) => ({
              id: m.id,
              sender: m.sender,
              text: m.text,
              timestamp: m.timestamp,
              threadId: m.threadId,
              encrypted: m.encrypted,
            })),
          };
        }
        return updated;
      });
    } catch (err) {
      dlog.error("Deck", `Failed to load messages: ${err}`);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + number to focus column
      if ((e.metaKey || e.ctrlKey) && e.key >= "1" && e.key <= "7") {
        const num = parseInt(e.key) - 1;
        if (num < agents.length) {
          e.preventDefault();
          setActiveColumn(num);
          inputRefs.current[num]?.focus();
        }
      }
      
      // Tab to navigate
      if (e.key === "Tab" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (e.shiftKey) {
          const prev = activeColumn === 0 ? agents.length - 1 : activeColumn - 1;
          setActiveColumn(prev);
          inputRefs.current[prev]?.focus();
        } else {
          const next = activeColumn === agents.length - 1 ? 0 : activeColumn + 1;
          setActiveColumn(next);
          inputRefs.current[next]?.focus();
        }
      }
      
      // Escape to exit deck view
      if (e.key === "Escape") {
        dispatch({ type: "SET_ACTIVE_VIEW", view: "messages" });
      }
      
      // ? for help
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowHelp((s) => !s);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeColumn, agents.length, dispatch]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    agents.forEach((agent, index) => {
      if (messagesEndRefs.current[index]) {
        messagesEndRefs.current[index]?.scrollIntoView({ behavior: "smooth" });
      }
    });
  }, [agents.map((a) => a.messages.length).join(",")]);

  // Send message to specific agent
  const sendMessage = useCallback((agentIndex: number, text: string) => {
    if (!text.trim() || !agents[agentIndex]) return;

    const agent = agents[agentIndex];
    const userMsg: ChatMessage = {
      id: randomUUID(),
      sender: "user",
      text: text.trim(),
      timestamp: Date.now(),
    };

    // Add user message
    setAgents((prev) => {
      const updated = [...prev];
      updated[agentIndex] = {
        ...updated[agentIndex],
        messages: [...updated[agentIndex].messages, userMsg],
      };
      return updated;
    });

    // TODO: Send via WebSocket to actual agent
    // For now, simulate response
    setAgents((prev) => {
      const updated = [...prev];
      updated[agentIndex] = {
        ...updated[agentIndex],
        isStreaming: true,
        streamingText: "",
      };
      return updated;
    });

    // Send via global sendMessage if available
    if (state.selectedSessionKey) {
      // This would integrate with the existing WS system
      dlog.info("Deck", `Sending to ${agent.name}: ${text}`);
    }
  }, [agents, state.selectedSessionKey]);

  // Column width based on count
  const getColumnWidth = () => {
    switch (columnCount) {
      case 2: return "50%";
      case 3: return "33.333%";
      case 4: return "25%";
      case 5: return "20%";
      case 6: return "16.666%";
      case 7: return "14.285%";
      default: return "33.333%";
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-surface)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-4">
          <h1 className="text-h1 font-bold" style={{ color: "var(--text-primary)" }}>
            Bot Deck
          </h1>
          
          {/* Column count selector */}
          <div className="flex items-center gap-1">
            {[2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                onClick={() => setColumnCount(n)}
                className="px-2 py-1 text-tiny rounded transition-colors"
                style={{
                  background: columnCount === n ? "var(--bg-active)" : "var(--bg-hover)",
                  color: columnCount === n ? "white" : "var(--text-muted)",
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 rounded hover:bg-[--bg-hover] transition-colors"
            style={{ color: "var(--text-muted)" }}
            title="Keyboard shortcuts (?"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          <button
            onClick={() => dispatch({ type: "SET_ACTIVE_VIEW", view: "messages" })}
            className="px-3 py-1.5 text-caption rounded flex items-center gap-1"
            style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Exit Deck
          </button>
        </div>
      </div>

      {/* Deck Columns */}
      <div className="flex-1 overflow-hidden flex">
        {agents.map((agent, index) => (
          <div
            key={agent.agentId}
            className="flex flex-col h-full"
            style={{
              width: getColumnWidth(),
              borderRight: index < agents.length - 1 ? "1px solid var(--border)" : undefined,
              background: activeColumn === index ? "var(--bg-active-soft)" : undefined,
            }}
          >
            {/* Column Header */}
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-tiny font-bold"
                  style={{ background: agent.color, color: "white" }}
                >
                  {agent.name[0]}
                </div>
                <span className="text-caption font-medium truncate" style={{ color: "var(--text-primary)" }}>
                  {agent.name}
                </span>
              </div>
              <span className="text-tiny" style={{ color: "var(--text-muted)" }}>
                Cmd+{index + 1}
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {agent.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2 rounded ${msg.sender === "user" ? "ml-4" : "mr-4"}`}
                  style={{
                    background: msg.sender === "user" ? "var(--bg-active)" : "var(--bg-input)",
                    color: msg.sender === "user" ? "white" : "var(--text-primary)",
                  }}
                >
                  <p className="text-caption">{msg.text}</p>
                  <p className="text-tiny mt-1 opacity-60">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
              
              {agent.isStreaming && (
                <div
                  className="p-2 rounded mr-4"
                  style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
                >
                  <p className="text-caption">{agent.streamingText || "Thinking..."}</p>
                  <div className="flex gap-1 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              )}
              
              <div ref={(el) => (messagesEndRefs.current[index] = el)} />
            </div>

            {/* Input */}
            <div className="p-2" style={{ borderTop: "1px solid var(--border)" }}>
              <input
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                placeholder={`Message ${agent.name}...`}
                className="w-full px-3 py-2 text-caption rounded"
                style={{
                  background: "var(--bg-input)",
                  border: activeColumn === index ? `2px solid ${agent.color}` : "1px solid var(--border)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
                onFocus={() => setActiveColumn(index)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(index, e.currentTarget.value);
                    e.currentTarget.value = "";
                  }
                }}
              />
            </div>
          </div>
        ))}

        {/* Empty state if no agents */}
        {agents.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <svg
                className="w-16 h-16 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: "var(--text-muted)" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-body font-bold" style={{ color: "var(--text-muted)" }}>
                No Agents in Deck
              </p>
              <p className="text-caption mt-1" style={{ color: "var(--text-muted)" }}>
                Create a swarm and add agents to use the deck view
              </p>
              <button
                onClick={() => dispatch({ type: "SET_ACTIVE_VIEW", view: "swarms" })}
                className="mt-4 px-4 py-2 text-caption font-bold text-white rounded"
                style={{ background: "var(--bg-active)" }}
              >
                Go to Swarms
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setShowHelp(false)}
        >
          <div
            className="rounded-lg p-6 w-80"
            style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-h1 font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              Keyboard Shortcuts
            </h2>
            
            <div className="space-y-2">
              {KEYBOARD_SHORTCUTS.map(({ key, action }) => (
                <div key={key} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                  <kbd
                    className="px-2 py-1 text-caption rounded"
                    style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
                  >
                    {key}
                  </kbd>
                  <span className="text-caption" style={{ color: "var(--text-secondary)" }}>
                    {action}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full mt-4 px-4 py-2 text-caption font-bold text-white rounded"
              style={{ background: "var(--bg-active)" }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}