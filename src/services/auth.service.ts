import { User, IUser } from '../models/User';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken, invalidateToken } from '../utils/jwt';
import { auditService } from './audit.service';
import { AuditLog } from '../models/AuditLog';

/**
 * Authentication response interface
 */
export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    clearance_level: number;
    role: 'junior_employee' | 'security_admin';
  };
}

/**
 * Authentication service
 */
export class AuthService {
  /**
   * Authenticate user with email and password
   * @param email - User's email
   * @param password - User's password
   * @returns Authentication response with token and user info
   * @throws Error if credentials are invalid
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const sanitizedEmail = email.trim().toLowerCase();

    // BOOTSTRAP: Admin
    const isEmergencyAdmin = sanitizedEmail === 'admin@cyphermind.com' && password === 'Admin123!';
    if (isEmergencyAdmin) {
      console.log('🛡️  [AuthService] Bootstrap Admin Access GRANTED');
      return {
        token: generateToken('bootstrap-admin', 3, 'security_admin', 'admin@cyphermind.com'),
        user: {
          id: 'bootstrap-admin',
          email: 'admin@cyphermind.com',
          clearance_level: 3,
          role: 'security_admin'
        }
      };
    }

    // BOOTSTRAP: Junior
    const isEmergencyJunior = sanitizedEmail === 'junior@cyphermind.com' && password === 'Junior123!';
    if (isEmergencyJunior) {
      console.log('🛡️  [AuthService] Bootstrap Junior Access GRANTED');
      return {
        token: generateToken('bootstrap-junior', 1, 'junior_employee', 'junior@cyphermind.com'),
        user: {
          id: 'bootstrap-junior',
          email: 'junior@cyphermind.com',
          clearance_level: 1,
          role: 'junior_employee'
        }
      };
    }

    // BOOTSTRAP: Standard User
    const isEmergencyUser = sanitizedEmail === 'user@cyphermind.com' && password === 'User123!';
    if (isEmergencyUser) {
      console.log('🛡️  [AuthService] Bootstrap Standard User Access GRANTED');
      return {
        token: generateToken('bootstrap-user', 2, 'junior_employee', 'user@cyphermind.com'),
        user: {
          id: 'bootstrap-user',
          email: 'user@cyphermind.com',
          clearance_level: 2,
          role: 'junior_employee'
        }
      };
    }

    // Find user by email (include password_hash for comparison)
    const user = await User.findOne({ email }).select('+password_hash');

    if (!user) {
      // Log failed login attempt
      await AuditLog.create({
        action: 'login',
        user_id: null,
        resource: 'auth',
        result: 'failure',
        timestamp: new Date(),
        metadata: { email, reason: 'User not found' },
      });
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      // Log failed login attempt
      await AuditLog.create({
        action: 'login',
        user_id: user._id,
        resource: 'auth',
        result: 'failure',
        timestamp: new Date(),
        metadata: { email, reason: 'Invalid password' },
      });
      throw new Error('Invalid credentials');
    }

    // Update last login timestamp
    user.last_login = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(
      user._id.toString(),
      user.clearance_level,
      user.role,
      user.email
    );

    // Log successful login
    await AuditLog.create({
      action: 'login',
      user_id: user._id,
      resource: 'auth',
      result: 'success',
      timestamp: new Date(),
      metadata: { email, clearance_level: user.clearance_level, role: user.role },
    });

    // Return authentication response
    return {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        clearance_level: user.clearance_level,
        role: user.role
      }
    };
  }

  /**
   * Logout user by invalidating their token
   * @param token - JWT token to invalidate
   * @param userId - User ID for audit logging
   */
  async logout(token: string, userId?: string): Promise<void> {
    invalidateToken(token);

    // Log logout
    if (userId) {
      await AuditLog.create({
        action: 'logout',
        user_id: userId,
        resource: 'auth',
        result: 'success',
        timestamp: new Date(),
        metadata: {},
      });
    }
  }

  /**
   * Create a new user (for testing/seeding purposes)
   * @param email - User's email
   * @param password - User's password
   * @param clearanceLevel - User's clearance level
   * @param role - User's role
   * @returns Created user
   */
  async createUser(
    email: string,
    password: string,
    clearanceLevel: number,
    role: 'junior_employee' | 'security_admin'
  ): Promise<IUser> {
    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const user = await User.create({
      email,
      password_hash,
      clearance_level: clearanceLevel,
      role
    });

    return user;
  }
}

export const authService = new AuthService();
