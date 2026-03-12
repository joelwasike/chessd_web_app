const WS_BASE = 'wss://api.chessd.games/ws';

export class WebSocketService {
  constructor(path, token, onMessage) {
    this.url = `${WS_BASE}${path}?token=${token}`;
    this.onMessage = onMessage;
    this.ws = null;
    this.reconnectTimer = null;
    this.shouldReconnect = true;
  }

  connect() {
    if (this.ws) this.ws.close();
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => console.log(`WS connected: ${this.url}`);
    this.ws.onclose = () => {
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      }
    };
    this.ws.onerror = (e) => console.error('WS error', e);
    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.onMessage(msg);
      } catch (e) {
        console.error('WS parse error', e);
      }
    };
  }

  send(type, payload = {}) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  close() {
    this.shouldReconnect = false;
    clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
  }
}
