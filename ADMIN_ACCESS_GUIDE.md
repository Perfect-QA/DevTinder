# 🔐 Admin & Superadmin Access Guide

This guide explains how to become an admin or superadmin in the PerfectAI system and what access you'll get.

## 📋 Table of Contents

- [Admin Roles Overview](#admin-roles-overview)
- [How to Become an Admin](#how-to-become-an-admin)
- [How to Become a Superadmin](#how-to-become-a-superadmin)
- [Admin Permissions](#admin-permissions)
- [Available Admin Endpoints](#available-admin-endpoints)
- [Admin Dashboard Features](#admin-dashboard-features)
- [Security & Audit Features](#security--audit-features)
- [Quick Start Guide](#quick-start-guide)

## 🎯 Admin Roles Overview

### **Admin User**
- **Role**: `admin`
- **Access Level**: Limited administrative access
- **Default Permissions**: Basic monitoring and analytics
- **Can Do**: View analytics, monitor token usage, view logs
- **Cannot Do**: Create other admins, manage system settings, manage permissions

### **Superadmin User**
- **Role**: `superadmin`
- **Access Level**: Full system administrative access
- **Default Permissions**: All system permissions
- **Can Do**: Everything an admin can do, plus create/manage other admins, system settings
- **Cannot Do**: Remove their own admin access

## 🚀 How to Become an Admin

### Method 1: Setup Script (First Time Setup)
```bash
# Navigate to backend directory
cd backend

# Run the admin setup script
npm run setup-admin
# or
npx ts-node src/scripts/setupAdmin.ts
```

**Default Superadmin Credentials:**
- **Email**: `PerfectAdmin@gmail.com`
- **Password**: `Perfect@007`
- **Role**: `superadmin`

> ⚠️ **Important**: Change the default password after first login!

### Method 2: API Endpoint (Existing Superadmin Required)
```bash
# Create new admin user
POST /admin/users/create-admin
Authorization: Bearer YOUR_SUPERADMIN_TOKEN
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe", 
  "emailId": "john.doe@example.com",
  "password": "SecurePassword123!",
  "role": "admin",
  "permissions": ["view_analytics", "view_tokens", "view_logs"]
}
```

### Method 3: Promote Existing User
```bash
# Promote existing regular user to admin
POST /admin/users/promote
Authorization: Bearer YOUR_SUPERADMIN_TOKEN
Content-Type: application/json

{
  "userEmail": "existing.user@example.com",
  "role": "admin",
  "permissions": ["view_analytics", "view_tokens"]
}
```

## 👑 How to Become a Superadmin

### Method 1: Setup Script (First Superadmin)
The setup script creates the first superadmin automatically.

### Method 2: Promote Admin to Superadmin
```bash
# Promote existing admin to superadmin
PUT /admin/users/{userId}/permissions
Authorization: Bearer YOUR_SUPERADMIN_TOKEN
Content-Type: application/json

{
  "role": "superadmin",
  "permissions": [
    "view_analytics",
    "manage_users", 
    "view_tokens",
    "manage_system",
    "view_logs",
    "manage_permissions",
    "manage_admins",
    "system_settings"
  ]
}
```

## 🔑 Admin Permissions

### **Default Admin Permissions**
```javascript
[
  'view_analytics',    // View system analytics and statistics
  'view_tokens',       // Monitor OpenAI token usage
  'view_logs'          // Access system logs
]
```

### **Default Superadmin Permissions**
```javascript
[
  'view_analytics',      // View system analytics and statistics
  'manage_users',         // Manage regular users
  'view_tokens',         // Monitor OpenAI token usage
  'manage_system',        // System configuration and settings
  'view_logs',           // Access system logs
  'manage_permissions',   // Manage user permissions
  'manage_admins',        // Create/remove admin users
  'system_settings'       // System-wide configuration
]
```

### **Additional Available Permissions**
```javascript
[
  'view_audit_logs',     // Access audit logs
  'view_security_alerts', // Security alerts and notifications
  'export_data',         // Export system data
  'manage_api_keys',     // Manage API keys and tokens
  'view_sensitive_data', // Access sensitive user data
  'system_maintenance'   // System maintenance operations
]
```

## 🌐 Available Admin Endpoints

### **Admin User Management** (`/admin/users`)
| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| `POST` | `/create-admin` | Create new admin user | superadmin |
| `POST` | `/promote` | Promote user to admin | superadmin |
| `GET` | `/list` | List all admin users | admin |
| `GET` | `/:userId` | Get specific admin details | admin |
| `PUT` | `/:userId/permissions` | Update admin permissions | superadmin |
| `DELETE` | `/:userId` | Remove admin access | superadmin |
| `POST` | `/:userId/permissions/add` | Add permission to admin | superadmin |
| `POST` | `/:userId/permissions/remove` | Remove permission from admin | superadmin |
| `POST` | `/:userId/permissions/reset` | Reset admin permissions | superadmin |
| `GET` | `/permissions/available` | Get available permissions | admin |

### **OpenAI Token Management** (`/admin/openai`)
| Method | Endpoint | Description | Required Permissions |
|--------|----------|-------------|----------------------|
| `GET` | `/dashboard` | OpenAI usage dashboard | `view_analytics`, `view_tokens` |
| `GET` | `/top-users` | Top users by token usage | `view_analytics`, `view_tokens` |
| `GET` | `/user/:userId/stats` | User-specific token stats | `view_analytics`, `view_tokens` |
| `GET` | `/user/:userId/history` | User token usage history | `view_analytics`, `view_tokens` |

### **Audit & Security** (`/admin/audit`)
| Method | Endpoint | Description | Required Permissions |
|--------|----------|-------------|----------------------|
| `GET` | `/logs` | Get audit logs with filtering | `view_audit_logs` |
| `GET` | `/high-risk` | High-risk admin actions | `view_audit_logs`, `view_security_alerts` |
| `GET` | `/summary` | Admin activity summary | `view_analytics`, `view_audit_logs` |
| `GET` | `/admin/:adminId` | Audit logs for specific admin | `view_audit_logs` |
| `GET` | `/category/:category` | Logs by category | `view_audit_logs` |
| `GET` | `/severity/:severity` | Logs by severity | `view_audit_logs` |
| `GET` | `/recent` | Recent admin actions | `view_audit_logs` |
| `GET` | `/export` | Export audit logs to CSV | `export_data`, `view_audit_logs` |
| `GET` | `/statistics` | Detailed audit statistics | `view_analytics`, `view_audit_logs` |

## 📊 Admin Dashboard Features

### **OpenAI Token Analytics**
- **Dashboard Overview**: Total token usage, cost analysis, usage trends
- **Top Users**: Users with highest token consumption
- **User-Specific Stats**: Individual user token usage and history
- **Date Range Filtering**: Filter data by custom date ranges
- **Export Capabilities**: Download usage reports

### **System Monitoring**
- **Real-time Analytics**: Live system performance metrics
- **User Activity**: Active users, login patterns, session management
- **API Usage**: API call statistics and rate limiting
- **Error Tracking**: System errors and exception monitoring

### **Security Dashboard**
- **Audit Logs**: Complete audit trail of all admin actions
- **Security Alerts**: High-risk actions and suspicious activities
- **Access Control**: User permissions and role management
- **Session Management**: Active sessions and security monitoring

## 🔒 Security & Audit Features

### **Audit Logging**
- **Complete Action Tracking**: Every admin action is logged
- **Risk Assessment**: Actions are categorized by risk level
- **Severity Levels**: Low, Medium, High, Critical
- **Categories**: Authentication, User Management, Data Access, System Config, Security, API Usage
- **Export Functionality**: Download audit logs in CSV format

### **Security Features**
- **Role-Based Access Control**: Granular permission system
- **Session Management**: Secure session handling with device tracking
- **IP Tracking**: Login IP addresses and location tracking
- **Failed Login Protection**: Account locking after multiple failed attempts
- **Two-Factor Authentication**: Optional 2FA for enhanced security

### **Admin Activity Monitoring**
- **Real-time Alerts**: Immediate notifications for high-risk actions
- **Activity Summaries**: Daily/weekly/monthly activity reports
- **User Behavior Analysis**: Patterns and anomalies detection
- **Compliance Reporting**: Audit-ready reports for compliance

## 🚀 Quick Start Guide

### **Step 1: Initial Setup**
```bash
# 1. Navigate to backend directory
cd backend

# 2. Run admin setup script
npm run setup-admin

# 3. Note the default credentials:
# Email: PerfectAdmin@gmail.com
# Password: Perfect@007
```

### **Step 2: Login and Get Token**
```bash
# Login to get JWT token
POST /auth/login
{
  "emailId": "PerfectAdmin@gmail.com",
  "password": "Perfect@007"
}

# Save the token from response
```

### **Step 3: Test Admin Access**
```bash
# Test admin dashboard access
GET /admin/openai/dashboard
Authorization: Bearer YOUR_TOKEN

# Test admin user management
GET /admin/users/list
Authorization: Bearer YOUR_TOKEN
```

### **Step 4: Create Additional Admins**
```bash
# Create new admin user
POST /admin/users/create-admin
Authorization: Bearer YOUR_TOKEN
{
  "firstName": "Admin",
  "lastName": "User",
  "emailId": "admin@example.com",
  "password": "SecurePassword123!",
  "role": "admin"
}
```

### **Step 5: Explore Admin Features**
- **Analytics**: `/admin/openai/dashboard`
- **User Management**: `/admin/users/list`
- **Audit Logs**: `/admin/audit/logs`
- **System Settings**: Available through various endpoints

## 📝 Important Notes

### **Security Best Practices**
1. **Change Default Password**: Always change the default superadmin password
2. **Use Strong Passwords**: Minimum 8 characters with complexity requirements
3. **Regular Audits**: Review audit logs regularly for suspicious activity
4. **Permission Management**: Grant only necessary permissions to admins
5. **Session Security**: Log out from unused sessions

### **Troubleshooting**
- **Authentication Issues**: Check JWT token validity and expiration
- **Permission Denied**: Verify user has required permissions for the action
- **Admin Creation Failed**: Ensure you're using superadmin credentials
- **Token Expired**: Re-login to get a fresh token

### **Support**
- **API Documentation**: Available at `/api-docs` (Swagger UI)
- **Logs**: Check application logs for detailed error information
- **Audit Trail**: All actions are logged for troubleshooting

---

## 🎯 Summary

**Admin Role**: Basic monitoring and analytics access
**Superadmin Role**: Full system control and user management

**Key Features**:
- ✅ OpenAI token usage monitoring
- ✅ User management and analytics
- ✅ Comprehensive audit logging
- ✅ Security monitoring and alerts
- ✅ Role-based access control
- ✅ Export and reporting capabilities

**Getting Started**: Run the setup script, login with default credentials, and start exploring the admin features!
