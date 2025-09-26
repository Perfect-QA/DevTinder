import express from 'express';
import { enhancedAuth, adminAuth, superAdminAuth } from '../middlewares/enhancedAuth';
import {
  createAdminUserController,
  promoteUserToAdminController,
  listAdminUsersController,
  updateAdminPermissionsController,
  removeAdminAccessController,
  getAdminUserController,
  addPermissionController,
  removePermissionController,
  resetPermissionsController,
  getAvailablePermissionsController
} from '../controllers/adminUserController';

const adminUsersRouter = express.Router();

// ==================== ADMIN USER MANAGEMENT ROUTES ====================

/**
 * Create New Admin User
 * POST /admin/users/create-admin
 * Requires: superadmin role
 * Body: { firstName, lastName, emailId, password, role?, permissions? }
 */
adminUsersRouter.post('/create-admin', enhancedAuth, superAdminAuth, createAdminUserController);

/**
 * Promote Existing User to Admin
 * POST /admin/users/promote
 * Requires: superadmin role
 * Body: { userEmail, role?, permissions? }
 */
adminUsersRouter.post('/promote', enhancedAuth, superAdminAuth, promoteUserToAdminController);

/**
 * List All Admin Users
 * GET /admin/users/list
 * Requires: admin role
 * Query: { page?, limit?, role? }
 */
adminUsersRouter.get('/list', enhancedAuth, adminAuth, listAdminUsersController);

/**
 * Get Specific Admin User Details
 * GET /admin/users/:userId
 * Requires: admin role
 */
adminUsersRouter.get('/:userId', enhancedAuth, adminAuth, getAdminUserController);

/**
 * Update Admin Permissions
 * PUT /admin/users/:userId/permissions
 * Requires: superadmin role
 * Body: { permissions?, role? }
 */
adminUsersRouter.put('/:userId/permissions', enhancedAuth, superAdminAuth, updateAdminPermissionsController);

/**
 * Remove Admin Access
 * DELETE /admin/users/:userId
 * Requires: superadmin role
 * Note: Cannot remove own admin access
 */
adminUsersRouter.delete('/:userId', enhancedAuth, superAdminAuth, removeAdminAccessController);

// ==================== PERMISSION MANAGEMENT ROUTES ====================

/**
 * Add Permission to Admin User
 * POST /admin/users/:userId/permissions/add
 * Requires: superadmin role
 * Body: { permission: string }
 */
adminUsersRouter.post('/:userId/permissions/add', enhancedAuth, superAdminAuth, addPermissionController);

/**
 * Remove Permission from Admin User
 * POST /admin/users/:userId/permissions/remove
 * Requires: superadmin role
 * Body: { permission: string }
 */
adminUsersRouter.post('/:userId/permissions/remove', enhancedAuth, superAdminAuth, removePermissionController);

/**
 * Reset Admin Permissions to Default
 * POST /admin/users/:userId/permissions/reset
 * Requires: superadmin role
 */
adminUsersRouter.post('/:userId/permissions/reset', enhancedAuth, superAdminAuth, resetPermissionsController);

/**
 * Get Available Permissions
 * GET /admin/users/permissions/available
 * Requires: admin role
 */
adminUsersRouter.get('/permissions/available', enhancedAuth, adminAuth, getAvailablePermissionsController);

export default adminUsersRouter;
