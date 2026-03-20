import { Request, Response } from 'express';
import { securityEventService } from '../services/security-event.service';
import { SecurityEventType, SecurityEventSeverity } from '../models/SecurityEvent';

/**
 * Events controller
 * Handles security event queries for SOC Dashboard
 */

/**
 * Get security events with filters
 * GET /api/events
 */
export const getEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      type,
      user_id,
      start_date,
      end_date,
      severity,
      limit,
      skip,
    } = req.query;

    // Parse filters
    const filters: any = {};

    if (type) {
      filters.type = Array.isArray(type) ? type : [type];
    }

    if (user_id) {
      filters.user_id = user_id as string;
    }

    if (start_date) {
      filters.start_date = new Date(start_date as string);
    }

    if (end_date) {
      filters.end_date = new Date(end_date as string);
    }

    if (severity) {
      filters.severity = Array.isArray(severity) ? severity : [severity];
    }

    if (limit) {
      filters.limit = parseInt(limit as string, 10);
    }

    if (skip) {
      filters.skip = parseInt(skip as string, 10);
    }

    // Get events
    const events = await securityEventService.getEvents(filters);

    res.status(200).json({
      success: true,
      data: events,
      count: events.length,
    });
  } catch (error) {
    console.error('Failed to get events:', error);
    res.status(500).json({
      error: {
        code: 'EVENTS_FETCH_FAILED',
        message: 'Failed to retrieve security events',
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Get event statistics
 * GET /api/events/stats
 */
export const getEventStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { start_date, end_date } = req.query;

    const filters: any = {};

    if (start_date) {
      filters.start_date = new Date(start_date as string);
    }

    if (end_date) {
      filters.end_date = new Date(end_date as string);
    }

    const stats = await securityEventService.getEventStats(filters);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Failed to get event stats:', error);
    res.status(500).json({
      error: {
        code: 'STATS_FETCH_FAILED',
        message: 'Failed to retrieve event statistics',
        timestamp: new Date().toISOString(),
      },
    });
  }
};
