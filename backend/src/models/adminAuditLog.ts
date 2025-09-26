import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminAuditLog extends Document {
  adminId: string;
  adminEmail: string;
  adminRole: 'admin' | 'superadmin';
  action: string;
  resource: string;
  resourceId?: string;
  details: {
    method: string;
    endpoint: string;
    ipAddress: string;
    userAgent: string;
    requestBody?: any;
    responseStatus: number;
    responseTime: number;
    changes?: any;
    previousValues?: any;
    newValues?: any;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'user_management' | 'data_access' | 'system_config' | 'security' | 'api_usage';
  timestamp: Date;
  sessionId?: string;
  deviceInfo?: {
    deviceType: string;
    deviceName: string;
    location?: string;
  };
  riskLevel: 'safe' | 'suspicious' | 'high_risk';
  tags: string[];
  metadata?: any;
}

const adminAuditLogSchema = new Schema<IAdminAuditLog>({
  adminId: {
    type: String,
    required: true,
    index: true
  },
  adminEmail: {
    type: String,
    required: true,
    index: true
  },
  adminRole: {
    type: String,
    enum: ['admin', 'superadmin'],
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  resource: {
    type: String,
    required: true,
    index: true
  },
  resourceId: {
    type: String,
    index: true
  },
  details: {
    method: {
      type: String,
      required: true
    },
    endpoint: {
      type: String,
      required: true
    },
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      required: true
    },
    requestBody: {
      type: Schema.Types.Mixed
    },
    responseStatus: {
      type: Number,
      required: true
    },
    responseTime: {
      type: Number,
      required: true
    },
    changes: {
      type: Schema.Types.Mixed
    },
    previousValues: {
      type: Schema.Types.Mixed
    },
    newValues: {
      type: Schema.Types.Mixed
    }
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['authentication', 'user_management', 'data_access', 'system_config', 'security', 'api_usage'],
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  sessionId: {
    type: String,
    index: true
  },
  deviceInfo: {
    deviceType: String,
    deviceName: String,
    location: String
  },
  riskLevel: {
    type: String,
    enum: ['safe', 'suspicious', 'high_risk'],
    default: 'safe',
    index: true
  },
  tags: [{
    type: String
  }],
  metadata: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true,
  collection: 'admin_audit_logs'
});

// Indexes for better query performance
adminAuditLogSchema.index({ adminId: 1, timestamp: -1 });
adminAuditLogSchema.index({ action: 1, timestamp: -1 });
adminAuditLogSchema.index({ resource: 1, timestamp: -1 });
adminAuditLogSchema.index({ severity: 1, timestamp: -1 });
adminAuditLogSchema.index({ category: 1, timestamp: -1 });
adminAuditLogSchema.index({ riskLevel: 1, timestamp: -1 });
adminAuditLogSchema.index({ timestamp: -1 });

// TTL index to automatically delete logs older than 1 year
adminAuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000, name: 'audit_logs_ttl' });

export default mongoose.model<IAdminAuditLog>('AdminAuditLog', adminAuditLogSchema);
