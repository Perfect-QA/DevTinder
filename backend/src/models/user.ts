import mongoose, { Document, Schema } from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";
import * as jwt from 'jsonwebtoken';

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

export default mongoose.model<IUser>("User", userSchema);
