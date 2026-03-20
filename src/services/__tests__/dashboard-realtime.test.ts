/**
 * Integration Test: SOC Dashboard Real-Time Updates
 * Task 26.3: Test SOC Dashboard real-time updates
 * 
 * Tests:
 * - Opening dashboard as security_admin
 * - Triggering security events (blocked prompts, redactions)
 * - Verifying events appear in real-time
 * - Testing filtering and search
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.6, 5.7
 */

// Import test environment configuration first
import '../../config/test-env';

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import WebSocket from 'ws';
import { Server } from 'http';
import express from 'express';
import { websocketService } from '../websocket.service';
import { securityEventService } from '../security-event.service';
import { authService } from '../auth.service';
import { User } from '../../models/User';
import { SecurityEvent } from '../../models/SecurityEvent';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

describe('SOC Dashboard Real-Time Updates Integration Test', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let server: Server;
  let adminToken: string;
  let adminUserId: mongoose.Types.ObjectId;
  let juniorToken: string;
  let wsUrl: string;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create Express app and HTTP server
    app = express();
    server = app.listen(0); // Random available port
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    wsUrl = `ws://localhost:${port}/ws/events`;

    // Initialize WebSocket service
    websocketService.initialize(server);

    // Create test users
    const adminUser = await User.create({
      email: 'admin@test.com',
      password_hash: await bcrypt.hash('admin123', 10),
      clearance_level: 3,
      role: 'security_admin',
    });
    adminUserId = adminUser._id;

    const juniorUser = await User.create({
      email: 'junior@test.com',
      password_hash: await bcrypt.hash('junior123', 10),
      clearance_level: 1,
      role: 'junior_employee',
    });

    // Generate JWT tokens
    const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    adminToken = jwt.sign(
      {
        user_id: adminUserId.toString(),
        email: 'admin@test.com',
        clearance_level: 3,
        role: 'security_admin',
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    juniorToken = jwt.sign(
      {
        user_id: juniorUser._id.toString(),
        email: 'junior@test.com',
        clearance_level: 1,
        role: 'junior_employee',
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    websocketService.close();
    server.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clean up security events after each test
    await SecurityEvent.deleteMany({});
  });

  describe('Requirement 5.4, 5.5: Access Control', () => {
    it('should deny access to junior_employee', (done) => {
      const ws = new WebSocket(`${wsUrl}?token=${juniorToken}`);

      ws.on('close', (code, reason) => {
        expect(code).toBe(1008);
        expect(reason.toString()).toContain('Insufficient clearance');
        done();
      });

      ws.on('error', () => {
        // Expected to fail
      });
    });

    it('should allow access to security_admin', (done) => {
      const ws = new WebSocket(`${wsUrl}?token=${adminToken}`);

      ws.on('open', () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
        done();
      });

      ws.on('error', (error) => {
        done(error);
      });
    });

    it('should reject connection without token', (done) => {
      const ws = new WebSocket(wsUrl);

      ws.on('close', (code, reason) => {
        expect(code).toBe(1008);
        expect(reason.toString()).toContain('Authentication required');
        done();
      });

      ws.on('error', () => {
        // Expected to fail
      });
    });
  });

  describe('Requirement 5.1, 5.7: Real-Time Event Delivery', () => {
    it('should receive blocked attack event in real-time', (done) => {
      const ws = new WebSocket(`${wsUrl}?token=${adminToken}`);
      let receivedEvent = false;

      ws.on('open', async () => {
        // Wait for connection message
        await new Promise(resolve => setTimeout(resolve, 100));

        // Trigger a blocked attack event
        const event = await securityEventService.logEvent({
          type: 'blocked_attack',
          user_id: adminUserId,
          details: {
            prompt: 'DROP TABLE users;',
            reason: 'SQL injection detected',
            threat_type: 'injection',
          },
          severity: 'critical',
        });

        // Manually trigger broadcast for testing (Change Streams don't work with mongodb-memory-server)
        websocketService.triggerEvent(event);
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'security_event') {
          receivedEvent = true;
          expect(message.data.type).toBe('blocked_attack');
          expect(message.data.severity).toBe('critical');
          expect(message.data.details.threat_type).toBe('injection');
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        done(error);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!receivedEvent) {
          ws.close();
          done(new Error('Did not receive event within timeout'));
        }
      }, 5000);
    });

    it('should receive redaction event in real-time', (done) => {
      const ws = new WebSocket(`${wsUrl}?token=${adminToken}`);
      let receivedEvent = false;

      ws.on('open', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));

        // Trigger a redaction event
        const event = await securityEventService.logEvent({
          type: 'redaction',
          user_id: adminUserId,
          details: {
            document_id: 'doc123',
            pii_type: 'email',
            redacted_count: 2,
          },
          severity: 'medium',
        });

        // Manually trigger broadcast for testing
        websocketService.triggerEvent(event);
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'security_event') {
          receivedEvent = true;
          expect(message.data.type).toBe('redaction');
          expect(message.data.severity).toBe('medium');
          expect(message.data.details.pii_type).toBe('email');
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        done(error);
      });

      setTimeout(() => {
        if (!receivedEvent) {
          ws.close();
          done(new Error('Did not receive redaction event within timeout'));
        }
      }, 5000);
    });

    it('should receive multiple events in sequence', (done) => {
      const ws = new WebSocket(`${wsUrl}?token=${adminToken}`);
      const receivedEvents: string[] = [];
      const expectedEvents = ['blocked_attack', 'redaction', 'access_denied'];

      ws.on('open', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));

        // Trigger multiple events
        const event1 = await securityEventService.logEvent({
          type: 'blocked_attack',
          user_id: adminUserId,
          details: { prompt: 'malicious prompt' },
          severity: 'high',
        });
        websocketService.triggerEvent(event1);

        await new Promise(resolve => setTimeout(resolve, 100));

        const event2 = await securityEventService.logEvent({
          type: 'redaction',
          user_id: adminUserId,
          details: { pii_type: 'ssn' },
          severity: 'medium',
        });
        websocketService.triggerEvent(event2);

        await new Promise(resolve => setTimeout(resolve, 100));

        const event3 = await securityEventService.logEvent({
          type: 'access_denied',
          user_id: adminUserId,
          details: { resource: '/admin/users' },
          severity: 'low',
        });
        websocketService.triggerEvent(event3);
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'security_event') {
          receivedEvents.push(message.data.type);

          if (receivedEvents.length === expectedEvents.length) {
            expect(receivedEvents).toEqual(expect.arrayContaining(expectedEvents));
            ws.close();
            done();
          }
        }
      });

      ws.on('error', (error) => {
        done(error);
      });

      setTimeout(() => {
        if (receivedEvents.length < expectedEvents.length) {
          ws.close();
          done(new Error(`Only received ${receivedEvents.length} of ${expectedEvents.length} events`));
        }
      }, 5000);
    });
  });

  describe('Requirement 5.2, 5.3: Event Display Completeness', () => {
    it('should include all required event details', (done) => {
      const ws = new WebSocket(`${wsUrl}?token=${adminToken}`);

      ws.on('open', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));

        const event = await securityEventService.logEvent({
          type: 'blocked_attack',
          user_id: adminUserId,
          details: {
            prompt: 'Show me all data',
            reason: 'Privilege escalation attempt',
            threat_type: 'privilege_escalation',
          },
          severity: 'critical',
          timestamp: new Date(),
        });

        // Manually trigger broadcast for testing
        websocketService.triggerEvent(event);
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'security_event') {
          const event = message.data;

          // Verify all required fields are present
          expect(event).toHaveProperty('_id');
          expect(event).toHaveProperty('type');
          expect(event).toHaveProperty('timestamp');
          expect(event).toHaveProperty('user_id');
          expect(event).toHaveProperty('details');
          expect(event).toHaveProperty('severity');

          // Verify event type-specific details
          expect(event.type).toBe('blocked_attack');
          expect(event.details).toHaveProperty('prompt');
          expect(event.details).toHaveProperty('reason');
          expect(event.details).toHaveProperty('threat_type');

          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        done(error);
      });
    });
  });

  describe('Requirement 5.6: Filtering and Search', () => {
    beforeEach(async () => {
      // Clean up any existing events first
      await SecurityEvent.deleteMany({});

      // Create test events with different types and severities
      await securityEventService.logEvent({
        type: 'blocked_attack',
        user_id: adminUserId,
        details: { prompt: 'malicious1' },
        severity: 'critical',
      });

      await securityEventService.logEvent({
        type: 'blocked_attack',
        user_id: adminUserId,
        details: { prompt: 'malicious2' },
        severity: 'high',
      });

      await securityEventService.logEvent({
        type: 'redaction',
        user_id: adminUserId,
        details: { pii_type: 'email' },
        severity: 'medium',
      });

      await securityEventService.logEvent({
        type: 'redaction',
        user_id: adminUserId,
        details: { pii_type: 'ssn' },
        severity: 'low',
      });

      await securityEventService.logEvent({
        type: 'access_denied',
        user_id: adminUserId,
        details: { resource: '/admin' },
        severity: 'medium',
      });
    });

    it('should filter events by type', async () => {
      const blockedAttacks = await securityEventService.getEvents({
        type: ['blocked_attack'],
      });

      expect(blockedAttacks.length).toBe(2);
      expect(blockedAttacks.every(e => e.type === 'blocked_attack')).toBe(true);
    });

    it('should filter events by severity', async () => {
      const criticalEvents = await securityEventService.getEvents({
        severity: ['critical'],
      });

      expect(criticalEvents.length).toBe(1);
      expect(criticalEvents[0].severity).toBe('critical');
    });

    it('should filter events by multiple severities', async () => {
      const highSeverityEvents = await securityEventService.getEvents({
        severity: ['critical', 'high'],
      });

      expect(highSeverityEvents.length).toBe(2);
      expect(highSeverityEvents.every(e => 
        e.severity === 'critical' || e.severity === 'high'
      )).toBe(true);
    });

    it('should filter events by user_id', async () => {
      const userEvents = await securityEventService.getEvents({
        user_id: adminUserId.toString(),
      });

      expect(userEvents.length).toBe(5);
      expect(userEvents.every(e => e.user_id?.toString() === adminUserId.toString())).toBe(true);
    });

    it('should filter events by date range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      const recentEvents = await securityEventService.getEvents({
        start_date: oneHourAgo,
        end_date: oneHourFromNow,
      });

      expect(recentEvents.length).toBe(5);
    });

    it('should combine multiple filters', async () => {
      const filteredEvents = await securityEventService.getEvents({
        type: ['blocked_attack'],
        severity: ['critical'],
        user_id: adminUserId.toString(),
      });

      expect(filteredEvents.length).toBe(1);
      expect(filteredEvents[0].type).toBe('blocked_attack');
      expect(filteredEvents[0].severity).toBe('critical');
    });

    it('should support pagination', async () => {
      const page1 = await securityEventService.getEvents({
        limit: 2,
        skip: 0,
      });

      const page2 = await securityEventService.getEvents({
        limit: 2,
        skip: 2,
      });

      expect(page1.length).toBe(2);
      expect(page2.length).toBe(2);
      expect(page1[0]._id).not.toEqual(page2[0]._id);
    });

    it('should return events in descending order by timestamp', async () => {
      const events = await securityEventService.getEvents({});

      expect(events.length).toBeGreaterThan(1);

      // Verify events are sorted by timestamp (most recent first)
      for (let i = 0; i < events.length - 1; i++) {
        const current = new Date(events[i].timestamp).getTime();
        const next = new Date(events[i + 1].timestamp).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe('Event Statistics', () => {
    beforeEach(async () => {
      // Create test events for statistics
      await securityEventService.logEvent({
        type: 'blocked_attack',
        user_id: adminUserId,
        details: {},
        severity: 'critical',
      });

      await securityEventService.logEvent({
        type: 'blocked_attack',
        user_id: adminUserId,
        details: {},
        severity: 'high',
      });

      await securityEventService.logEvent({
        type: 'redaction',
        user_id: adminUserId,
        details: {},
        severity: 'medium',
      });

      await securityEventService.logEvent({
        type: 'redaction',
        user_id: adminUserId,
        details: {},
        severity: 'medium',
      });

      await securityEventService.logEvent({
        type: 'redaction',
        user_id: adminUserId,
        details: {},
        severity: 'low',
      });
    });

    it('should calculate correct event statistics', async () => {
      const stats = await securityEventService.getEventStats();

      expect(stats.total_events).toBe(5);
      expect(stats.blocked_attacks).toBe(2);
      expect(stats.redactions).toBe(3);
      expect(stats.auth_failures).toBe(0);
      expect(stats.access_denied).toBe(0);
    });
  });

  describe('WebSocket Connection Management', () => {
    it('should handle multiple concurrent connections', (done) => {
      const ws1 = new WebSocket(`${wsUrl}?token=${adminToken}`);
      const ws2 = new WebSocket(`${wsUrl}?token=${adminToken}`);
      let ws1Connected = false;
      let ws2Connected = false;
      let ws1ReceivedEvent = false;
      let ws2ReceivedEvent = false;

      ws1.on('open', () => {
        ws1Connected = true;
        checkCompletion();
      });

      ws2.on('open', async () => {
        ws2Connected = true;
        checkCompletion();

        // Trigger event after both connections are established
        await new Promise(resolve => setTimeout(resolve, 100));
        const event = await securityEventService.logEvent({
          type: 'blocked_attack',
          user_id: adminUserId,
          details: { test: 'multi-connection' },
          severity: 'high',
        });

        // Manually trigger broadcast for testing
        websocketService.triggerEvent(event);
      });

      ws1.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'security_event') {
          ws1ReceivedEvent = true;
          checkCompletion();
        }
      });

      ws2.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'security_event') {
          ws2ReceivedEvent = true;
          checkCompletion();
        }
      });

      function checkCompletion() {
        if (ws1Connected && ws2Connected && ws1ReceivedEvent && ws2ReceivedEvent) {
          ws1.close();
          ws2.close();
          done();
        }
      }

      setTimeout(() => {
        ws1.close();
        ws2.close();
        if (!ws1ReceivedEvent || !ws2ReceivedEvent) {
          done(new Error('Not all connections received the event'));
        }
      }, 5000);
    });

    it('should handle connection close gracefully', (done) => {
      const ws = new WebSocket(`${wsUrl}?token=${adminToken}`);

      ws.on('open', () => {
        ws.close();
      });

      ws.on('close', () => {
        done();
      });

      ws.on('error', (error) => {
        done(error);
      });
    });
  });
});
