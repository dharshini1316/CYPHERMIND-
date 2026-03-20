import WebSocket from 'ws';
import { Server } from 'http';
import { validateToken } from '../utils/jwt';
import { securityEventService } from './security-event.service';
import { ISecurityEvent } from '../models/SecurityEvent';

/**
 * WebSocket client with authentication
 */
interface AuthenticatedWebSocket extends WebSocket {
  user_id?: string;
  clearance_level?: number;
  isAlive?: boolean;
}

/**
 * WebSocket Service
 * Manages real-time security event delivery to SOC Dashboard
 */
export class WebSocketService {
  private wss: WebSocket.Server | null = null;
  private changeStream: any = null;

  /**
   * Initialize WebSocket server
   * @param server - HTTP server instance
   */
  initialize(server: Server): void {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/events',
    });

    console.log('🔌 WebSocket server initialized on /ws/events');

    // Handle new connections
    this.wss.on('connection', this.handleConnection.bind(this));

    // Set up heartbeat to detect dead connections
    this.setupHeartbeat();

    // Set up MongoDB Change Stream
    this.setupChangeStream();
  }

  /**
   * Handle new WebSocket connection
   * @param ws - WebSocket connection
   * @param req - HTTP request
   */
  private async handleConnection(ws: AuthenticatedWebSocket, req: any): Promise<void> {
    console.log('🔗 New WebSocket connection attempt');

    try {
      // Extract token from query string
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(1008, 'Authentication required');
        console.warn('❌ WebSocket connection rejected: No token provided');
        return;
      }

      // Verify JWT token
      const payload = validateToken(token);

      // Check if user has Security_Admin role (clearance level 3)
      if (payload.clearance_level < 3) {
        ws.close(1008, 'Insufficient clearance level');
        console.warn(`❌ WebSocket connection rejected: User ${payload.user_id} has insufficient clearance`);
        return;
      }

      // Attach user info to WebSocket
      ws.user_id = payload.user_id;
      ws.clearance_level = payload.clearance_level;
      ws.isAlive = true;

      console.log(`✅ WebSocket authenticated: User ${payload.user_id} (clearance ${payload.clearance_level})`);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to security event stream',
        timestamp: new Date().toISOString(),
      }));

      // Handle pong responses for heartbeat
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle client messages
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('📨 WebSocket message received:', data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        console.log(`🔌 WebSocket disconnected: User ${ws.user_id}`);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

    } catch (error) {
      console.error('WebSocket authentication failed:', error);
      ws.close(1008, 'Authentication failed');
    }
  }

  /**
   * Set up heartbeat to detect dead connections
   */
  private setupHeartbeat(): void {
    if (!this.wss) return;

    const interval = setInterval(() => {
      if (!this.wss) {
        clearInterval(interval);
        return;
      }

      this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
        if (ws.isAlive === false) {
          console.log(`💀 Terminating dead connection: User ${ws.user_id}`);
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // Check every 30 seconds
  }

  /**
   * Set up MongoDB Change Stream to listen for new security events
   */
  private setupChangeStream(): void {
    try {
      this.changeStream = securityEventService.streamEvents();

      this.changeStream.on('change', (change: any) => {
        if (change.operationType === 'insert') {
          const event = change.fullDocument as ISecurityEvent;
          this.broadcastEvent(event);
        }
      });

      this.changeStream.on('error', (error: Error) => {
        console.error('Change stream error:', error);
        // Don't retry in test environment (mongodb-memory-server doesn't support replica sets)
        if (process.env.NODE_ENV !== 'test') {
          // Attempt to reconnect after 5 seconds
          setTimeout(() => {
            console.log('🔄 Attempting to reconnect change stream...');
            this.setupChangeStream();
          }, 5000);
        }
      });

      console.log('📡 MongoDB Change Stream connected');
    } catch (error) {
      console.error('Failed to set up change stream:', error);
    }
  }

  /**
   * Broadcast security event to all connected clients
   * @param event - Security event to broadcast
   */
  private broadcastEvent(event: ISecurityEvent): void {
    if (!this.wss) return;

    const message = JSON.stringify({
      type: 'security_event',
      data: event,
      timestamp: new Date().toISOString(),
    });

    let sentCount = 0;

    this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (ws.readyState === WebSocket.OPEN && ws.user_id) {
        ws.send(message);
        sentCount++;
      }
    });

    if (sentCount > 0) {
      console.log(`📤 Broadcast event to ${sentCount} client(s): ${event.type}`);
    }
  }

  /**
   * Manually trigger event broadcast (for testing)
   * @param event - Security event to broadcast
   */
  triggerEvent(event: ISecurityEvent): void {
    this.broadcastEvent(event);
  }

  /**
   * Close WebSocket server and change stream
   */
  close(): void {
    if (this.changeStream) {
      this.changeStream.close();
      console.log('🔌 Change stream closed');
    }

    if (this.wss) {
      this.wss.close();
      console.log('🔌 WebSocket server closed');
    }
  }
}

export const websocketService = new WebSocketService();
