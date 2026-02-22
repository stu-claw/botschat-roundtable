import React, { useEffect, useState, useCallback } from "react";
import { useAppState, useAppDispatch } from "./store";
import { randomUUID } from "./utils/uuid";

export function DeckView() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  // Example state: each agent has an independent conversation thread
  const deckAgents = state.deckAgents;

  // Local input states per agent sessionKey
  const [inputs, setInputs] = useState<Record<string, string>>({});

  // Get messages filtered per sessionKey
  function getMessagesForSession(sessionKey: string) {
    return state.messages.filter(m => m.sessionKey === sessionKey && !m.threadId);
  }

  // Send message for a specific agent session
  const sendMessage = useCallback((sessionKey: string) => {
    const text = inputs[sessionKey]?.trim();
    if (!text) return;
    const msg = {
      type: "swarm.message",
      sessionKey,
      text,
    };
    window.dispatchEvent(new CustomEvent("botschat:sendSwarmMessage", { detail: msg }));
    // Clear input after sending
    setInputs(prev => ({ ...prev, [sessionKey]: "" }));
  }, [inputs]);

  // Handler for Enter key send
  const handleKeyDown = (sessionKey: string, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(sessionKey);
    }
  };

  return (
    <div className="flex h-full gap-4 p-2 overflow-x-auto">
      {deckAgents.map((agent) => {
        const msgs = getMessagesForSession(agent.sessionKey);
        return (
          <div key={agent.sessionKey} className="flex flex-col bg-gray-800 p-2 rounded w-80 flex-shrink-0">
            <div className="font-bold text-white mb-2">{agent.name}</div>
            <div className="flex-1 overflow-y-auto mb-2 h-64 bg-gray-900 p-2 rounded">
              {msgs.length === 0 ? (
                <div className="text-gray-500 text-sm">No messages yet</div>
              ) : (
                msgs.map((msg) => (
                  <div key={msg.id} className="mb-1 p-1 rounded bg-gray-700 text-white whitespace-pre-wrap break-words">
                    {msg.text}
                  </div>
                ))
              )}
            </div>
            <textarea
              className="w-full rounded p-1 bg-gray-700 text-white resize-none h-16"
              placeholder={`Message ${agent.name}`}
              value={inputs[agent.sessionKey] || ""}
              onChange={(e) => setInputs(prev => ({ ...prev, [agent.sessionKey]: e.target.value }))}
              onKeyDown={(e) => handleKeyDown(agent.sessionKey, e)}
            />
          </div>
        );
      })}
    </div>
  );
}

export default DeckView;
