import { AuditLog } from '../models/AuditLog';
import mongoose from 'mongoose';

/**
 * Audit log filters
 */
export interface AuditFilters {
  user_id?: string;
  action?: string;
  resource?: string;
  result?: 'success' | 'failure';
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  skip?: number;
}

/**
 * Audit Logging Service
 * Provides comprehensive audit trail for all security-relevant actions
 */
export class AuditService {
  /**
   * Log an audit entry
   * @param action - Action performed
   * @param userId - User ID
   * @param resource - Resource accessed
   * @param result - Result of action
   * @param metadata - Additional metadata
   */
  async logAudit(
    action: string,
    userId: string,
    resource: string,
    result: 'success' | 'failure',
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await AuditLog.create({
        action,
        user_id: userId,
        resource,
        result,
        timestamp: new Date(),
        metadata,
      });
    } catch (error) {
      console.error('Failed to log audit entry:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  /**
   * Get audit logs with filters
   * @param filters - Audit filters
   * @returns Array of audit logs
   */
  async getAuditLogs(filters: AuditFilters = {}): Promise<any[]> {
    try {
      const query: any = {};

      // Apply filters
      if (filters.user_id) {
        query.user_id = filters.user_id;
      }

      if (filters.action) {
        query.action = filters.action;
      }

      if (filters.resource) {
        query.resource = filters.resource;
      }

      if (filters.result) {
        query.result = filters.result;
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
      const logs = await AuditLog.find(query)
        .sort({ timestamp: -1 }) // Most recent first
        .limit(filters.limit || 100)
        .skip(filters.skip || 0)
        .populate('user_id', 'email role clearance_level')
        .lean();

      return logs;
    } catch (error) {
      console.error('Failed to get audit logs:', error);
      throw new Error(`Failed to get audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get audit statistics
   * @param filters - Audit filters
   * @returns Audit statistics
   */
  async getAuditStats(filters: AuditFilters = {}): Promise<{
    total_actions: number;
    successful_actions: number;
    failed_actions: number;
    unique_users: number;
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

      const [total, successful, failed, uniqueUsers] = await Promise.all([
        AuditLog.countDocuments(query),
        AuditLog.countDocuments({ ...query, result: 'success' }),
        AuditLog.countDocuments({ ...query, result: 'failure' }),
        AuditLog.distinct('user_id', query).then(users => users.length),
      ]);

      return {
        total_actions: total,
        successful_actions: successful,
        failed_actions: failed,
        unique_users: uniqueUsers,
      };
    } catch (error) {
      console.error('Failed to get audit stats:', error);
      throw new Error(`Failed to get audit stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const auditService = new AuditService();
