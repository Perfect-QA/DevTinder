import { Request, Response } from 'express';
import AdminAuditLog from '../models/adminAuditLog';
import { AuditLogQuery } from '../middlewares/adminAuditLogger';

/**
 * Admin Audit Log Controller
 * Handles audit log viewing and management
 */
export class AdminAuditController {
  /**
   * Get Admin Audit Logs
   * Retrieves audit logs with filtering and pagination
   */
  static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 50,
        adminId,
        action,
        resource,
        severity,
        category,
        riskLevel,
        startDate,
        endDate,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = req.query;

      // Build filter object
      const filter: any = {};
      
      if (adminId) filter.adminId = adminId;
      if (action) filter.action = { $regex: action, $options: 'i' };
      if (resource) filter.resource = { $regex: resource, $options: 'i' };
      if (severity) filter.severity = severity;
      if (category) filter.category = category;
      if (riskLevel) filter.riskLevel = riskLevel;
      
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate as string);
        if (endDate) filter.timestamp.$lte = new Date(endDate as string);
      }

      // Calculate pagination
      const skip = (Number(page) - 1) * Number(limit);
      const sort: any = {};
      sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

      // Execute query
      const [logs, total] = await Promise.all([
        AdminAuditLog.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        AdminAuditLog.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      console.error('❌ Failed to get audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit logs'
      });
    }
  }

  /**
   * Get High Risk Actions
   * Retrieves high-risk admin actions
   */
  static async getHighRiskActions(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 20 } = req.query;
      
      const highRiskActions = await AuditLogQuery.getHighRiskActions(Number(limit));
      
      res.json({
        success: true,
        data: highRiskActions
      });
    } catch (error) {
      console.error('❌ Failed to get high risk actions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve high risk actions'
      });
    }
  }

  /**
   * Get Admin Activity Summary
   * Provides summary statistics of admin activities
   */
  static async getActivitySummary(req: Request, res: Response): Promise<void> {
    try {
      const { days = 30 } = req.query;
      const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

      const [
        totalActions,
        actionsBySeverity,
        actionsByCategory,
        actionsByRiskLevel,
        recentActions
      ] = await Promise.all([
        AdminAuditLog.countDocuments({ timestamp: { $gte: since } }),
        AdminAuditLog.aggregate([
          { $match: { timestamp: { $gte: since } } },
          { $group: { _id: '$severity', count: { $sum: 1 } } }
        ]),
        AdminAuditLog.aggregate([
          { $match: { timestamp: { $gte: since } } },
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ]),
        AdminAuditLog.aggregate([
          { $match: { timestamp: { $gte: since } } },
          { $group: { _id: '$riskLevel', count: { $sum: 1 } } }
        ]),
        AuditLogQuery.getRecentActions(Number(days), 10)
      ]);

      res.json({
        success: true,
        data: {
          summary: {
            totalActions,
            days: Number(days),
            period: { from: since, to: new Date() }
          },
          breakdown: {
            bySeverity: actionsBySeverity,
            byCategory: actionsByCategory,
            byRiskLevel: actionsByRiskLevel
          },
          recentActions
        }
      });
    } catch (error) {
      console.error('❌ Failed to get activity summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve activity summary'
      });
    }
  }

  /**
   * Get Admin Actions by Admin ID
   * Retrieves audit logs for a specific admin
   */
  static async getAdminActions(req: Request, res: Response): Promise<void> {
    try {
      const { adminId } = req.params;
      const { limit = 50 } = req.query;

      const adminActions = await AuditLogQuery.getAdminActions(adminId as string, Number(limit));

      res.json({
        success: true,
        data: adminActions
      });
    } catch (error) {
      console.error('❌ Failed to get admin actions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve admin actions'
      });
    }
  }

  /**
   * Get Actions by Category
   * Retrieves audit logs filtered by category
   */
  static async getActionsByCategory(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.params;
      const { limit = 50 } = req.query;

      const actions = await AuditLogQuery.getActionsByCategory(category as string, Number(limit));

      res.json({
        success: true,
        data: actions
      });
    } catch (error) {
      console.error('❌ Failed to get actions by category:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve actions by category'
      });
    }
  }

  /**
   * Get Actions by Severity
   * Retrieves audit logs filtered by severity
   */
  static async getActionsBySeverity(req: Request, res: Response): Promise<void> {
    try {
      const { severity } = req.params;
      const { limit = 50 } = req.query;

      const actions = await AuditLogQuery.getActionsBySeverity(severity as string, Number(limit));

      res.json({
        success: true,
        data: actions
      });
    } catch (error) {
      console.error('❌ Failed to get actions by severity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve actions by severity'
      });
    }
  }

  /**
   * Get Recent Actions
   * Retrieves recent admin actions
   */
  static async getRecentActions(req: Request, res: Response): Promise<void> {
    try {
      const { hours = 24, limit = 100 } = req.query;

      const recentActions = await AuditLogQuery.getRecentActions(Number(hours), Number(limit));

      res.json({
        success: true,
        data: recentActions
      });
    } catch (error) {
      console.error('❌ Failed to get recent actions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve recent actions'
      });
    }
  }

  /**
   * Export Audit Logs
   * Exports audit logs to CSV format
   */
  static async exportAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const {
        startDate,
        endDate,
        adminId,
        severity,
        category
      } = req.query;

      // Build filter
      const filter: any = {};
      if (adminId) filter.adminId = adminId;
      if (severity) filter.severity = severity;
      if (category) filter.category = category;
      
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate as string);
        if (endDate) filter.timestamp.$lte = new Date(endDate as string);
      }

      const logs = await AdminAuditLog.find(filter)
        .sort({ timestamp: -1 })
        .lean();

      // Convert to CSV
      const csvHeaders = [
        'Timestamp',
        'Admin Email',
        'Admin Role',
        'Action',
        'Resource',
        'Severity',
        'Category',
        'Risk Level',
        'IP Address',
        'Response Status',
        'Response Time (ms)'
      ];

      const csvRows = logs.map(log => [
        log.timestamp.toISOString(),
        log.adminEmail,
        log.adminRole,
        log.action,
        log.resource,
        log.severity,
        log.category,
        log.riskLevel,
        log.details.ipAddress,
        log.details.responseStatus,
        log.details.responseTime
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=admin_audit_logs.csv');
      res.send(csvContent);
    } catch (error) {
      console.error('❌ Failed to export audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export audit logs'
      });
    }
  }

  /**
   * Get Audit Log Statistics
   * Provides detailed statistics about audit logs
   */
  static async getAuditStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { days = 30 } = req.query;
      const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

      const [
        totalLogs,
        logsByDay,
        topActions,
        topAdmins,
        riskDistribution
      ] = await Promise.all([
        AdminAuditLog.countDocuments({ timestamp: { $gte: since } }),
        AdminAuditLog.aggregate([
          { $match: { timestamp: { $gte: since } } },
          {
            $group: {
              _id: {
                year: { $year: '$timestamp' },
                month: { $month: '$timestamp' },
                day: { $dayOfMonth: '$timestamp' }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]),
        AdminAuditLog.aggregate([
          { $match: { timestamp: { $gte: since } } },
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        AdminAuditLog.aggregate([
          { $match: { timestamp: { $gte: since } } },
          { $group: { _id: '$adminEmail', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        AdminAuditLog.aggregate([
          { $match: { timestamp: { $gte: since } } },
          { $group: { _id: '$riskLevel', count: { $sum: 1 } } }
        ])
      ]);

      res.json({
        success: true,
        data: {
          summary: {
            totalLogs,
            period: { days: Number(days), from: since, to: new Date() }
          },
          trends: {
            logsByDay
          },
          topActions,
          topAdmins,
          riskDistribution
        }
      });
    } catch (error) {
      console.error('❌ Failed to get audit statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit statistics'
      });
    }
  }
}
