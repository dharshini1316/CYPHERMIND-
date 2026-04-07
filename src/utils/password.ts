import bcrypt from 'bcryptjs';

/**
 * Number of salt rounds for bcrypt hashing
 * 10 rounds provides a good balance between security and performance
 */
const SALT_ROUNDS = 10;

/**
 * Hash a plain text password using bcrypt
 * @param password - Plain text password to hash
 * @returns Promise resolving to the hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
  } catch (error) {
    throw new Error('Failed to hash password');
  }
};

/**
 * Compare a plain text password with a hashed password
 * @param password - Plain text password to verify
 * @param hash - Hashed password to compare against
 * @returns Promise resolving to true if passwords match, false otherwise
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch (error) {
    throw new Error('Failed to compare passwords');
  }
};
