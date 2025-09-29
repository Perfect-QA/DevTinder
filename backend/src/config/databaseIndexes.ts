import mongoose from 'mongoose';
import { logger } from '../middlewares/logging';

export interface IndexDefinition {
  collection: string;
  index: Record<string, 1 | -1 | 'text'>;
  options?: {
    unique?: boolean;
    sparse?: boolean;
    background?: boolean;
    name?: string;
    partialFilterExpression?: Record<string, any>;
  };
}

const indexDefinitions: IndexDefinition[] = [
  // User collection indexes
  {
    collection: 'users',
    index: { emailId: 1 },
    options: { unique: true, name: 'emailId_unique' },
  },
  {
    collection: 'users',
    index: { 'activeSessions.sessionId': 1 },
    options: { name: 'activeSessions_sessionId' },
  },
  {
    collection: 'users',
    index: { 'activeSessions.deviceId': 1 },
    options: { name: 'activeSessions_deviceId' },
  },
  {
    collection: 'users',
    index: { 'activeSessions.lastActivity': 1 },
    options: { name: 'activeSessions_lastActivity' },
  },
  {
    collection: 'users',
    index: { createdAt: 1 },
    options: { name: 'createdAt_asc' },
  },
  {
    collection: 'users',
    index: { updatedAt: 1 },
    options: { name: 'updatedAt_asc' },
  },

  // Test cases collection indexes (if you create a separate collection)
  {
    collection: 'testcases',
    index: { userId: 1 },
    options: { name: 'userId_index' },
  },
  {
    collection: 'testcases',
    index: { priority: 1 },
    options: { name: 'priority_index' },
  },
  {
    collection: 'testcases',
    index: { createdAt: -1 },
    options: { name: 'createdAt_desc' },
  },
  {
    collection: 'testcases',
    index: { userId: 1, createdAt: -1 },
    options: { name: 'userId_createdAt_compound' },
  },
  {
    collection: 'testcases',
    index: { 'summary': 'text', 'steps': 'text', 'expectedResult': 'text' },
    options: { name: 'text_search' },
  },

  // File uploads collection indexes (if you create a separate collection)
  {
    collection: 'fileuploads',
    index: { userId: 1 },
    options: { name: 'userId_index' },
  },
  {
    collection: 'fileuploads',
    index: { originalName: 1 },
    options: { name: 'originalName_index' },
  },
  {
    collection: 'fileuploads',
    index: { mimetype: 1 },
    options: { name: 'mimetype_index' },
  },
  {
    collection: 'fileuploads',
    index: { uploadedAt: -1 },
    options: { name: 'uploadedAt_desc' },
  },
  {
    collection: 'fileuploads',
    index: { userId: 1, uploadedAt: -1 },
    options: { name: 'userId_uploadedAt_compound' },
  },

  // Session management indexes
  {
    collection: 'sessions',
    index: { expires: 1 },
    options: { 
      name: 'expires_ttl',
      background: true,
    },
  },
  {
    collection: 'sessions',
    index: { 'session.userId': 1 },
    options: { name: 'session_userId' },
  },

  // API request logs indexes (if you create a logging collection)
  {
    collection: 'apilogs',
    index: { timestamp: -1 },
    options: { name: 'timestamp_desc' },
  },
  {
    collection: 'apilogs',
    index: { userId: 1, timestamp: -1 },
    options: { name: 'userId_timestamp_compound' },
  },
  {
    collection: 'apilogs',
    index: { method: 1, url: 1 },
    options: { name: 'method_url_compound' },
  },
  {
    collection: 'apilogs',
    index: { statusCode: 1 },
    options: { name: 'statusCode_index' },
  },

  // OpenAI token usage collection indexes
  {
    collection: 'openai_token_usage',
    index: { userId: 1, timestamp: -1 },
    options: { name: 'userId_timestamp_compound' },
  },
  {
    collection: 'openai_token_usage',
    index: { userEmail: 1, timestamp: -1 },
    options: { name: 'userEmail_timestamp_compound' },
  },
  {
    collection: 'openai_token_usage',
    index: { modelName: 1, timestamp: -1 },
    options: { name: 'modelName_timestamp_compound' },
  },
  {
    collection: 'openai_token_usage',
    index: { date: 1, userId: 1 },
    options: { name: 'date_userId_compound' },
  },
  {
    collection: 'openai_token_usage',
    index: { month: 1, userId: 1 },
    options: { name: 'month_userId_compound' },
  },
  {
    collection: 'openai_token_usage',
    index: { year: 1, userId: 1 },
    options: { name: 'year_userId_compound' },
  },
  {
    collection: 'openai_token_usage',
    index: { operation: 1, timestamp: -1 },
    options: { name: 'operation_timestamp_compound' },
  },
  {
    collection: 'openai_token_usage',
    index: { isActive: 1, timestamp: -1 },
    options: { name: 'isActive_timestamp_compound' },
  },
  {
    collection: 'openai_token_usage',
    index: { timestamp: -1 },
    options: { name: 'timestamp_desc' },
  },
];

export const createIndexes = async (): Promise<void> => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    logger.info('Creating database indexes...');

    for (const definition of indexDefinitions) {
      try {
        // Check if collection exists first
        const collections = await db.listCollections({ name: definition.collection }).toArray();
        if (collections.length === 0) {
          // Skip silently for non-existent collections
          continue;
        }

        const collection = db.collection(definition.collection);
        
        // Check if index already exists
        const existingIndexes = await collection.indexes();
        const indexName = definition.options?.name || 
          Object.entries(definition.index)
            .map(([key, value]) => `${key}_${value}`)
            .join('_');

        const indexExists = existingIndexes.some(index => index.name === indexName);

        if (!indexExists) {
          await collection.createIndex(definition.index, definition.options);
          // Only log important index creations
          if (definition.options?.unique) {
            logger.info(`Created unique index: ${indexName} on collection: ${definition.collection}`);
          }
        }
        // Skip logging for existing indexes
      } catch (error: any) {
        // Only log critical errors, skip index conflicts
        const errorMessage = error?.message || String(error);
        if (!errorMessage.includes('Index already exists') && !errorMessage.includes('IndexOptionsConflict')) {
          logger.error(`Failed to create index for collection ${definition.collection}:`, error);
        }
        // Continue with other indexes even if one fails
      }
    }

    // Only log if there were any issues, otherwise skip
  } catch (error) {
    logger.error('Failed to create database indexes:', error);
    throw error;
  }
};

export const dropIndexes = async (): Promise<void> => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    logger.info('Dropping database indexes...');

    for (const definition of indexDefinitions) {
      try {
        const collection = db.collection(definition.collection);
        const indexName = definition.options?.name || 
          Object.entries(definition.index)
            .map(([key, value]) => `${key}_${value}`)
            .join('_');

        await collection.dropIndex(indexName);
        logger.info(`Dropped index: ${indexName} from collection: ${definition.collection}`);
      } catch (error) {
        logger.debug(`Index ${definition.options?.name} may not exist:`, error);
        // Continue with other indexes even if one fails
      }
    }

    logger.info('Database indexes dropped');
  } catch (error) {
    logger.error('Failed to drop database indexes:', error);
    throw error;
  }
};

export const getIndexStats = async (): Promise<any> => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const stats: any = {};

    for (const definition of indexDefinitions) {
      try {
        const collection = db.collection(definition.collection);
        const indexes = await collection.indexes();
        stats[definition.collection] = indexes.map(index => ({
          name: index.name,
          key: index.key,
          unique: index.unique,
          sparse: index.sparse,
        }));
      } catch (error) {
        logger.error(`Failed to get index stats for collection ${definition.collection}:`, error);
        stats[definition.collection] = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return stats;
  } catch (error) {
    logger.error('Failed to get index stats:', error);
    throw error;
  }
};
