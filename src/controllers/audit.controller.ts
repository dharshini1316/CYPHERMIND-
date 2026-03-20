import { Request, Response } from 'express';
import { auditService } from '../services/audit.service';

/**
 * Audit controller
 * Handles audit log queries
 */

/**
 * Get audit logs with filters
 * GET /api/audit-logs
 */
export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      user_id,
      action,
      resource,
      result,
      start_date,
      end_date,
      limit,
      skip,
    } = req.query;

    // Parse filters
    const filters: any = {};

    if (user_id) {
      filters.user_id = user_id as string;
    }

    if (action) {
      filters.action = action as string;
    }

    if (resource) {
      filters.resource = resource as string;
    }

    if (result) {
      filters.result = result as 'success' | 'failure';
    }

    if (start_date) {
      filters.start_date = new Date(start_date as string);
    }

    if (end_date) {
      filters.end_date = new Date(end_date as string);
    }

    if (limit) {
      filters.limit = parseInt(limit as string, 10);
    }

    if (skip) {
      filters.skip = parseInt(skip as string, 10);
    }

    // Get audit logs
    const logs = await auditService.getAuditLogs(filters);

    res.status(200).json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    res.status(500).json({
      error: {
        code: 'AUDIT_LOGS_FETCH_FAILED',
        message: 'Failed to retrieve audit logs',
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Get audit statistics
 * GET /api/audit-logs/stats
 */
export const getAuditStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { start_date, end_date } = req.query;

    const filters: any = {};

    if (start_date) {
      filters.start_date = new Date(start_date as string);
    }

    if (end_date) {
      filters.end_date = new Date(end_date as string);
    }

    const stats = await auditService.getAuditStats(filters);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Failed to get audit stats:', error);
    res.status(500).json({
      error: {
        code: 'AUDIT_STATS_FETCH_FAILED',
        message: 'Failed to retrieve audit statistics',
        timestamp: new Date().toISOString(),
      },
    });
  }
};
