import { Request, Response } from 'express';
import openaiTokenService from '../services/openaiTokenService';

export class OpenAIAdminController {
    /**
     * Get admin dashboard statistics
     * GET /admin/openai/dashboard
     */
    static async getDashboard(req: Request, res: Response): Promise<void> {
        try {
            const { startDate, endDate } = req.query;
            
            const filter: any = {};
            
            if (startDate && endDate) {
                filter.startDate = new Date(startDate as string);
                filter.endDate = new Date(endDate as string);
            }

            const stats = await openaiTokenService.getAdminStats(filter.startDate, filter.endDate);
            
            res.json({
                success: true,
                data: stats,
                message: 'OpenAI usage statistics retrieved successfully'
            });
        } catch (error) {
            console.error('❌ OpenAI dashboard error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get OpenAI usage statistics',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get top users by token usage
     * GET /admin/openai/top-users
     */
    static async getTopUsers(req: Request, res: Response): Promise<void> {
        try {
            const { limit = 10, startDate, endDate } = req.query;
            
            const filter: any = {};
            
            if (startDate && endDate) {
                filter.startDate = new Date(startDate as string);
                filter.endDate = new Date(endDate as string);
            }

            const topUsers = await openaiTokenService.getTopUsers(Number(limit), filter.startDate, filter.endDate);
            
            res.json({
                success: true,
                data: topUsers,
                message: `Top ${limit} users retrieved successfully`
            });
        } catch (error) {
            console.error('❌ Top users error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get top users',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get user-specific usage statistics
     * GET /admin/openai/user/:userId/stats
     */
    static async getUserStats(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req.params;
            const { startDate, endDate } = req.query;
            
            let startDateObj: Date | undefined;
            let endDateObj: Date | undefined;
            
            if (startDate && endDate) {
                startDateObj = new Date(startDate as string);
                endDateObj = new Date(endDate as string);
            }

            const stats = await openaiTokenService.getUserTotalUsage(userId || '', startDateObj, endDateObj);
            
            res.json({
                success: true,
                data: stats,
                message: `Usage statistics for user ${userId} retrieved successfully`
            });
        } catch (error) {
            console.error('❌ User stats error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get user statistics',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get user usage history
     * GET /admin/openai/user/:userId/history
     */
    static async getUserHistory(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req.params;
            const { page = 1, limit = 50 } = req.query;

            const history = await openaiTokenService.getUserHistory(
                userId || '', 
                Number(page), 
                Number(limit)
            );
            
            res.json({
                success: true,
                data: history,
                message: `Usage history for user ${userId} retrieved successfully`
            });
        } catch (error) {
            console.error('❌ User history error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get user usage history',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
