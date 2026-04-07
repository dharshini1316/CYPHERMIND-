import { mongoose, Schema, Document } from '../utils/mongoose.shim';
import { config } from '../config/env';
import { mockDb } from '../utils/mock-db-provider';

/**
 * Audit log result types
 */
export type AuditLogResult = 'success' | 'failure';

/**
 * Audit log interface
 */
export interface IAuditLog extends Document {
  action: string;
  user_id: mongoose.Types.ObjectId | string | null;
  resource: string;
  result: AuditLogResult;
  timestamp: Date;
  metadata: Record<string, any>;
}

/**
 * Audit log schema definition
 */
const AuditLogSchema = new Schema<IAuditLog>({
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true
  },
  user_id: {
    type: Schema.Types.Mixed, // Accepts ObjectId, string, or null
    ref: 'User',
    required: false // Allow null for failed login attempts where user doesn't exist
  },
  resource: {
    type: String,
    required: [true, 'Resource is required'],
    trim: true
  },
  result: {
    type: String,
    enum: ['success', 'failure'],
    required: [true, 'Result is required']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'audit_logs'
});

// Indexes for performance and querying
AuditLogSchema.index({ timestamp: -1 }); // Most recent first
AuditLogSchema.index({ user_id: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ result: 1 });
AuditLogSchema.index({ resource: 1 });

// Compound indexes for common audit queries
AuditLogSchema.index({ user_id: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ result: 1, timestamp: -1 });
AuditLogSchema.index({ user_id: 1, action: 1, timestamp: -1 });

/**
 * Audit log model (Real or Mock)
 */
export const AuditLog = config.security.useLocalDb
  ? mockDb.getModel<IAuditLog>('AuditLog')
  : mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
