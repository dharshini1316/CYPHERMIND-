import { mongoose, Schema, Document } from '../utils/mongoose.shim';

/**
 * User role types
 */
export type UserRole = 'junior_employee' | 'security_admin';

/**
 * User interface
 */
export interface IUser extends Document {
  email: string;
  password_hash: string;
  clearance_level: number;
  role: UserRole;
  created_at: Date;
  last_login: Date;
}

/**
 * User schema definition
 */
const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  password_hash: {
    type: String,
    required: [true, 'Password hash is required']
  },
  clearance_level: {
    type: Number,
    required: [true, 'Clearance level is required'],
    min: [1, 'Clearance level must be at least 1'],
    max: [3, 'Clearance level cannot exceed 3'],
    default: 1
  },
  role: {
    type: String,
    enum: ['junior_employee', 'security_admin'],
    required: [true, 'Role is required'],
    default: 'junior_employee'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  last_login: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Indexes for performance
UserSchema.index({ clearance_level: 1 });
UserSchema.index({ role: 1 });

// Prevent password_hash from being returned in queries by default
UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete (ret as any).password_hash;
    delete (ret as any).__v;
    return ret;
  }
});

import { config } from '../config/env';
import { mockDb } from '../utils/mock-db-provider';

/**
 * User model (Real or Mock)
 */
export const User = config.security.useLocalDb
  ? mockDb.getModel<IUser>('User')
  : mongoose.model<IUser>('User', UserSchema);
