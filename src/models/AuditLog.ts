import mongoose, { Document, Schema } from 'mongoose';

/**
 * Audit log result types
 */
export type AuditLogResult = 'success' | 'failure';

/**
 * Audit log interface
 */
export interface IAuditLog extends Document {
  action: string;
  user_id: mongoose.Types.ObjectId;
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
    type: Schema.Types.ObjectId,
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
 * Audit log model
 */
export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
