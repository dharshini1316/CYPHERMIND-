import { mongoose, Schema, Document } from '../utils/mongoose.shim';
import { config } from '../config/env';
import { mockDb } from '../utils/mock-db-provider';

/**
 * Security event types
 */
export type SecurityEventType = 'blocked_attack' | 'redaction' | 'access_denied' | 'auth_failure' | 'simulated_attack';

/**
 * Security event severity levels
 */
export type SecurityEventSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Security event details interface
 */
export interface ISecurityEventDetails {
  prompt?: string;
  reason?: string;
  threat_type?: string;
  pii_type?: string;
  document_id?: string;
  ip_address?: string;
  redactions_count?: number;
  redactions_by_type?: Record<string, number>;
  simulation_id?: string;
  attack_description?: string;
  suggested_fix?: string;
  pr_url?: string;
  risk_score?: number;
  success?: boolean;
  [key: string]: any; // Allow additional fields
}

/**
 * Security event interface
 */
export interface ISecurityEvent extends Document {
  type: SecurityEventType;
  timestamp: Date;
  user_id?: string | null;
  details: ISecurityEventDetails;
  severity: SecurityEventSeverity;
}

/**
 * Security event schema definition
 */
const SecurityEventSchema = new Schema<ISecurityEvent>({
  type: {
    type: String,
    enum: ['blocked_attack', 'redaction', 'access_denied', 'auth_failure', 'simulated_attack'],
    required: [true, 'Event type is required']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  user_id: {
    type: Schema.Types.Mixed,
    ref: 'User',
    required: false
  },
  details: {
    prompt: {
      type: String,
      required: false
    },
    reason: {
      type: String,
      required: false
    },
    threat_type: {
      type: String,
      required: false
    },
    pii_type: {
      type: String,
      required: false
    },
    document_id: {
      type: String,
      required: false
    },
    ip_address: {
      type: String,
      required: false
    },
    redactions_count: {
      type: Number,
      required: false
    },
    redactions_by_type: {
      type: Schema.Types.Mixed,
      required: false
    },
    simulation_id: {
      type: String,
      required: false
    },
    attack_description: {
      type: String,
      required: false
    },
    suggested_fix: {
      type: String,
      required: false
    },
    pr_url: {
      type: String,
      required: false
    },
    risk_score: {
      type: Number,
      required: false
    },
    success: {
      type: Boolean,
      required: false
    }
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: [true, 'Severity is required'],
    default: 'medium'
  }
}, {
  timestamps: true,
  collection: 'security_events'
});

// Indexes for performance and querying
SecurityEventSchema.index({ timestamp: -1 }); // Most recent first
SecurityEventSchema.index({ type: 1 });
SecurityEventSchema.index({ severity: 1 });
SecurityEventSchema.index({ user_id: 1 });

// Compound indexes for common queries
SecurityEventSchema.index({ type: 1, timestamp: -1 });
SecurityEventSchema.index({ severity: 1, timestamp: -1 });
SecurityEventSchema.index({ user_id: 1, timestamp: -1 });

/**
 * Security event model (Real or Mock)
 */
export const SecurityEvent = config.security.useLocalDb
  ? mockDb.getModel<ISecurityEvent>('SecurityEvent')
  : mongoose.model<ISecurityEvent>('SecurityEvent', SecurityEventSchema);
