import { randomUUID } from "./utils/uuid";
import { useAppDispatch } from "./store";

// Class to manage WebSocket connection to backend, handling reconnects and swarm events
export class BotsChatWSClient {
  url: string;
  socket: WebSocket | null = null;
  reconnectTimeout = 2000; // ms
  dispatch: React.Dispatch<any>;
  userId: string;
  sessionId: string;
  getToken: () => string | null;
  onMessageCallback: ((msg: any) => void) | null = null;
  onStatusChangeCallback: ((connected: boolean) => void) | null = null;
  isConnected: boolean = false;

  constructor(opts: {
    userId: string;
    sessionId: string;
    getToken: () => string | null;
    onMessage: (msg: any) => void;
    onStatusChange: (connected: boolean) => void;
  }) {
    this.userId = opts.userId;
    this.sessionId = opts.sessionId;
    this.getToken = opts.getToken;
    this.dispatch = useAppDispatch();
    this.onMessageCallback = opts.onMessage;
    this.onStatusChangeCallback = opts.onStatusChange;
    // Connect to OpenClaw WebSocket gateway
    this.url = "ws://127.0.0.1:18789/api/ws";

    // Bind event listener for sending swarm messages from RoundTableChat
    window.addEventListener("botschat:sendSwarmMessage", (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (this.isConnected && detail) {
        this.send(detail);
      }
    });
  }

  connect() {
    const token = this.getToken();
    if (!token) return;

    const wsUrl = `${this.url}?token=${encodeURIComponent(token)}&userId=${encodeURIComponent(this.userId)}&sessionId=${encodeURIComponent(this.sessionId)}`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.isConnected = true;
      this.onStatusChangeCallback && this.onStatusChangeCallback(true);
      console.log("WebSocket connected");
    };

    this.socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (this.onMessageCallback) {
          this.onMessageCallback(msg);
        }
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    this.socket.onclose = () => {
      this.isConnected = false;
      this.onStatusChangeCallback && this.onStatusChangeCallback(false);
      console.log("WebSocket disconnected, retrying...");
      setTimeout(() => this.connect(), this.reconnectTimeout);
    };

    this.socket.onerror = (event) => {
      console.error("WebSocket error", event);
      this.socket?.close();
    };
  }

  send(msg: any) {
    if (this.isConnected && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    } else {
      console.warn("WebSocket is not open: unable to send message");
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.onStatusChangeCallback && this.onStatusChangeCallback(false);
  }
}

export default BotsChatWSClient;
