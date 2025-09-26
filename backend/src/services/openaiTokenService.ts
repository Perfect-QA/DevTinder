import OpenAITokenUsage, { IOpenAITokenUsage } from '../models/openaiTokenUsage';

export interface OpenAIUsageData {
    userId: string;
    userEmail: string;
    modelName: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
    operation: string;
}

class OpenAITokenService {
    /**
     * Record OpenAI token usage
     */
    async recordUsage(usageData: OpenAIUsageData): Promise<IOpenAITokenUsage> {
        try {
            const tokenUsage = new OpenAITokenUsage({
                ...usageData,
                timestamp: new Date()
            });

            await tokenUsage.save();
            
            return tokenUsage;
        } catch (error) {
            console.error('❌ Failed to record OpenAI token usage:', error);
            throw new Error('Failed to record OpenAI token usage');
        }
    }

    /**
     * Get user's total token usage
     */
    async getUserTotalUsage(userId: string, startDate?: Date, endDate?: Date): Promise<{
        totalTokens: number;
        totalCost: number;
        totalRequests: number;
    }> {
        try {
            const query: any = { userId, isActive: true };
            
            if (startDate && endDate) {
                query.timestamp = { $gte: startDate, $lte: endDate };
            }

            const result = await OpenAITokenUsage.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        totalTokens: { $sum: '$totalTokens' },
                        totalCost: { $sum: '$cost' },
                        totalRequests: { $sum: 1 }
                    }
                }
            ]);

            if (result.length === 0) {
                return { totalTokens: 0, totalCost: 0, totalRequests: 0 };
            }

            return result[0];
        } catch (error) {
            console.error('❌ Failed to get user total usage:', error);
            throw new Error('Failed to get user total usage');
        }
    }

    /**
     * Get admin dashboard statistics
     */
    async getAdminStats(startDate?: Date, endDate?: Date): Promise<{
        totalTokens: number;
        totalCost: number;
        totalRequests: number;
        uniqueUsers: number;
    }> {
        try {
            const query: any = { isActive: true };
            
            if (startDate && endDate) {
                query.timestamp = { $gte: startDate, $lte: endDate };
            }

            const result = await OpenAITokenUsage.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        totalTokens: { $sum: '$totalTokens' },
                        totalCost: { $sum: '$cost' },
                        totalRequests: { $sum: 1 },
                        uniqueUsers: { $addToSet: '$userId' }
                    }
                },
                {
                    $addFields: {
                        uniqueUsers: { $size: '$uniqueUsers' }
                    }
                }
            ]);

            if (result.length === 0) {
                return { totalTokens: 0, totalCost: 0, totalRequests: 0, uniqueUsers: 0 };
            }

            return result[0];
        } catch (error) {
            console.error('❌ Failed to get admin stats:', error);
            throw new Error('Failed to get admin stats');
        }
    }

    /**
     * Get top users by token usage
     */
    async getTopUsers(limit: number = 10, startDate?: Date, endDate?: Date): Promise<any[]> {
        try {
            const query: any = { isActive: true };
            
            if (startDate && endDate) {
                query.timestamp = { $gte: startDate, $lte: endDate };
            }

            const result = await OpenAITokenUsage.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: '$userId',
                        userEmail: { $first: '$userEmail' },
                        totalTokens: { $sum: '$totalTokens' },
                        totalCost: { $sum: '$cost' },
                        totalRequests: { $sum: 1 }
                    }
                },
                { $sort: { totalTokens: -1 } },
                { $limit: limit }
            ]);

            return result;
        } catch (error) {
            console.error('❌ Failed to get top users:', error);
            throw new Error('Failed to get top users');
        }
    }

    /**
     * Get user usage history
     */
    async getUserHistory(userId: string, page: number = 1, limit: number = 50): Promise<{
        data: IOpenAITokenUsage[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        try {
            const skip = (page - 1) * limit;
            
            const [data, total] = await Promise.all([
                OpenAITokenUsage.find({ userId, isActive: true })
                    .sort({ timestamp: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                OpenAITokenUsage.countDocuments({ userId, isActive: true })
            ]);

            return {
                data,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            };
        } catch (error) {
            console.error('❌ Failed to get user history:', error);
            throw new Error('Failed to get user history');
        }
    }
}

export default new OpenAITokenService();
