import mongoose, { Document, Schema } from "mongoose";

export interface IOpenAITokenUsage extends Document {
    userId: mongoose.Types.ObjectId;
    userEmail: string;
    modelName: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
    operation: string;
    timestamp: Date;
    date: string; // YYYY-MM-DD format
    month: string; // YYYY-MM format
    year: number;
    isActive: boolean;
}

const openaiTokenUsageSchema = new Schema<IOpenAITokenUsage>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    userEmail: {
        type: String,
        required: true,
        index: true
    },
    modelName: {
        type: String,
        required: true,
        index: true
    },
    promptTokens: {
        type: Number,
        required: true,
        min: 0
    },
    completionTokens: {
        type: Number,
        required: true,
        min: 0
    },
    totalTokens: {
        type: Number,
        required: true,
        min: 0
    },
    cost: {
        type: Number,
        required: true,
        min: 0
    },
    operation: {
        type: String,
        required: true,
        index: true
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },
    date: {
        type: String,
        required: true,
        index: true
    },
    month: {
        type: String,
        required: true,
        index: true
    },
    year: {
        type: Number,
        required: true,
        index: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: true,
    collection: 'openai_token_usage'
});

// Indexes for efficient querying
openaiTokenUsageSchema.index({ userId: 1, timestamp: -1 });
openaiTokenUsageSchema.index({ userEmail: 1, timestamp: -1 });
openaiTokenUsageSchema.index({ modelName: 1, timestamp: -1 });
openaiTokenUsageSchema.index({ date: 1, userId: 1 });
openaiTokenUsageSchema.index({ month: 1, userId: 1 });
openaiTokenUsageSchema.index({ year: 1, userId: 1 });
openaiTokenUsageSchema.index({ operation: 1, timestamp: -1 });
openaiTokenUsageSchema.index({ isActive: 1, timestamp: -1 });

// Pre-save middleware to set date fields
openaiTokenUsageSchema.pre('save', function(next) {
    const now = new Date();
    this.date = now.toISOString().split('T')[0] || ''; // YYYY-MM-DD
    this.month = now.toISOString().substring(0, 7) || ''; // YYYY-MM
    this.year = now.getFullYear();
    next();
});

export default mongoose.model<IOpenAITokenUsage>("OpenAITokenUsage", openaiTokenUsageSchema);
