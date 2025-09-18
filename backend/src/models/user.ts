import mongoose, { Document, Schema } from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";
import * as jwt from 'jsonwebtoken';
import { getSessionExpiryDate } from '../utils/sessionUtils';

// DRY: Common field validation functions
const validateEmail = (value: string): void => {
    if(!validator.isEmail(value)){
        throw new Error("Invalid email address: " + value);
    }
};

const validateStrongPassword = (value: string): void => {
    if(!validator.isStrongPassword(value)){
        throw new Error("Create strong password: " + value);
    }
};

const validateURL = (value: string): void => {
    if(value && !validator.isURL(value)){
        throw new Error("Invalid URL: " + value);
    }
};

const validateGender = (value: string): void => {
    if(value && !["Male", "Female", "Other"].includes(value)){
        throw new Error("Invalid gender");
    }
};

export interface IUser extends Document {
    firstName: string;
    lastName: string;
    emailId: string;
    password: string;
    age?: number;
    gender?: string;
    photoUrl?: string;
    about?: string;
    // Security fields
    failedLoginAttempts: number;
    isLocked: boolean;
    lockUntil?: Date;
    lastLogin?: Date;
    loginIP?: string;
    loginCount: number;
    resetPasswordToken?: string;
    resetPasswordExpiry?: Date;
    // JWT refresh token
    refreshToken?: string;
    refreshTokenExpiry?: Date;
    // Session and device management
    activeSessions: Array<{
        sessionId: string;
        deviceId: string;
        deviceName: string;
        deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
        userAgent: string;
        ipAddress: string;
        location?: string;
        lastActivity: Date;
        createdAt: Date;
        isActive: boolean;
    }>;
    // OAuth fields
    googleId?: string;
    githubId?: string;
    provider: 'local' | 'google' | 'github';
    // OAuth refresh tokens
    googleRefreshToken?: string;
    githubRefreshToken?: string;
    // OAuth access tokens (for API calls)
    googleAccessToken?: string;
    githubAccessToken?: string;
    // OAuth token expiry
    googleTokenExpiry?: Date;
    githubTokenExpiry?: Date;
    // OAuth profile data
    googleProfileUrl?: string;
    githubProfileUrl?: string;
    githubUsername?: string;
    // OAuth consent and scope tracking
    oauthScopes: string[];
    oauthConsentDate?: Date;
    // Account verification status
    isEmailVerified: boolean;
    emailVerificationToken?: string;
    emailVerificationExpiry?: Date;
    // Additional security fields
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    // OAuth account status
    oauthAccountsLinked: string[];
    // Last OAuth provider used
    lastOAuthProvider?: 'google' | 'github' | 'local';
    // Methods
    getJWT(): string;
    validatePassword(passwordInputByUser: string): Promise<boolean>;
    isAccountLocked(): boolean;
    getLockTimeRemaining(): number;
    generateRefreshToken(): string;
    validateRefreshToken(token: string): boolean;
    addSession(sessionId: string, deviceId: string, deviceName: string, userAgent: string, ipAddress: string): void;
    removeSession(sessionId: string): void;
    updateSessionActivity(sessionId: string): void;
    getActiveSessions(): any[];
    getSessionById(sessionId: string): any;
    removeAllSessions(): void;
    cleanupExpiredSessions(): number;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>({
    firstName: {
        type: String,
        trim: true,
        required: true
    },
    lastName: {
        type: String,
        trim: true,
        required: true
    },
    emailId:{
        type: String,
        lowercase: true,
        required: true,
        trim: true,
        unique: true,
        validate: validateEmail
    },
    password: {
        type: String,
        trim: true,
        required: true,
        validate: validateStrongPassword
    },
    age: {
        type: Number,
        trim: true,
        min: 18
    },
    gender:{
        type: String,
        trim: true,
        validate: validateGender
    },
    photoUrl :{
        type: String,
        trim: true,
        validate: validateURL,
        default: "https://www.pngitem.com/pimgs/m/150-1503945_transparent-user-png-default-user-image-png-png.png"
    },
    about:{
        trim:true,
        type: String
    },
    // Security fields
    failedLoginAttempts: {
        type: Number,
        default: 0
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    lockUntil: {
        type: Date
    },
    lastLogin: {
        type: Date
    },
    loginIP: {
        type: String
    },
    loginCount: {
        type: Number,
        default: 0
    },
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpiry: {
        type: Date
    },
    // JWT refresh token
    refreshToken: {
        type: String
    },
    refreshTokenExpiry: {
        type: Date
    },
    // Session and device management
    activeSessions: [{
        sessionId: {
            type: String,
            required: true
        },
        deviceId: {
            type: String,
            required: true
        },
        deviceName: {
            type: String,
            required: true
        },
        deviceType: {
            type: String,
            enum: ['desktop', 'mobile', 'tablet', 'unknown'],
            default: 'unknown'
        },
        userAgent: {
            type: String,
            required: true
        },
        ipAddress: {
            type: String,
            required: true
        },
        location: {
            type: String
        },
        lastActivity: {
            type: Date,
            default: Date.now
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    // OAuth fields
    googleId: {
        type: String,
        sparse: true
    },
    githubId: {
        type: String,
        sparse: true
    },
    provider: {
        type: String,
        enum: ['local', 'google', 'github'],
        default: 'local'
    },
    // OAuth refresh tokens
    googleRefreshToken: {
        type: String
    },
    githubRefreshToken: {
        type: String
    },
    // OAuth access tokens (for API calls)
    googleAccessToken: {
        type: String
    },
    githubAccessToken: {
        type: String
    },
    // OAuth token expiry
    googleTokenExpiry: {
        type: Date
    },
    githubTokenExpiry: {
        type: Date
    },
    // OAuth profile data
    googleProfileUrl: {
        type: String,
        validate: validateURL
    },
    githubProfileUrl: {
        type: String,
        validate: validateURL
    },
    githubUsername: {
        type: String
    },
    // OAuth consent and scope tracking
    oauthScopes: {
        type: [String],
        default: []
    },
    oauthConsentDate: {
        type: Date
    },
    // Account verification status
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: {
        type: String
    },
    emailVerificationExpiry: {
        type: Date
    },
    // Additional security fields
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: {
        type: String
    },
    // OAuth account status
    oauthAccountsLinked: {
        type: [String],
        default: []
    },
    // Last OAuth provider used
    lastOAuthProvider: {
        type: String,
        enum: ['google', 'github', 'local']
    }

}, {timestamps:true, collection: 'users'});

userSchema.methods.getJWT = function(): string {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET is not configured');
    }
    const token = jwt.sign({ userId: this._id }, jwtSecret, { expiresIn: process.env.JWT_EXPIRY! } as jwt.SignOptions);
    return token;
}

userSchema.methods.validatePassword = async function(passwordInputByUser: string): Promise<boolean> {
    const user = this as IUser;
    const passwordHash = user.password;
    const isPasswordValid = await bcrypt.compare(passwordInputByUser, passwordHash);
    return isPasswordValid;
}

userSchema.methods.isAccountLocked = function(): boolean {
    const user = this as IUser;
    return !!(user.isLocked && user.lockUntil && user.lockUntil > new Date());
}

userSchema.methods.getLockTimeRemaining = function(): number {
    const user = this as IUser;
    if (!user.isLocked || !user.lockUntil) return 0;
    return Math.ceil((user.lockUntil.getTime() - new Date().getTime()) / (1000 * 60)); // minutes
}

userSchema.methods.generateRefreshToken = function(): string {
    const user = this as IUser;
    const refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshTokenSecret) {
        throw new Error('JWT_REFRESH_SECRET is not configured');
    }
    
    const refreshToken = jwt.sign(
        { userId: user._id, type: 'refresh' }, 
        refreshTokenSecret, 
        { expiresIn: '7d' } as jwt.SignOptions
    );
    
    // Store refresh token in user document
    user.refreshToken = refreshToken;
    user.refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    return refreshToken;
}

userSchema.methods.validateRefreshToken = function(token: string): boolean {
    const user = this as IUser;
    const refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshTokenSecret) {
        return false;
    }
    
    try {
        const decoded = jwt.verify(token, refreshTokenSecret) as any;
        return decoded.userId === (user._id as any).toString() && 
               decoded.type === 'refresh' && 
               user.refreshToken === token &&
               !!(user.refreshTokenExpiry && user.refreshTokenExpiry > new Date());
    } catch (error) {
        return false;
    }
}

userSchema.methods.addSession = function(sessionId: string, deviceId: string, deviceName: string, userAgent: string, ipAddress: string): void {
    const user = this as IUser;
    
    // Detect device type from user agent
    const deviceType = this.detectDeviceType(userAgent);
    
    // Check if session already exists
    const existingSessionIndex = user.activeSessions.findIndex(session => session.sessionId === sessionId);
    
    if (existingSessionIndex >= 0) {
        // Update existing session
        user.activeSessions[existingSessionIndex].lastActivity = new Date();
        user.activeSessions[existingSessionIndex].isActive = true;
        user.activeSessions[existingSessionIndex].ipAddress = ipAddress;
    } else {
        // Add new session
        user.activeSessions.push({
            sessionId,
            deviceId,
            deviceName,
            deviceType,
            userAgent,
            ipAddress,
            lastActivity: new Date(),
            createdAt: new Date(),
            isActive: true
        });
    }
}

    userSchema.methods.removeSession = function(sessionId: string): void {
        const user = this as IUser;
        user.activeSessions = user.activeSessions.filter(session => session.sessionId !== sessionId);
    }

userSchema.methods.updateSessionActivity = function(sessionId: string): void {
    const user = this as IUser;
    const session = user.activeSessions.find(s => s.sessionId === sessionId);
    if (session) {
        session.lastActivity = new Date();
    }
}

userSchema.methods.getActiveSessions = function(): any[] {
    const user = this as IUser;
    const expiryDate = getSessionExpiryDate();
    
    // Filter out expired sessions and inactive sessions
    return user.activeSessions.filter(session => {
        const sessionDate = new Date(session.lastActivity);
        return session.isActive && sessionDate > expiryDate;
    });
}

userSchema.methods.getSessionById = function(sessionId: string): any {
    const user = this as IUser;
    return user.activeSessions.find(session => session.sessionId === sessionId);
}

userSchema.methods.removeAllSessions = function(): void {
    const user = this as IUser;
    user.activeSessions = [];
}

userSchema.methods.cleanupExpiredSessions = function(): number {
    const user = this as IUser;
    const expiryDate = getSessionExpiryDate();
    
    const initialCount = user.activeSessions.length;
    
    // Remove expired sessions
    user.activeSessions = user.activeSessions.filter(session => {
        const sessionDate = new Date(session.lastActivity);
        return sessionDate > expiryDate;
    });
    
    const removedCount = initialCount - user.activeSessions.length;
    
    if (removedCount > 0) {
        console.log(`🧹 Cleaned up ${removedCount} expired sessions for user ${user.emailId}`);
    }
    
    return removedCount;
}

// Helper method to detect device type
userSchema.methods.detectDeviceType = function(userAgent: string): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
    if (!userAgent || userAgent === 'Unknown') {
        return 'unknown';
    }
    
    const ua = userAgent.toLowerCase();
    
    // Check for mobile devices first
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('blackberry') || ua.includes('windows phone')) {
        return 'mobile';
    } 
    // Check for tablets
    else if (ua.includes('tablet') || ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile'))) {
        return 'tablet';
    } 
    // Check for desktop operating systems (more comprehensive)
    else if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('mac os') || ua.includes('linux') || ua.includes('x11') || ua.includes('win32') || ua.includes('win64')) {
        return 'desktop';
    }
    
    // Default to desktop for most cases (browsers typically run on desktop)
    return 'desktop';
}

export default mongoose.model<IUser>("User", userSchema);
