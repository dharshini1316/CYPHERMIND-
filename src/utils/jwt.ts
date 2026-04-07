import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRole } from '../models/User';

/**
 * JWT token payload interface
 */
export interface TokenPayload {
  user_id: string;
  email: string;
  clearance_level: number;
  role: UserRole;
  exp: number;
}

/**
 * Token blacklist for logout functionality
 * In production, use Redis or a database for distributed systems
 */
const tokenBlacklist = new Set<string>();

/**
 * Generate a JWT token for a user
 * @param userId - User's database ID
 * @param clearanceLevel - User's clearance level (1-3)
 * @param role - User's role
 * @returns JWT token string
 */
export const generateToken = (
  userId: string,
  clearanceLevel: number,
  role: UserRole,
  email: string
): string => {
  const payload = {
    user_id: userId,
    email,
    clearance_level: clearanceLevel,
    role
  };

  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRATION
  } as jwt.SignOptions);

  return token;
};

/**
 * Validate and decode a JWT token
 * @param token - JWT token string
 * @returns Decoded token payload
 * @throws Error if token is invalid, expired, or blacklisted
 */
export const validateToken = (token: string): TokenPayload => {
  // Check if token is blacklisted
  if (tokenBlacklist.has(token)) {
    throw new Error('Token has been invalidated');
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw new Error('Token validation failed');
  }
};

/**
 * Invalidate a JWT token (for logout)
 * @param token - JWT token string to invalidate
 */
export const invalidateToken = (token: string): void => {
  tokenBlacklist.add(token);
};

/**
 * Check if a token is blacklisted
 * @param token - JWT token string
 * @returns True if token is blacklisted, false otherwise
 */
export const isTokenBlacklisted = (token: string): boolean => {
  return tokenBlacklist.has(token);
};

/**
 * Clear the token blacklist (for testing purposes)
 */
export const clearTokenBlacklist = (): void => {
  tokenBlacklist.clear();
};
