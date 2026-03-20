// Setup test environment variables first
import '../../config/test-env';

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { authService } from '../auth.service';
import { User } from '../../models/User';
import { AuditLog } from '../../models/AuditLog';
import { generateToken, validateToken, invalidateToken, clearTokenBlacklist } from '../../utils/jwt';
import { hashPassword } from '../../utils/password';

describe('Authentication Service - Complete Flow', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    await User.deleteMany({});
    await AuditLog.deleteMany({});
    clearTokenBlacklist();
  });

  describe('Complete Authentication Flow - Junior Employee', () => {
    it('should successfully login as junior_employee, validate token, and logout', async () => {
      // Setup: Create junior_employee user
      const email = 'junior@example.com';
      const password = 'password123';
      const clearanceLevel = 1;
      const role = 'junior_employee';

      await authService.createUser(email, password, clearanceLevel, role);

      // Step 1: Login
      const loginResponse = await authService.login(email, password);

      // Verify login response structure
      expect(loginResponse).toHaveProperty('token');
      expect(loginResponse).toHaveProperty('user');
      expect(loginResponse.user.email).toBe(email);
      expect(loginResponse.user.clearance_level).toBe(clearanceLevel);
      expect(loginResponse.user.role).toBe(role);

      // Verify token is a valid JWT string
      expect(typeof loginResponse.token).toBe('string');
      expect(loginResponse.token.split('.')).toHaveLength(3); // JWT has 3 parts

      // Step 2: Validate JWT token
      const tokenPayload = validateToken(loginResponse.token);

      // Verify token contains correct clearance_level
      expect(tokenPayload.user_id).toBe(loginResponse.user.id);
      expect(tokenPayload.clearance_level).toBe(clearanceLevel);
      expect(tokenPayload.role).toBe(role);
      expect(tokenPayload.exp).toBeDefined();
      expect(tokenPayload.exp).toBeGreaterThan(Date.now() / 1000);

      // Step 3: Verify audit log for successful login
      const loginAuditLogs = await AuditLog.find({
        action: 'login',
        result: 'success',
        'metadata.email': email
      });
      expect(loginAuditLogs).toHaveLength(1);
      expect(loginAuditLogs[0].user_id.toString()).toBe(loginResponse.user.id);

      // Step 4: Logout
      await authService.logout(loginResponse.token, loginResponse.user.id);

      // Step 5: Verify token is invalidated after logout
      expect(() => validateToken(loginResponse.token)).toThrow('Token has been invalidated');

      // Step 6: Verify audit log for logout
      const logoutAuditLogs = await AuditLog.find({
        action: 'logout',
        result: 'success'
      });
      expect(logoutAuditLogs).toHaveLength(1);
      expect(logoutAuditLogs[0].user_id.toString()).toBe(loginResponse.user.id);
    });
  });

  describe('Complete Authentication Flow - Security Admin', () => {
    it('should successfully login as security_admin, validate token, and logout', async () => {
      // Setup: Create security_admin user
      const email = 'admin@example.com';
      const password = 'adminpass456';
      const clearanceLevel = 3;
      const role = 'security_admin';

      await authService.createUser(email, password, clearanceLevel, role);

      // Step 1: Login
      const loginResponse = await authService.login(email, password);

      // Verify login response
      expect(loginResponse.user.email).toBe(email);
      expect(loginResponse.user.clearance_level).toBe(clearanceLevel);
      expect(loginResponse.user.role).toBe(role);

      // Step 2: Validate JWT token
      const tokenPayload = validateToken(loginResponse.token);

      // Verify token contains admin clearance_level
      expect(tokenPayload.clearance_level).toBe(3);
      expect(tokenPayload.role).toBe('security_admin');

      // Step 3: Logout
      await authService.logout(loginResponse.token, loginResponse.user.id);

      // Step 4: Verify token is invalidated
      expect(() => validateToken(loginResponse.token)).toThrow('Token has been invalidated');
    });
  });

  describe('JWT Token Generation and Validation', () => {
    it('should generate token with correct clearance_level and validate it', async () => {
      // Create user
      const user = await authService.createUser(
        'test@example.com',
        'password',
        2,
        'junior_employee'
      );

      // Generate token
      const token = generateToken(user._id.toString(), user.clearance_level, user.role);

      // Validate token
      const payload = validateToken(token);

      expect(payload.user_id).toBe(user._id.toString());
      expect(payload.clearance_level).toBe(2);
      expect(payload.role).toBe('junior_employee');
    });

    it('should reject invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => validateToken(invalidToken)).toThrow('Invalid token');
    });

    it('should reject malformed token', () => {
      const malformedToken = 'not-a-jwt-token';

      expect(() => validateToken(malformedToken)).toThrow();
    });
  });

  describe('Token Invalidation on Logout', () => {
    it('should invalidate token after logout and reject subsequent requests', async () => {
      // Create and login user
      await authService.createUser('user@example.com', 'pass123', 1, 'junior_employee');
      const loginResponse = await authService.login('user@example.com', 'pass123');

      // Token should be valid before logout
      expect(() => validateToken(loginResponse.token)).not.toThrow();

      // Logout
      await authService.logout(loginResponse.token, loginResponse.user.id);

      // Token should be invalid after logout
      expect(() => validateToken(loginResponse.token)).toThrow('Token has been invalidated');
    });

    it('should allow multiple logouts without error', async () => {
      await authService.createUser('user@example.com', 'pass123', 1, 'junior_employee');
      const loginResponse = await authService.login('user@example.com', 'pass123');

      // First logout
      await authService.logout(loginResponse.token, loginResponse.user.id);

      // Second logout should not throw
      await expect(authService.logout(loginResponse.token, loginResponse.user.id)).resolves.not.toThrow();
    });
  });

  describe('Authentication Error Cases', () => {
    it('should reject login with invalid email', async () => {
      await expect(
        authService.login('nonexistent@example.com', 'password')
      ).rejects.toThrow('Invalid credentials');

      // Verify failed login audit log
      const failedLogs = await AuditLog.find({
        action: 'login',
        result: 'failure'
      });
      expect(failedLogs.length).toBeGreaterThan(0);
    });

    it('should reject login with invalid password', async () => {
      await authService.createUser('user@example.com', 'correctpass', 1, 'junior_employee');

      await expect(
        authService.login('user@example.com', 'wrongpass')
      ).rejects.toThrow('Invalid credentials');

      // Verify failed login audit log
      const failedLogs = await AuditLog.find({
        action: 'login',
        result: 'failure',
        'metadata.reason': 'Invalid password'
      });
      expect(failedLogs).toHaveLength(1);
    });

    it('should update last_login timestamp on successful login', async () => {
      const email = 'user@example.com';
      await authService.createUser(email, 'password', 1, 'junior_employee');

      const userBefore = await User.findOne({ email });
      const lastLoginBefore = userBefore?.last_login;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await authService.login(email, 'password');

      const userAfter = await User.findOne({ email });
      const lastLoginAfter = userAfter?.last_login;

      expect(lastLoginAfter).toBeDefined();
      if (lastLoginBefore) {
        expect(lastLoginAfter!.getTime()).toBeGreaterThan(lastLoginBefore.getTime());
      }
    });
  });

  describe('Multiple Users Authentication', () => {
    it('should handle authentication for multiple users independently', async () => {
      // Create two users
      await authService.createUser('junior@example.com', 'pass1', 1, 'junior_employee');
      await authService.createUser('admin@example.com', 'pass2', 3, 'security_admin');

      // Login both users
      const juniorLogin = await authService.login('junior@example.com', 'pass1');
      const adminLogin = await authService.login('admin@example.com', 'pass2');

      // Validate both tokens
      const juniorPayload = validateToken(juniorLogin.token);
      const adminPayload = validateToken(adminLogin.token);

      expect(juniorPayload.clearance_level).toBe(1);
      expect(adminPayload.clearance_level).toBe(3);

      // Logout junior user
      await authService.logout(juniorLogin.token, juniorLogin.user.id);

      // Junior token should be invalid
      expect(() => validateToken(juniorLogin.token)).toThrow('Token has been invalidated');

      // Admin token should still be valid
      expect(() => validateToken(adminLogin.token)).not.toThrow();
    });
  });

  describe('Requirements Validation', () => {
    it('should satisfy Requirement 1.1: Generate JWT with clearance_level', async () => {
      await authService.createUser('user@example.com', 'password', 2, 'junior_employee');
      const response = await authService.login('user@example.com', 'password');

      const payload = validateToken(response.token);
      expect(payload.clearance_level).toBe(2);
    });

    it('should satisfy Requirement 1.2: Validate JWT and extract clearance_level', async () => {
      await authService.createUser('user@example.com', 'password', 2, 'junior_employee');
      const response = await authService.login('user@example.com', 'password');

      const payload = validateToken(response.token);
      expect(payload).toHaveProperty('clearance_level');
      expect(payload).toHaveProperty('user_id');
      expect(payload).toHaveProperty('role');
    });

    it('should satisfy Requirement 1.5: Invalidate JWT on logout', async () => {
      await authService.createUser('user@example.com', 'password', 1, 'junior_employee');
      const response = await authService.login('user@example.com', 'password');

      await authService.logout(response.token, response.user.id);

      expect(() => validateToken(response.token)).toThrow('Token has been invalidated');
    });
  });
});
