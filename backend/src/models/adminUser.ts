import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

/**
 * Admin User Model
 * Separate collection for admin and superadmin users
 * Enhanced permission management with add/remove capabilities
 */

export interface IAdminUser extends Document {
  // Basic Information
  firstName: string;
  lastName: string;
  emailId: string;
  password: string;
  
  // Admin Role Information
  role: 'admin' | 'superadmin';
  isActive: boolean;
  
  // Permission Management
  permissions: string[];
  defaultPermissions: string[];
  customPermissions: string[];
  
  // Security Information
  failedLoginAttempts: number;
  isLocked: boolean;
  lockUntil?: Date;
  lastLogin?: Date;
  loginIP?: string;
  loginCount: number;
  
  // Admin Activity Tracking
  lastAdminAction?: Date;
  adminActionsCount: number;
  createdBy?: string; // ID of admin who created this admin
  createdByEmail?: string;
  
  // Session Management
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
  
  // JWT Token Management
  refreshToken?: string;
  refreshTokenExpiry?: Date;
  
  // Account Verification
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpiry?: Date;
  
  // Two-Factor Authentication
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  validatePassword(passwordInput: string): Promise<boolean>;
  getJWT(): string;
  isAccountLocked(): boolean;
  getLockTimeRemaining(): number;
  addPermission(permission: string): void;
  removePermission(permission: string): void;
  hasPermission(permission: string): boolean;
  hasAnyPermission(permissions: string[]): boolean;
  hasAllPermissions(permissions: string[]): boolean;
  resetPermissions(): void;
  cleanupExpiredSessions(): number;
}

// Default permissions for each role
const DEFAULT_ADMIN_PERMISSIONS = [
  'view_analytics',
  'view_tokens',
  'view_logs'
];

const DEFAULT_SUPERADMIN_PERMISSIONS = [
  'view_analytics',
  'manage_users',
  'view_tokens',
  'manage_system',
  'view_logs',
  'manage_permissions',
  'manage_admins',
  'system_settings'
];

const adminUserSchema = new Schema<IAdminUser>({
  // Basic Information
  firstName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  emailId: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    validate: {
      validator: function(v: string) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(v);
      },
      message: 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    }
  },
  
  // Admin Role Information
  role: {
    type: String,
    enum: ['admin', 'superadmin'],
    required: true,
    default: 'admin'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Permission Management
  permissions: {
    type: [String],
    default: function() {
      return this.role === 'superadmin' ? DEFAULT_SUPERADMIN_PERMISSIONS : DEFAULT_ADMIN_PERMISSIONS;
    }
  },
  defaultPermissions: {
    type: [String],
    default: function() {
      return this.role === 'superadmin' ? DEFAULT_SUPERADMIN_PERMISSIONS : DEFAULT_ADMIN_PERMISSIONS;
    }
  },
  customPermissions: {
    type: [String],
    default: []
  },
  
  // Security Information
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
  
  // Admin Activity Tracking
  lastAdminAction: {
    type: Date
  },
  adminActionsCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: String,
    ref: 'AdminUser'
  },
  createdByEmail: {
    type: String
  },
  
  // Session Management
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
  
  // JWT Token Management
  refreshToken: {
    type: String
  },
  refreshTokenExpiry: {
    type: Date
  },
  
  // Account Verification
  isEmailVerified: {
    type: Boolean,
    default: true // Admin users are pre-verified
  },
  emailVerificationToken: {
    type: String
  },
  emailVerificationExpiry: {
    type: Date
  },
  
  // Two-Factor Authentication
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'admin_users' // Separate collection for admin users
});

// Indexes for better performance
adminUserSchema.index({ emailId: 1 });
adminUserSchema.index({ role: 1 });
adminUserSchema.index({ isActive: 1 });
adminUserSchema.index({ createdBy: 1 });
adminUserSchema.index({ 'activeSessions.sessionId': 1 });

// Pre-save middleware to hash password
adminUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = parseInt(process.env.PASSWORD_SALT_ROUNDS || '12');
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Pre-save middleware to set default permissions
adminUserSchema.pre('save', function(next) {
  if (this.isNew) {
    // Set default permissions based on role
    if (this.role === 'superadmin') {
      this.defaultPermissions = [...DEFAULT_SUPERADMIN_PERMISSIONS];
      this.permissions = [...DEFAULT_SUPERADMIN_PERMISSIONS];
    } else {
      this.defaultPermissions = [...DEFAULT_ADMIN_PERMISSIONS];
      this.permissions = [...DEFAULT_ADMIN_PERMISSIONS];
    }
  }
  next();
});

// Instance Methods
adminUserSchema.methods.validatePassword = async function(passwordInput: string): Promise<boolean> {
  return await bcrypt.compare(passwordInput, this.password);
};

adminUserSchema.methods.getJWT = function(): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { 
      userId: this._id, 
      role: this.role,
      isAdmin: true,
      permissions: this.permissions 
    }, 
    jwtSecret, 
    { expiresIn: process.env.JWT_EXPIRY || '24h' }
  );
};

adminUserSchema.methods.isAccountLocked = function(): boolean {
  return !!(this.isLocked && this.lockUntil && this.lockUntil > new Date());
};

adminUserSchema.methods.getLockTimeRemaining = function(): number {
  if (!this.isLocked || !this.lockUntil) return 0;
  const remaining = this.lockUntil.getTime() - Date.now();
  return Math.max(0, Math.ceil(remaining / (1000 * 60))); // Return minutes
};

// Permission Management Methods
adminUserSchema.methods.addPermission = function(permission: string): void {
  if (!this.permissions.includes(permission)) {
    this.permissions.push(permission);
    this.customPermissions.push(permission);
  }
};

adminUserSchema.methods.removePermission = function(permission: string): void {
  // Don't remove default permissions
  if (this.defaultPermissions.includes(permission)) {
    return;
  }
  
  this.permissions = this.permissions.filter((p: string) => p !== permission);
  this.customPermissions = this.customPermissions.filter((p: string) => p !== permission);
};

adminUserSchema.methods.hasPermission = function(permission: string): boolean {
  return this.permissions.includes(permission);
};

adminUserSchema.methods.hasAnyPermission = function(permissions: string[]): boolean {
  return permissions.some(permission => this.permissions.includes(permission));
};

adminUserSchema.methods.hasAllPermissions = function(permissions: string[]): boolean {
  return permissions.every(permission => this.permissions.includes(permission));
};

adminUserSchema.methods.resetPermissions = function(): void {
  this.permissions = [...this.defaultPermissions];
  this.customPermissions = [];
};

adminUserSchema.methods.cleanupExpiredSessions = function(): number {
  const now = new Date();
  const expiredSessions = this.activeSessions.filter((session: any) => 
    session.isActive && session.lastActivity < new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 hours
  );
  
  this.activeSessions = this.activeSessions.filter((session: any) => 
    !expiredSessions.includes(session)
  );
  
  return expiredSessions.length;
};

// Static Methods
adminUserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ emailId: email, isActive: true });
};

adminUserSchema.statics.findActiveAdmins = function() {
  return this.find({ isActive: true }).select('-password');
};

adminUserSchema.statics.findByRole = function(role: 'admin' | 'superadmin') {
  return this.find({ role, isActive: true }).select('-password');
};

export default mongoose.model<IAdminUser>('AdminUser', adminUserSchema);
