import mongoose from "mongoose";
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async (): Promise<void> => {
    try {
        // Use MONGO_URL (primary) or DB_URL (fallback) from your env.example
        const mongoUri = process.env.MONGO_URL || process.env.DB_URL;
        
        if (!mongoUri) {
            throw new Error("MongoDB URI not found in environment variables. Please set MONGO_URL or DB_URL");
        }

        // Optimized connection options for faster connection
        const options = {
            // Connection timeout settings (reduce from default 30s to 5s)
            serverSelectionTimeoutMS: 5000, // 5 seconds
            connectTimeoutMS: 5000, // 5 seconds
            socketTimeoutMS: 45000, // 45 seconds
            
            // Connection pool optimization
            maxPoolSize: 10, // Maintain up to 10 socket connections
            minPoolSize: 5, // Maintain a minimum of 5 socket connections
            maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
            
            // Retry settings
            retryWrites: true,
            retryReads: true,
        };

        await mongoose.connect(mongoUri, options);
        
        // Configure Mongoose-specific settings after connection
        mongoose.set('bufferCommands', false); // Disable mongoose buffering
        
        console.log("MongoDB connection established");
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });
        
        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
        });
        
    } catch (error) {
        console.error("MongoDB connection error:", error);
        throw error;
    }
}

export { connectDB };
