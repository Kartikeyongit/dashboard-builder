// frontend/src/api/websocket.ts

type MessageHandler = (data: any) => void;

// Derive WebSocket base from the API URL
// e.g. https://api.example.com/api/v1 → wss://api.example.com
function getWsBase(): string {
  const api = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
  return api.replace(/^http/, 'ws').replace(/\/api\/v1$/, '');
}

class DashboardSocket {
  private ws: WebSocket | null = null;
  private dashboardId: string | null = null;
  private handlers: Map<string, MessageHandler> = new Map();
  private reconnectTimer: any;
  private url: string = '';
  private isShare: boolean = false;

  /** Connect for an authenticated dashboard editor */
  connect(dashboardId: string) {
    this.dashboardId = dashboardId;
    this.isShare = false;
    const token = localStorage.getItem('access_token');
    const wsBase = getWsBase();
    this.url = `${wsBase}/api/v1/ws?token=${token}`;
    this.connectInternal();
  }

  /** Connect for a shared (read‑only) dashboard viewer */
  connectForShare(token: string) {
    this.isShare = true;
    const wsBase = getWsBase();
    this.url = `${wsBase}/api/v1/ws/share?token=${token}`;
    this.connectInternal();
  }

  private connectInternal() {
    // Close any existing connection
    if (this.ws) {
      this.ws.onclose = null; // prevent reconnect from old connection
      this.ws.close();
    }

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WS connected');
      // For editor connections, subscribe to the specific dashboard
      if (!this.isShare && this.dashboardId) {
        this.sendMessage({ type: 'subscribe', dashboard_id: this.dashboardId });
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handlers.forEach(handler => handler(msg));
      } catch (err) {
        console.error('WS message parse error', err);
      }
    };

    this.ws.onclose = () => {
      console.log('WS disconnected, reconnecting...');
      // Reconnect after 3 seconds
      this.reconnectTimer = setTimeout(() => this.connectInternal(), 3000);
    };

    this.ws.onerror = (err) => console.error('WS error', err);
  }

  /** Send an unsubscribe message and close the connection */
  disconnect() {
    if (this.dashboardId && !this.isShare) {
      this.sendMessage({ type: 'unsubscribe', dashboard_id: this.dashboardId });
    }
    if (this.ws) {
      this.ws.onclose = null; // avoid auto‑reconnect
      this.ws.close();
      this.ws = null;
    }
    clearTimeout(this.reconnectTimer);
  }

  /** Register a handler for incoming messages */
  onMessage(handler: MessageHandler): () => void {
    const id = Math.random().toString(36).substring(2);
    this.handlers.set(id, handler);
    return () => this.handlers.delete(id);
  }

  private sendMessage(msg: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}

export default new DashboardSocket();