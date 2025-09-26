/**
 * Centralized logging utility
 * Provides consistent logging across the application
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  operation?: string;
  [key: string]: any;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${Object.entries(context).map(([k, v]) => `${k}=${v}`).join(', ')}]` : '';
    return `${timestamp} [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    const formattedMessage = this.formatMessage(LogLevel.ERROR, message, context);
    console.error(`❌ ${formattedMessage}`, error || '');
  }

  warn(message: string, context?: LogContext): void {
    const formattedMessage = this.formatMessage(LogLevel.WARN, message, context);
    console.warn(`⚠️ ${formattedMessage}`);
  }

  info(message: string, context?: LogContext): void {
    const formattedMessage = this.formatMessage(LogLevel.INFO, message, context);
    console.log(`ℹ️ ${formattedMessage}`);
  }

  debug(message: string, context?: LogContext): void {
    const formattedMessage = this.formatMessage(LogLevel.DEBUG, message, context);
    console.log(`🔍 ${formattedMessage}`);
  }

  // Convenience methods for common patterns
  operationFailed(operation: string, error: unknown, context?: LogContext): void {
    this.error(`Failed to ${operation}`, error, { operation, ...context });
  }

  operationSuccess(operation: string, context?: LogContext): void {
    this.info(`${operation} completed successfully`, { operation, ...context });
  }

  apiRequest(method: string, endpoint: string, context?: LogContext): void {
    this.info(`API Request: ${method} ${endpoint}`, { method, endpoint, ...context });
  }

  apiResponse(method: string, endpoint: string, statusCode: number, context?: LogContext): void {
    this.info(`API Response: ${method} ${endpoint} - ${statusCode}`, { method, endpoint, statusCode, ...context });
  }
}

export const logger = new Logger();

// Convenience exports for common patterns
export const logError = (message: string, error?: unknown, context?: LogContext) => logger.error(message, error, context);
export const logWarn = (message: string, context?: LogContext) => logger.warn(message, context);
export const logInfo = (message: string, context?: LogContext) => logger.info(message, context);
export const logDebug = (message: string, context?: LogContext) => logger.debug(message, context);
export const logOperationFailed = (operation: string, error: unknown, context?: LogContext) => logger.operationFailed(operation, error, context);
export const logOperationSuccess = (operation: string, context?: LogContext) => logger.operationSuccess(operation, context);
