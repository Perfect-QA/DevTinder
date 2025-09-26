import express from 'express';
import { AdminAuditController } from '../controllers/adminAuditController';
import { userAuth } from '../middlewares/authmiddleware';
import { 
  adminAuthWithPermissions, 
  adminAuthWithAudit,
  superAdminOnly 
} from '../middlewares/adminAuth';
import { AdminAuditActions, adminAuditLogger } from '../middlewares/adminAuditLogger';

const router = express.Router();

/**
 * Admin Audit Log Routes
 * All routes require admin authentication and specific permissions
 */

/**
 * @swagger
 * /admin/audit/logs:
 *   get:
 *     summary: Get admin audit logs with filtering and pagination
 *     tags: [Admin - Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of logs per page
 *       - in: query
 *         name: adminId
 *         schema:
 *           type: string
 *         description: Filter by admin ID
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by severity
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [authentication, user_management, data_access, system_config, security, api_usage]
 *         description: Filter by category
 *       - in: query
 *         name: riskLevel
 *         schema:
 *           type: string
 *           enum: [safe, suspicious, high_risk]
 *         description: Filter by risk level
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/logs', 
  userAuth, 
  adminAuthWithPermissions(['view_audit_logs']),
  adminAuditLogger(AdminAuditActions.VIEW_SENSITIVE_DATA),
  AdminAuditController.getAuditLogs
);

/**
 * @swagger
 * /admin/audit/high-risk:
 *   get:
 *     summary: Get high-risk admin actions
 *     tags: [Admin - Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of high-risk actions to return
 *     responses:
 *       200:
 *         description: High-risk actions retrieved successfully
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/high-risk', 
  userAuth, 
  adminAuthWithPermissions(['view_audit_logs', 'view_security_alerts']),
  adminAuditLogger(AdminAuditActions.SECURITY_ALERT),
  AdminAuditController.getHighRiskActions
);

/**
 * @swagger
 * /admin/audit/summary:
 *   get:
 *     summary: Get admin activity summary
 *     tags: [Admin - Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to include in summary
 *     responses:
 *       200:
 *         description: Activity summary retrieved successfully
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/summary', 
  userAuth, 
  adminAuthWithPermissions(['view_analytics', 'view_audit_logs']),
  adminAuditLogger(AdminAuditActions.VIEW_SENSITIVE_DATA),
  AdminAuditController.getActivitySummary
);

/**
 * @swagger
 * /admin/audit/admin/{adminId}:
 *   get:
 *     summary: Get audit logs for a specific admin
 *     tags: [Admin - Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of logs to return
 *     responses:
 *       200:
 *         description: Admin actions retrieved successfully
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/admin/:adminId', 
  userAuth, 
  adminAuthWithPermissions(['view_audit_logs']),
  adminAuditLogger(AdminAuditActions.VIEW_SENSITIVE_DATA),
  AdminAuditController.getAdminActions
);

/**
 * @swagger
 * /admin/audit/category/{category}:
 *   get:
 *     summary: Get audit logs by category
 *     tags: [Admin - Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [authentication, user_management, data_access, system_config, security, api_usage]
 *         description: Category to filter by
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of logs to return
 *     responses:
 *       200:
 *         description: Category actions retrieved successfully
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/category/:category', 
  userAuth, 
  adminAuthWithPermissions(['view_audit_logs']),
  adminAuditLogger(AdminAuditActions.VIEW_SENSITIVE_DATA),
  AdminAuditController.getActionsByCategory
);

/**
 * @swagger
 * /admin/audit/severity/{severity}:
 *   get:
 *     summary: Get audit logs by severity
 *     tags: [Admin - Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: severity
 *         required: true
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Severity to filter by
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of logs to return
 *     responses:
 *       200:
 *         description: Severity actions retrieved successfully
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/severity/:severity', 
  userAuth, 
  adminAuthWithPermissions(['view_audit_logs']),
  adminAuditLogger(AdminAuditActions.VIEW_SENSITIVE_DATA),
  AdminAuditController.getActionsBySeverity
);

/**
 * @swagger
 * /admin/audit/recent:
 *   get:
 *     summary: Get recent admin actions
 *     tags: [Admin - Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           default: 24
 *         description: Number of hours to look back
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of logs to return
 *     responses:
 *       200:
 *         description: Recent actions retrieved successfully
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/recent', 
  userAuth, 
  adminAuthWithPermissions(['view_audit_logs']),
  adminAuditLogger(AdminAuditActions.VIEW_SENSITIVE_DATA),
  AdminAuditController.getRecentActions
);

/**
 * @swagger
 * /admin/audit/export:
 *   get:
 *     summary: Export audit logs to CSV
 *     tags: [Admin - Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for export
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for export
 *       - in: query
 *         name: adminId
 *         schema:
 *           type: string
 *         description: Filter by admin ID
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by severity
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [authentication, user_management, data_access, system_config, security, api_usage]
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: CSV file downloaded successfully
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/export', 
  userAuth, 
  adminAuthWithPermissions(['export_data', 'view_audit_logs']),
  adminAuditLogger(AdminAuditActions.EXPORT_DATA),
  AdminAuditController.exportAuditLogs
);

/**
 * @swagger
 * /admin/audit/statistics:
 *   get:
 *     summary: Get detailed audit log statistics
 *     tags: [Admin - Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to include in statistics
 *     responses:
 *       200:
 *         description: Audit statistics retrieved successfully
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/statistics', 
  userAuth, 
  adminAuthWithPermissions(['view_analytics', 'view_audit_logs']),
  adminAuditLogger(AdminAuditActions.VIEW_SENSITIVE_DATA),
  AdminAuditController.getAuditStatistics
);

export default router;
