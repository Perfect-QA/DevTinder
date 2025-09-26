import express from 'express';
import { OpenAIAdminController } from '../controllers/openaiAdminController';
import { enhancedAuth, adminAuth, adminAuthWithPermissions } from '../middlewares/enhancedAuth';
import { AdminAuditActions } from '../middlewares/adminAuditLogger';

const router = express.Router();

/**
 * OpenAI Token Usage Admin Routes
 * All routes require authentication
 */

/**
 * @swagger
 * /admin/openai/dashboard:
 *   get:
 *     summary: Get OpenAI usage dashboard statistics
 *     tags: [Admin - OpenAI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard', 
  enhancedAuth, 
  adminAuthWithPermissions(['view_analytics', 'view_tokens']),
  OpenAIAdminController.getDashboard
);

/**
 * @swagger
 * /admin/openai/top-users:
 *   get:
 *     summary: Get top users by OpenAI token usage
 *     tags: [Admin - OpenAI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of top users to return
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Top users retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/top-users', 
  enhancedAuth, 
  adminAuthWithPermissions(['view_analytics', 'view_tokens']),
  OpenAIAdminController.getTopUsers
);

/**
 * @swagger
 * /admin/openai/user/{userId}/stats:
 *   get:
 *     summary: Get user-specific OpenAI usage statistics
 *     tags: [Admin - OpenAI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/user/:userId/stats', 
  enhancedAuth, 
  adminAuthWithPermissions(['view_analytics', 'view_tokens']),
  OpenAIAdminController.getUserStats
);

/**
 * @swagger
 * /admin/openai/user/{userId}/history:
 *   get:
 *     summary: Get user OpenAI usage history
 *     tags: [Admin - OpenAI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
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
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: User history retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/user/:userId/history', 
  enhancedAuth, 
  adminAuthWithPermissions(['view_analytics', 'view_tokens']),
  OpenAIAdminController.getUserHistory
);

export default router;
