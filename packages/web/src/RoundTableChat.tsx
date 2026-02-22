import React, { useEffect, useState, useCallback } from "react";
import { useAppState, useAppDispatch } from "./store";
import { randomUUID } from "./utils/uuid";

export function RoundTableChat() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const [inputText, setInputText] = useState("");

  // Filter messages to current swarm session with no threads
  const messages = state.messages.filter(m => !m.threadId);

  // Helper: send message to all agents in swarm
  const sendMessageToSwarm = useCallback(() => {
    if (!inputText.trim()) return;
    // Prepare message WS event for each agent in current swarm session
    // Simplified: Sending message once for the selected session and relying on backend swarm fanout
    // To do: We need sendMessage function injected or accessible via context or props
    const msg = {
      type: "swarm.message",
      sessionKey: state.selectedSessionKey,
      text: inputText.trim(),
    };
    // This example assumes a global sendMessage() function is accessible
    // Since we don't have access here, dispatch a custom action or invoke external WS send
    window.dispatchEvent(new CustomEvent("botschat:sendSwarmMessage", { detail: msg }));
    setInputText("");
  }, [inputText, state.selectedSessionKey]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessageToSwarm();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ backgroundColor: "var(--bg-surface)" }}>
        {messages.map(msg => (
          <div key={msg.id} className="flex items-start space-x-2">
            <div>
              <div
                className={`w-8 h-8 rounded-full text-xs flex items-center justify-center font-bold text-white select-none`
                  + (msg.sender === "user" ? " bg-blue-600" : " bg-green-600")}
                title={msg.sender === "user" ? "User" : "Agent"}
              >
                {msg.sender === "user" ? "U" : "A"}
              </div>
            </div>
            <div className="rounded-md p-2 bg-gray-700 text-white max-w-xl whitespace-pre-wrap break-words">
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div className="p-2 border-t border-gray-600">
        <textarea
          className="w-full p-2 rounded bg-gray-800 text-white resize-none h-20"
          placeholder="Type a message and hit Enter to send"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleInputKeyDown}
        />
      </div>
    </div>
  );
}

export default RoundTableChat;
