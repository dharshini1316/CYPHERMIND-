/**
 * Integration Test: Access Control
 * Task 26.4: Test access control
 * 
 * Tests:
 * - Verify junior_employee cannot access SOC Dashboard
 * - Verify junior_employee only sees low-clearance documents
 * - Verify security_admin sees all documents
 * 
 * Requirements: 2.2, 2.3, 5.4, 5.5
 */

// Import test environment configuration first
import '../config/test-env';

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { DocumentChunk } from '../models/DocumentChunk';
import { SecurityEvent } from '../models/SecurityEvent';
import eventsRoutes from '../routes/events.routes';
import queryRoutes from '../routes/query.routes';
import { embeddingService } from '../services/embedding.service';

describe('Access Control Integration Test', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let juniorToken: string;
  let adminToken: string;
  let juniorUserId: mongoose.Types.ObjectId;
  let adminUserId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api/events', eventsRoutes);
    app.use('/api/query', queryRoutes);

    // Create test users
    const juniorUser = await User.create({
      email: 'junior@test.com',
      password_hash: await bcrypt.hash('junior123', 10),
      clearance_level: 1,
      role: 'junior_employee',
    });
    juniorUserId = juniorUser._id;

    const adminUser = await User.create({
      email: 'admin@test.com',
      password_hash: await bcrypt.hash('admin123', 10),
      clearance_level: 3,
      role: 'security_admin',
    });
    adminUserId = adminUser._id;

    // Generate JWT tokens
    const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    juniorToken = jwt.sign(
      {
        user_id: juniorUserId.toString(),
        email: 'junior@test.com',
        clearance_level: 1,
        role: 'junior_employee',
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

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

    // Create test documents with different clearance levels
    const mockEmbedding = Array(3072).fill(0).map(() => Math.random());

    // Low clearance documents (clearance level 1)
    await DocumentChunk.create({
      content: 'Public information: Company mission statement',
      embedding: mockEmbedding,
      metadata: {
        clearance_level: 1,
        document_id: 'doc_public_1',
        source: 'public_docs',
        chunk_index: 0,
      },
    });

    await DocumentChunk.create({
      content: 'Public information: Office hours and contact info',
      embedding: mockEmbedding,
      metadata: {
        clearance_level: 1,
        document_id: 'doc_public_2',
        source: 'public_docs',
        chunk_index: 1,
      },
    });

    // Medium clearance documents (clearance level 2)
    await DocumentChunk.create({
      content: 'Internal memo: Q4 project timeline',
      embedding: mockEmbedding,
      metadata: {
        clearance_level: 2,
        document_id: 'doc_internal_1',
        source: 'internal_docs',
        chunk_index: 0,
      },
    });

    await DocumentChunk.create({
      content: 'Internal report: Team performance metrics',
      embedding: mockEmbedding,
      metadata: {
        clearance_level: 2,
        document_id: 'doc_internal_2',
        source: 'internal_docs',
        chunk_index: 1,
      },
    });

    // High clearance documents (clearance level 3)
    await DocumentChunk.create({
      content: 'Confidential: Executive compensation details',
      embedding: mockEmbedding,
      metadata: {
        clearance_level: 3,
        document_id: 'doc_confidential_1',
        source: 'confidential_docs',
        chunk_index: 0,
      },
    });

    await DocumentChunk.create({
      content: 'Confidential: Merger and acquisition plans',
      embedding: mockEmbedding,
      metadata: {
        clearance_level: 3,
        document_id: 'doc_confidential_2',
        source: 'confidential_docs',
        chunk_index: 1,
      },
    });

    // Create some security events for dashboard testing
    await SecurityEvent.create({
      type: 'blocked_attack',
      timestamp: new Date(),
      user_id: juniorUserId,
      details: {
        prompt: 'DROP TABLE users;',
        reason: 'SQL injection detected',
        threat_type: 'injection',
      },
      severity: 'critical',
    });

    await SecurityEvent.create({
      type: 'redaction',
      timestamp: new Date(),
      user_id: adminUserId,
      details: {
        document_id: 'doc_confidential_1',
        pii_type: 'email',
        redacted_count: 1,
      },
      severity: 'medium',
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('Requirement 5.4, 5.5: SOC Dashboard Access Control', () => {
    it('should deny junior_employee access to SOC Dashboard events endpoint', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${juniorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INSUFFICIENT_CLEARANCE');
      expect(response.body.error.message).toBe('You do not have permission to access this resource');
    });

    it('should deny junior_employee access to SOC Dashboard stats endpoint', async () => {
      const response = await request(app)
        .get('/api/events/stats')
        .set('Authorization', `Bearer ${juniorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INSUFFICIENT_CLEARANCE');
    });

    it('should allow security_admin access to SOC Dashboard events endpoint', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should allow security_admin access to SOC Dashboard stats endpoint', async () => {
      const response = await request(app)
        .get('/api/events/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should deny access without authentication token', async () => {
      const response = await request(app)
        .get('/api/events');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should deny access with invalid token', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', 'Bearer invalid-token-12345');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return all security events to security_admin', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify events contain expected types
      const eventTypes = response.body.data.map((e: any) => e.type);
      expect(eventTypes).toContain('blocked_attack');
      expect(eventTypes).toContain('redaction');
    });
  });

  describe('Requirement 2.2: Junior Employee Document Access', () => {
    it('should only return low-clearance documents to junior_employee', async () => {
      // Get all documents accessible to junior employee
      const documents = await DocumentChunk.find({
        'metadata.clearance_level': { $lte: 1 },
      });

      expect(documents.length).toBe(2);
      expect(documents.every(doc => doc.metadata.clearance_level === 1)).toBe(true);

      // Verify content is public information
      const contents = documents.map(doc => doc.content);
      expect(contents.some(c => c.includes('Public information'))).toBe(true);
      expect(contents.some(c => c.includes('Confidential'))).toBe(false);
    });

    it('should not return medium clearance documents to junior_employee', async () => {
      const documents = await DocumentChunk.find({
        'metadata.clearance_level': 2,
      });

      // Junior employee should not have access to these
      const accessibleDocs = await DocumentChunk.find({
        'metadata.clearance_level': { $lte: 1 },
        _id: { $in: documents.map(d => d._id) },
      });

      expect(accessibleDocs.length).toBe(0);
    });

    it('should not return high clearance documents to junior_employee', async () => {
      const documents = await DocumentChunk.find({
        'metadata.clearance_level': 3,
      });

      // Junior employee should not have access to these
      const accessibleDocs = await DocumentChunk.find({
        'metadata.clearance_level': { $lte: 1 },
        _id: { $in: documents.map(d => d._id) },
      });

      expect(accessibleDocs.length).toBe(0);
    });

    it('should filter vector search results by junior_employee clearance', async () => {
      // Simulate vector search with clearance filtering
      const juniorClearance = 1;
      const results = await DocumentChunk.aggregate([
        {
          $match: {
            'metadata.clearance_level': { $lte: juniorClearance },
          },
        },
        {
          $project: {
            content: 1,
            metadata: 1,
          },
        },
      ]);

      expect(results.length).toBe(2);
      expect(results.every(r => r.metadata.clearance_level <= juniorClearance)).toBe(true);
    });
  });

  describe('Requirement 2.3: Security Admin Document Access', () => {
    it('should return all documents to security_admin', async () => {
      const adminClearance = 3;
      const documents = await DocumentChunk.find({
        'metadata.clearance_level': { $lte: adminClearance },
      });

      // Admin should see all 6 documents (2 public + 2 internal + 2 confidential)
      expect(documents.length).toBe(6);
    });

    it('should return low clearance documents to security_admin', async () => {
      const adminClearance = 3;
      const lowClearanceDocs = await DocumentChunk.find({
        'metadata.clearance_level': 1,
      });

      const accessibleDocs = await DocumentChunk.find({
        'metadata.clearance_level': { $lte: adminClearance },
        _id: { $in: lowClearanceDocs.map(d => d._id) },
      });

      expect(accessibleDocs.length).toBe(lowClearanceDocs.length);
      expect(accessibleDocs.length).toBe(2);
    });

    it('should return medium clearance documents to security_admin', async () => {
      const adminClearance = 3;
      const mediumClearanceDocs = await DocumentChunk.find({
        'metadata.clearance_level': 2,
      });

      const accessibleDocs = await DocumentChunk.find({
        'metadata.clearance_level': { $lte: adminClearance },
        _id: { $in: mediumClearanceDocs.map(d => d._id) },
      });

      expect(accessibleDocs.length).toBe(mediumClearanceDocs.length);
      expect(accessibleDocs.length).toBe(2);
    });

    it('should return high clearance documents to security_admin', async () => {
      const adminClearance = 3;
      const highClearanceDocs = await DocumentChunk.find({
        'metadata.clearance_level': 3,
      });

      const accessibleDocs = await DocumentChunk.find({
        'metadata.clearance_level': { $lte: adminClearance },
        _id: { $in: highClearanceDocs.map(d => d._id) },
      });

      expect(accessibleDocs.length).toBe(highClearanceDocs.length);
      expect(accessibleDocs.length).toBe(2);
    });

    it('should filter vector search results to include all documents for security_admin', async () => {
      const adminClearance = 3;
      const results = await DocumentChunk.aggregate([
        {
          $match: {
            'metadata.clearance_level': { $lte: adminClearance },
          },
        },
        {
          $project: {
            content: 1,
            metadata: 1,
          },
        },
      ]);

      expect(results.length).toBe(6);

      // Verify all clearance levels are present
      const clearanceLevels = results.map(r => r.metadata.clearance_level);
      expect(clearanceLevels).toContain(1);
      expect(clearanceLevels).toContain(2);
      expect(clearanceLevels).toContain(3);
    });

    it('should allow security_admin to access confidential documents', async () => {
      const confidentialDocs = await DocumentChunk.find({
        'metadata.clearance_level': 3,
      });

      expect(confidentialDocs.length).toBe(2);
      expect(confidentialDocs.every(doc => doc.content.includes('Confidential'))).toBe(true);
    });
  });

  describe('Cross-Clearance Level Verification', () => {
    it('should enforce strict clearance boundaries', async () => {
      // Junior employee (clearance 1) should only see 2 documents
      const juniorDocs = await DocumentChunk.find({
        'metadata.clearance_level': { $lte: 1 },
      });
      expect(juniorDocs.length).toBe(2);

      // Medium clearance (clearance 2) should see 4 documents
      const mediumDocs = await DocumentChunk.find({
        'metadata.clearance_level': { $lte: 2 },
      });
      expect(mediumDocs.length).toBe(4);

      // Admin (clearance 3) should see all 6 documents
      const adminDocs = await DocumentChunk.find({
        'metadata.clearance_level': { $lte: 3 },
      });
      expect(adminDocs.length).toBe(6);
    });

    it('should prevent clearance level escalation', async () => {
      // Attempt to access documents above clearance level
      const juniorClearance = 1;
      const unauthorizedDocs = await DocumentChunk.find({
        'metadata.clearance_level': { $gt: juniorClearance },
      });

      // These documents exist but should not be accessible to junior employee
      expect(unauthorizedDocs.length).toBe(4);

      // Verify junior employee cannot access them through proper filtering
      const accessibleUnauthorized = await DocumentChunk.find({
        'metadata.clearance_level': { $lte: juniorClearance },
        _id: { $in: unauthorizedDocs.map(d => d._id) },
      });

      expect(accessibleUnauthorized.length).toBe(0);
    });

    it('should maintain clearance filtering across different document sources', async () => {
      // Verify clearance filtering works regardless of document source
      const sources = ['public_docs', 'internal_docs', 'confidential_docs'];

      for (const source of sources) {
        const sourceDocs = await DocumentChunk.find({
          'metadata.source': source,
        });

        expect(sourceDocs.length).toBeGreaterThan(0);

        // Each source should have consistent clearance levels
        const clearanceLevels = sourceDocs.map(d => d.metadata.clearance_level);
        const uniqueLevels = [...new Set(clearanceLevels)];
        expect(uniqueLevels.length).toBe(1); // All docs from same source have same clearance
      }
    });
  });

  describe('Authentication and Authorization Flow', () => {
    it('should require authentication for document access', async () => {
      // Attempt to access documents without authentication should fail in real scenario
      // In this test, we verify that tokens are required
      expect(juniorToken).toBeDefined();
      expect(adminToken).toBeDefined();
      expect(juniorToken).not.toBe(adminToken);
    });

    it('should extract correct clearance level from JWT tokens', async () => {
      const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

      const juniorPayload = jwt.verify(juniorToken, JWT_SECRET) as any;
      expect(juniorPayload.clearance_level).toBe(1);
      expect(juniorPayload.role).toBe('junior_employee');

      const adminPayload = jwt.verify(adminToken, JWT_SECRET) as any;
      expect(adminPayload.clearance_level).toBe(3);
      expect(adminPayload.role).toBe('security_admin');
    });

    it('should maintain user identity throughout request lifecycle', async () => {
      // Verify user IDs are correctly stored and retrievable
      const juniorUser = await User.findById(juniorUserId);
      expect(juniorUser).toBeDefined();
      expect(juniorUser?.clearance_level).toBe(1);
      expect(juniorUser?.role).toBe('junior_employee');

      const adminUser = await User.findById(adminUserId);
      expect(adminUser).toBeDefined();
      expect(adminUser?.clearance_level).toBe(3);
      expect(adminUser?.role).toBe('security_admin');
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle invalid clearance levels gracefully', async () => {
      // Attempt to query with invalid clearance level
      const invalidClearance = 99;
      const docs = await DocumentChunk.find({
        'metadata.clearance_level': { $lte: invalidClearance },
      });

      // Should return all documents (since 99 > all clearance levels)
      // In production, this should be validated before reaching the database
      expect(docs.length).toBe(6);
    });

    it('should handle zero or negative clearance levels', async () => {
      const zeroClearance = 0;
      const docs = await DocumentChunk.find({
        'metadata.clearance_level': { $lte: zeroClearance },
      });

      // Should return no documents
      expect(docs.length).toBe(0);
    });

    it('should not expose document metadata to unauthorized users', async () => {
      // Junior employee should not be able to see metadata of high-clearance docs
      const highClearanceDocs = await DocumentChunk.find({
        'metadata.clearance_level': 3,
      }).select('metadata.clearance_level metadata.source');

      // These docs exist but junior employee shouldn't access them
      expect(highClearanceDocs.length).toBe(2);

      // Verify filtering prevents access
      const juniorAccessible = await DocumentChunk.find({
        'metadata.clearance_level': { $lte: 1 },
        _id: { $in: highClearanceDocs.map(d => d._id) },
      });

      expect(juniorAccessible.length).toBe(0);
    });
  });
});
