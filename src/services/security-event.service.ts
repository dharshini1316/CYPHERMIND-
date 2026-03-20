import { SecurityEvent, ISecurityEvent, SecurityEventType, SecurityEventSeverity } from '../models/SecurityEvent';
import { ChangeStream } from 'mongodb';
import mongoose from 'mongoose';

/**
 * Event filters for querying security events
 */
export interface EventFilters {
  type?: SecurityEventType[];
  user_id?: string;
  start_date?: Date;
  end_date?: Date;
  severity?: SecurityEventSeverity[];
  limit?: number;
  skip?: number;
}

/**
 * Security Event Service
 * Manages security events for SOC Dashboard
 */
export class SecurityEventService {
  /**
   * Log a security event
   * @param event - Security event data
   */
  async logEvent(event: Partial<ISecurityEvent>): Promise<ISecurityEvent> {
    try {
      const securityEvent = await SecurityEvent.create({
        type: event.type,
        timestamp: event.timestamp || new Date(),
        user_id: event.user_id,
        details: event.details || {},
        severity: event.severity || 'medium',
      });

      return securityEvent;
    } catch (error) {
      console.error('Failed to log security event:', error);
      throw new Error(`Failed to log security event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get security events with filters
   * @param filters - Event filters
   * @returns Array of security events
   */
  async getEvents(filters: EventFilters = {}): Promise<ISecurityEvent[]> {
    try {
      const query: any = {};

      // Apply filters
      if (filters.type && filters.type.length > 0) {
        query.type = { $in: filters.type };
      }

      if (filters.user_id) {
        query.user_id = filters.user_id;
      }

      if (filters.severity && filters.severity.length > 0) {
        query.severity = { $in: filters.severity };
      }

      if (filters.start_date || filters.end_date) {
        query.timestamp = {};
        if (filters.start_date) {
          query.timestamp.$gte = filters.start_date;
        }
        if (filters.end_date) {
          query.timestamp.$lte = filters.end_date;
        }
      }

      // Execute query with pagination
      const events = await SecurityEvent.find(query)
        .sort({ timestamp: -1 }) // Most recent first
        .limit(filters.limit || 100)
        .skip(filters.skip || 0)
        .populate('user_id', 'email role clearance_level')
        .lean();

      return events as any as ISecurityEvent[];
    } catch (error) {
      console.error('Failed to get security events:', error);
      throw new Error(`Failed to get security events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get event statistics
   * @param filters - Event filters
   * @returns Event statistics
   */
  async getEventStats(filters: EventFilters = {}): Promise<{
    total_events: number;
    blocked_attacks: number;
    redactions: number;
    auth_failures: number;
    access_denied: number;
  }> {
    try {
      const query: any = {};

      // Apply date filters
      if (filters.start_date || filters.end_date) {
        query.timestamp = {};
        if (filters.start_date) {
          query.timestamp.$gte = filters.start_date;
        }
        if (filters.end_date) {
          query.timestamp.$lte = filters.end_date;
        }
      }

      const [total, blocked, redactions, authFailures, accessDenied] = await Promise.all([
        SecurityEvent.countDocuments(query),
        SecurityEvent.countDocuments({ ...query, type: 'blocked_attack' }),
        SecurityEvent.countDocuments({ ...query, type: 'redaction' }),
        SecurityEvent.countDocuments({ ...query, type: 'auth_failure' }),
        SecurityEvent.countDocuments({ ...query, type: 'access_denied' }),
      ]);

      return {
        total_events: total,
        blocked_attacks: blocked,
        redactions,
        auth_failures: authFailures,
        access_denied: accessDenied,
      };
    } catch (error) {
      console.error('Failed to get event stats:', error);
      throw new Error(`Failed to get event stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a change stream for real-time event monitoring
   * @returns MongoDB Change Stream
   */
  streamEvents(): ChangeStream {
    try {
      const changeStream = SecurityEvent.watch([
        {
          $match: {
            operationType: 'insert',
          },
        },
      ], {
        fullDocument: 'updateLookup',
      });

      return changeStream as any;
    } catch (error) {
      console.error('Failed to create change stream:', error);
      throw new Error(`Failed to create change stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const securityEventService = new SecurityEventService();
