import { z } from 'zod';

/**
 * Login request schema
 */
export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long')
});

/**
 * Login request type
 */
export type LoginRequest = z.infer<typeof loginSchema>;

/**
 * Logout request schema
 */
export const logoutSchema = z.object({
  token: z.string().min(1, 'Token is required')
});

/**
 * Logout request type
 */
export type LogoutRequest = z.infer<typeof logoutSchema>;
