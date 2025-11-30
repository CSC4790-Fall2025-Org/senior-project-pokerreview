import { TableData } from './api/table';

type MessageHandler = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private subscribedTables: Set<string> = new Set();

  connect(token: string) {
    console.log('🔌 WebSocket connect() called');
    console.log('🔍 Current ws state:', this.ws?.readyState);
    console.log('🔍 WebSocket.OPEN =', WebSocket.OPEN);
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('⚠️ WebSocket already open, skipping connection');
      return;
    }

    // For local development, always use ws:// (non-secure)
    // For actual production deployment, this will use wss:// with the domain
    const wsUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'ws://localhost:3001'
      : `wss://${window.location.host}`;
    console.log(`🔌 Attempting to connect to: ${wsUrl}`);
    console.log(`🔍 NODE_ENV:`, process.env.NODE_ENV);

    console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('🔌 WebSocket connected successfully');
      console.log('🔑 Authenticating with token...');
      this.reconnectAttempts = 0;
      
      // Authenticate - this will trigger 'authenticated' event
      this.send('authenticate', { token });
      
      // ✅ DON'T resubscribe here - wait for authentication to complete
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 WebSocket message received:', message);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error occurred:', error);
      console.error('❌ Error type:', error.type);
      console.error('❌ Current wsUrl:', wsUrl);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.ws = null;
      this.attemptReconnect(token);
    };
  }

  private attemptReconnect(token: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
      setTimeout(() => this.connect(token), this.reconnectDelay);
    }
  }

  private handleMessage(message: any) {
    // ✅ NEW: Handle authentication success
    if (message.type === 'authenticated') {
      console.log('✅ WebSocket authenticated, resubscribing to tables...');
      // Now resubscribe to all tables AFTER authentication
      this.subscribedTables.forEach(tableId => {
        console.log(`🔄 Resubscribing to table: ${tableId}`);
        this.send('subscribe', { tableId });
      });
    }
    
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => handler(message.data));
    }
  }

  on(event: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  subscribeToTable(tableId: string) {
    console.log('📍 subscribeToTable called for:', tableId);
    console.log('🔍 Current ws state:', this.ws?.readyState);
    console.log('🔍 WebSocket.OPEN constant:', WebSocket.OPEN);
    
    this.subscribedTables.add(tableId);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket is open, sending subscribe message');
      this.send('subscribe', { tableId });
    } else {
      console.log('⚠️ WebSocket not open yet, will subscribe after connection');
    }
  }

  unsubscribeFromTable(tableId: string) {
    this.subscribedTables.delete(tableId);
    this.send('unsubscribe', { tableId });
  }

  send(type: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  disconnect() {
    this.subscribedTables.clear();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsService = new WebSocketService();