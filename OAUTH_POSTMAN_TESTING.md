# OAuth Testing in Postman - Complete Guide

## 🎯 Overview

This guide shows you how to test OAuth flows in Postman. Since OAuth involves browser redirects and user consent, we'll cover both direct testing and browser-based testing methods.

## 🔧 Recent Bug Fixes (Latest Update)

The following bugs have been fixed in the auth.js file:

1. **Fixed OAuth Redirect URL Logic**: Corrected operator precedence in redirect URLs to properly handle `CLIENT_URL` environment variable
2. **Added OAuth User Validation**: Added null checks for `req.user` in OAuth callbacks to prevent crashes
3. **Fixed Missing Semicolon**: Added missing semicolon at the end of the auth.js file

These fixes ensure OAuth flows work correctly and handle edge cases properly.

---

## 📋 Prerequisites

### **1. Environment Setup**
Make sure your `.env` file contains:
```env
# OAuth Credentials (Optional - OAuth will be disabled if not provided)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:7777/auth/google/callback

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:7777/auth/github/callback

# Server Configuration
PORT=7777
CLIENT_URL=http://localhost:7777
```

### **2. Server Status**
Ensure your server is running:
```bash
npm start
# Should show: "Server is running on port 7777"
```

---

## 🧪 Testing Methods

### **Method 1: Direct OAuth Testing (Recommended)**

#### **Step 1: Test OAuth Initiation**

**Google OAuth Test:**
- **Method:** `GET`
- **URL:** `http://localhost:7777/auth/google`
- **Expected Response:**
  - Status: `302` (Redirect)
  - Location header: Google OAuth URL

**GitHub OAuth Test:**
- **Method:** `GET`
- **URL:** `http://localhost:7777/auth/github`
- **Expected Response:**
  - Status: `302` (Redirect)
  - Location header: GitHub OAuth URL

#### **Step 2: Test OAuth Status (If Not Configured)**

If OAuth credentials are not provided, you should get:
```json
{
  "success": false,
  "error": "Google OAuth not configured"
}
```

---

### **Method 2: Browser-Based OAuth Testing**

Since OAuth requires browser interaction, follow these steps:

#### **Step 1: Open Browser**
1. Open your browser
2. Navigate to: `http://localhost:7777/auth/google`
3. Complete the OAuth flow (login, consent)
4. Check if you're redirected to dashboard

#### **Step 2: Verify Authentication**
After successful OAuth, test protected endpoints:

**Get User Info:**
- **Method:** `GET`
- **URL:** `http://localhost:7777/auth/user-info`
- **Headers:** Include the JWT token from cookies
- **Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "emailId": "john@gmail.com",
      "provider": "google",
      "oauthAccountsLinked": ["google"],
      "lastOAuthProvider": "google",
      "isEmailVerified": true
    }
  }
}
```

---

## 🔧 Postman Collection Setup

### **Environment Variables**
Create a Postman environment with:
```json
{
  "base_url": "http://localhost:7777",
  "auth_token": ""
}
```

### **Collection Structure**
```
DevTinder OAuth Testing
├── Authentication
│   ├── Signup
│   ├── Login
│   └── Logout
├── OAuth Testing
│   ├── Google OAuth Initiate
│   ├── GitHub OAuth Initiate
│   ├── OAuth User Info
│   ├── Unlink Google
│   └── Unlink GitHub
└── Protected Routes
    └── Feed
```

---

## 📝 Detailed Test Cases

### **1. Google OAuth Flow**

#### **Test 1.1: Initiate Google OAuth**
```http
GET http://localhost:7777/auth/google
```

**Expected Results:**
- **If OAuth configured:** `302` redirect to Google
- **If OAuth not configured:** `501` with error message

#### **Test 1.2: Google OAuth Callback (Browser Test)**
1. Open browser: `http://localhost:7777/auth/google`
2. Complete Google login
3. Verify redirect to dashboard
4. Check cookies for JWT token

#### **Test 1.3: Verify Google OAuth User**
```http
GET http://localhost:7777/auth/user-info
Cookie: token=your_jwt_token_here
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "firstName": "John",
    "lastName": "Doe",
    "emailId": "john@gmail.com",
    "provider": "google",
    "lastLogin": "2024-01-15T10:30:00.000Z",
    "loginCount": 5,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "hasGoogle": true,
    "hasGithub": false,
    "hasPassword": false
  }
}
```

### **2. GitHub OAuth Flow**

#### **Test 2.1: Initiate GitHub OAuth**
```http
GET http://localhost:7777/auth/github
```

**Expected Results:**
- **If OAuth configured:** `302` redirect to GitHub
- **If OAuth not configured:** `501` with error message

#### **Test 2.2: GitHub OAuth Callback (Browser Test)**
1. Open browser: `http://localhost:7777/auth/github`
2. Complete GitHub login
3. Verify redirect to dashboard
4. Check cookies for JWT token

#### **Test 2.3: Verify GitHub OAuth User**
```http
GET http://localhost:7777/auth/user-info
Cookie: token=your_jwt_token_here
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "firstName": "Jane",
    "lastName": "Smith",
    "emailId": "jane@github.local",
    "provider": "github",
    "lastLogin": "2024-01-15T10:30:00.000Z",
    "loginCount": 3,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "hasGoogle": false,
    "hasGithub": true,
    "hasPassword": false
  }
}
```

### **3. Account Linking Tests**

#### **Test 3.1: Link Google to Existing Account**
1. Create account with email/password
2. Use same email for Google OAuth
3. Verify accounts are linked

#### **Test 3.2: Unlink OAuth Account**
```http
POST http://localhost:7777/auth/unlink/google
Cookie: token=your_jwt_token_here
```

**Expected Response:**
```json
{
  "success": true,
  "message": "google account unlinked successfully",
  "user": {
    "hasGoogle": false,
    "hasGithub": true,
    "hasPassword": true
  }
}
```

### **4. Error Handling Tests**

#### **Test 4.1: OAuth Not Configured**
```http
GET http://localhost:7777/auth/google
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Google OAuth not configured"
}
```

#### **Test 4.2: Invalid OAuth State**
```http
GET http://localhost:7777/auth/google/callback?state=invalid_state&code=test_code
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid state parameter - possible CSRF attack"
}
```

---

## 🔍 Advanced Testing

### **Rate Limiting Tests**

#### **Test OAuth Rate Limiting**
Make 11 rapid requests to OAuth endpoints:
```http
GET http://localhost:7777/auth/google
```

**Expected:** 11th request should return rate limit error:
```json
{
  "success": false,
  "error": "Too many OAuth attempts, please try again after 15 minutes"
}
```

### **Token Refresh Tests**

#### **Test Refresh Token**
```http
POST http://localhost:7777/auth/refresh-token
Cookie: token=your_jwt_token_here
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "user": {
    "id": "user_id",
    "firstName": "John",
    "lastName": "Doe",
    "emailId": "john@example.com",
    "provider": "google"
  }
}
```

---

## 🐛 Troubleshooting

### **Common Issues**

#### **1. "Unknown authentication strategy" Error**
**Cause:** OAuth strategies not loaded
**Solution:** Check if OAuth credentials are provided in `.env`

#### **2. OAuth Redirect Not Working**
**Cause:** Incorrect callback URL
**Solution:** Verify `GOOGLE_CALLBACK_URL` and `GITHUB_CALLBACK_URL` in `.env`

#### **3. CORS Issues**
**Cause:** Frontend/backend port mismatch
**Solution:** Ensure `CLIENT_URL` matches your frontend URL

#### **4. Session Issues**
**Cause:** Session configuration problems
**Solution:** Check `SESSION_SECRET` in `.env`

### **Debug Steps**

1. **Check Server Logs:**
   ```bash
   npm start
   # Look for OAuth credential messages
   ```

2. **Verify Environment Variables:**
   ```bash
   # Check if .env file exists and has OAuth credentials
   ```

3. **Test Basic Endpoints:**
   ```http
   GET http://localhost:7777/auth/user-info
   # Should return authentication required error
   ```

---

## 📊 Test Results Checklist

### **OAuth Configuration Tests**
- [ ] Google OAuth initiates correctly
- [ ] GitHub OAuth initiates correctly
- [ ] OAuth not configured returns proper error
- [ ] Rate limiting works for OAuth attempts

### **OAuth Flow Tests**
- [ ] Google OAuth completes successfully
- [ ] GitHub OAuth completes successfully
- [ ] User data is stored correctly
- [ ] JWT token is generated and set

### **Account Management Tests**
- [ ] Account linking works
- [ ] Account unlinking works
- [ ] User info endpoint returns correct data
- [ ] Token refresh works

### **Error Handling Tests**
- [ ] Invalid state parameter handled
- [ ] OAuth failures handled gracefully
- [ ] Rate limiting enforced
- [ ] Proper error messages returned

### **Logout Tests**
- [ ] Standard logout works for all users
- [ ] OAuth logout revokes tokens
- [ ] Session cleanup works properly
- [ ] Cookie clearing works

---

## 🚪 Logout Testing

### **Test 1: Standard Logout (All Users)**

#### **Test 1.1: Manual Logout**
```http
POST http://localhost:7777/auth/logout
Cookie: token=your_jwt_token_here
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User logged out successfully",
  "data": {
    "logoutTime": "2024-01-15T10:30:00.000Z",
    "provider": "local"
  }
}
```

#### **Test 1.2: OAuth User Logout**
```http
POST http://localhost:7777/auth/logout
Cookie: token=your_jwt_token_here
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User logged out successfully",
  "data": {
    "logoutTime": "2024-01-15T10:30:00.000Z",
    "provider": "google"
  }
}
```

### **Test 2: OAuth-Specific Logout (Token Revocation)**

#### **Test 2.1: OAuth Logout with Token Revocation**
```http
POST http://localhost:7777/auth/logout/oauth
Cookie: token=your_jwt_token_here
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OAuth logout successful",
  "data": {
    "logoutTime": "2024-01-15T10:30:00.000Z",
    "revokedProviders": ["google", "github"],
    "provider": "google"
  }
}
```

#### **Test 2.2: Verify OAuth Tokens Cleared**
After OAuth logout, check user info:
```http
GET http://localhost:7777/auth/user-info
Cookie: token=new_jwt_token_here
```

**Expected:** OAuth tokens should be cleared from user record

### **Test 3: Logout Error Handling**

#### **Test 3.1: Logout Without Token**
```http
POST http://localhost:7777/auth/logout
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Unauthorized access"
}
```

#### **Test 3.2: Logout with Invalid Token**
```http
POST http://localhost:7777/auth/logout
Cookie: token=invalid_token
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Unauthorized access: invalid token"
}
```

---

## 🐛 Testing Bug Fixes

### **Test 1: OAuth Redirect URL Logic**
Verify that OAuth redirects work correctly with environment variables:

```bash
# Test Google OAuth redirect (should redirect to CLIENT_URL + '/dashboard')
curl -I http://localhost:7777/auth/google

# Test GitHub OAuth redirect (should redirect to CLIENT_URL + '/dashboard')  
curl -I http://localhost:7777/auth/github
```

### **Test 2: OAuth User Validation**
Test that OAuth callbacks handle missing users gracefully:

1. **Simulate OAuth failure** by accessing callback directly:
   ```bash
   curl -I http://localhost:7777/auth/google/callback
   curl -I http://localhost:7777/auth/github/callback
   ```
   - Should redirect to login page with error parameter
   - Should not crash the server

### **Test 3: Syntax Validation**
Verify the auth.js file has no syntax errors:

```bash
node -c src/routes/auth.js
# Should return no output (success)
```

---

## 🚀 Quick Start Commands

### **Test OAuth Status:**
```bash
curl -I http://localhost:7777/auth/google
curl -I http://localhost:7777/auth/github
```

### **Test Protected Endpoint:**
```bash
curl -H "Cookie: token=your_jwt_token" http://localhost:7777/auth/user-info
```

### **Test Rate Limiting:**
```bash
for i in {1..11}; do curl -I http://localhost:7777/auth/google; done
```

---

## 📝 Notes

- **OAuth requires browser interaction** - use browser for complete flow testing
- **JWT tokens are stored in cookies** - include cookies in authenticated requests
- **OAuth is optional** - app works without OAuth credentials
- **Rate limiting is active** - don't exceed 10 OAuth attempts per 15 minutes
- **Bug fixes applied** - OAuth redirects and error handling are now robust
- **Syntax validated** - all files pass Node.js syntax checks

**Your OAuth implementation is ready for testing!** 🎉

## 🔄 Latest Updates

- ✅ Fixed OAuth redirect URL operator precedence
- ✅ Added null checks for OAuth user validation  
- ✅ Fixed missing semicolon in auth.js
- ✅ Enhanced error handling in OAuth callbacks
- ✅ Updated testing documentation
