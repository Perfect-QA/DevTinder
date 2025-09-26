import { Request, Response, NextFunction } from 'express';
import openaiTokenService, { OpenAIUsageData } from '../services/openaiTokenService';
import { AuthenticatedRequest } from '../types';

/**
 * Simple middleware to track OpenAI token usage
 */

export const trackOpenAIUsage = (operation: string = 'api_call') => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const startTime = Date.now();
        const originalSend = res.send;
        const originalJson = res.json;

        // Store original response data
        let responseData: any;
        let responseSent = false;

        // Override res.send to capture response
        res.send = function(data: any) {
            if (!responseSent) {
                responseData = data;
                responseSent = true;
            }
            return originalSend.call(this, data);
        };

        // Override res.json to capture response
        res.json = function(data: any) {
            if (!responseSent) {
                responseData = data;
                responseSent = true;
            }
            return originalJson.call(this, data);
        };

        // Track the request
        res.on('finish', async () => {
            try {
                // Only track if user is authenticated and request was successful
                if (req.user && res.statusCode >= 200 && res.statusCode < 400) {
                    // Extract token usage from response if available
                    let promptTokens = 0;
                    let completionTokens = 0;
                    let totalTokens = 0;

                    // Try to extract token usage from OpenAI response format
                    if (responseData && typeof responseData === 'object') {
                        if (responseData.usage) {
                            promptTokens = responseData.usage.prompt_tokens || 0;
                            completionTokens = responseData.usage.completion_tokens || 0;
                            totalTokens = responseData.usage.total_tokens || 0;
                        }
                    }

                    // If no tokens found in response, skip tracking
                    if (totalTokens === 0) {
                        return;
                    }

                    // Calculate cost using OpenAI GPT-3.5-turbo pricing
                    const modelName = responseData.model || 'gpt-3.5-turbo';
                    
                    // GPT-3.5-turbo pricing (most commonly used model)
                    const costPerInputToken = 0.0000005;   // $0.50 per 1M tokens
                    const costPerOutputToken = 0.0000015;  // $1.50 per 1M tokens
                    
                    const cost = (promptTokens * costPerInputToken) + (completionTokens * costPerOutputToken);

                    // Prepare usage data
                    const usageData: OpenAIUsageData = {
                        userId: req.user._id || req.user.id,
                        userEmail: req.user.emailId || 'unknown@example.com',
                        modelName: modelName, // Use actual model from response
                        promptTokens,
                        completionTokens,
                        totalTokens,
                        cost,
                        operation
                    };

                    // Record usage asynchronously (don't block response)
                    setImmediate(async () => {
                        try {
                            await openaiTokenService.recordUsage(usageData);
                            console.log(`📊 OpenAI usage tracked: ${totalTokens} tokens, $${cost.toFixed(4)} for ${operation}`);
                        } catch (error) {
                            console.error('❌ Failed to track OpenAI usage:', error);
                        }
                    });
                }
            } catch (error) {
                console.error('❌ OpenAI token tracking error:', error);
            }
        });

        next();
    };
};

/**
 * Utility function to manually record OpenAI token usage
 */
export const recordOpenAIUsage = async (usageData: OpenAIUsageData): Promise<void> => {
    try {
        await openaiTokenService.recordUsage(usageData);
        console.log(`📊 Manual OpenAI usage recorded: ${usageData.totalTokens} tokens, $${usageData.cost.toFixed(4)}`);
    } catch (error) {
        console.error('❌ Failed to record manual OpenAI usage:', error);
        throw error;
    }
};
