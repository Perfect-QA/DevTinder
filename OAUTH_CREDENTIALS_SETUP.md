# OAuth Credentials Setup Guide

This guide will walk you through setting up Google and GitHub OAuth credentials for your PerfectAI application.

## Table of Contents
- [Google OAuth Setup](#google-oauth-setup)
- [GitHub OAuth Setup](#github-oauth-setup)
- [Environment Configuration](#environment-configuration)
- [Testing OAuth Flow](#testing-oauth-flow)
- [Troubleshooting](#troubleshooting)

---

## Google OAuth Setup

### Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project**
   - Click on the project dropdown at the top
   - Click "New Project"
   - Enter project name: `PerfectAI-OAuth` (or any name you prefer)
   - Click "Create"

3. **Select Your Project**
   - Make sure your new project is selected in the dropdown

### Step 2: Enable Google+ API

1. **Navigate to APIs & Services**
   - In the left sidebar, click "APIs & Services" > "Library"

2. **Search and Enable Google+ API**
   - Search for "Google+ API"
   - Click on "Google+ API"
   - Click "Enable"

### Step 3: Configure OAuth Consent Screen

1. **Go to OAuth Consent Screen**
   - In the left sidebar, click "APIs & Services" > "OAuth consent screen"

2. **Choose User Type**
   - Select "External" (unless you have a Google Workspace account)
   - Click "Create"

3. **Fill in App Information**
   ```
   App name: PerfectAI
   User support email: your-email@gmail.com
   App logo: (optional - you can upload a logo)
   App domain: (leave blank for now)
   Developer contact information: your-email@gmail.com
   ```

4. **Add Scopes**
   - Click "Add or Remove Scopes"
   - Add these scopes:
     - `../auth/userinfo.email`
     - `../auth/userinfo.profile`
   - Click "Update"

5. **Add Test Users (for development)**
   - Click "Add Users"
   - Add your email address
   - Click "Save"

### Step 4: Create OAuth 2.0 Credentials

1. **Go to Credentials**
   - In the left sidebar, click "APIs & Services" > "Credentials"

2. **Create OAuth 2.0 Client ID**
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Name: "PerfectAI Web Client"

3. **Configure Authorized Redirect URIs**
   - Under "Authorized redirect URIs", click "Add URI"
   - Add these URIs:
     ```
     http://localhost:7777/auth/google/callback
     http://localhost:3000/auth/google/callback
     https://yourdomain.com/auth/google/callback (for production)
     ```

4. **Create Credentials**
   - Click "Create"
   - **IMPORTANT**: Copy the Client ID and Client Secret immediately
   - You won't be able to see the Client Secret again

### Step 5: Get Your Credentials

After creating the OAuth client, you'll see:
- **Client ID**: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-abcdefghijklmnopqrstuvwxyz`

**Save these credentials securely!**

---

## GitHub OAuth Setup

### Step 1: Create GitHub OAuth App

1. **Go to GitHub Developer Settings**
   - Visit: https://github.com/settings/developers
   - Sign in to your GitHub account

2. **Create New OAuth App**
   - Click "New OAuth App"

3. **Fill in Application Details**
   ```
   Application name: PerfectAI
   Homepage URL: http://localhost:7777
   Application description: PerfectAI Authentication System
   Authorization callback URL: http://localhost:7777/auth/github/callback
   ```

4. **Register Application**
   - Click "Register application"

### Step 2: Get Your Credentials

After creating the OAuth app, you'll see:
- **Client ID**: `Iv1.1234567890abcdef`
- **Client Secret**: `1234567890abcdef1234567890abcdef12345678`

**Save these credentials securely!**

### Step 3: Generate Client Secret (if needed)

1. **If you need to regenerate the secret**
   - Click "Generate a new client secret"
   - Copy the new secret immediately

---

## Environment Configuration

### Step 1: Create/Update .env File

Create a `.env` file in your project root with the following content:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/perfectai

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
JWT_EXPIRY=24h

# Cookie Configuration
COOKIE_EXPIRY=86400000

# Password Configuration
PASSWORD_SALT_ROUNDS=10

# Email Configuration (for password reset)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:7777/auth/google/callback

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your-github-client-id-here
GITHUB_CLIENT_SECRET=your-github-client-secret-here
GITHUB_CALLBACK_URL=http://localhost:7777/auth/github/callback

# Application Configuration
NODE_ENV=development
CLIENT_URL=http://localhost:7777
PORT=7777
```

### Step 2: Replace Placeholder Values

Replace the placeholder values with your actual credentials:

```env
# Example with real values (DO NOT use these - they're just examples)
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz
GITHUB_CLIENT_ID=Iv1.1234567890abcdef
GITHUB_CLIENT_SECRET=1234567890abcdef1234567890abcdef12345678
```

### Step 3: Generate JWT Secret

Generate a secure JWT secret:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 64
```

---

## Testing OAuth Flow

### Step 1: Start Your Server

```bash
npm run dev
# or
npm start
```

### Step 2: Test Google OAuth

1. **Open your browser**
2. **Navigate to**: `http://localhost:7777/auth/google`
3. **Expected behavior**:
   - You should be redirected to Google's OAuth consent screen
   - After authorization, you'll be redirected back to your app
   - You should be logged in and redirected to the dashboard

### Step 3: Test GitHub OAuth

1. **Navigate to**: `http://localhost:7777/auth/github`
2. **Expected behavior**:
   - You should be redirected to GitHub's OAuth consent screen
   - After authorization, you'll be redirected back to your app
   - You should be logged in and redirected to the dashboard

### Step 4: Test User Info Endpoint

After successful OAuth login, test the user info endpoint:

```bash
# Using curl (replace with your actual token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:7777/auth/user-info

# Or using the cookie (if using cookie-based auth)
curl -H "Cookie: token=YOUR_JWT_TOKEN" http://localhost:7777/auth/user-info
```

---

## Troubleshooting

### Common Issues

#### 1. "Google OAuth not configured" Error

**Problem**: You see this error when accessing `/auth/google`

**Solution**:
- Check if `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in your `.env` file
- Restart your server after adding the credentials
- Verify the credentials are correct (no extra spaces, correct format)

#### 2. "Invalid redirect URI" Error

**Problem**: Google shows "Error 400: redirect_uri_mismatch"

**Solution**:
- Check that your callback URL in Google Cloud Console matches exactly:
  - `http://localhost:7777/auth/google/callback`
- Make sure there are no trailing slashes or typos
- Update the authorized redirect URIs in Google Cloud Console

#### 3. "Access blocked" Error

**Problem**: Google shows "Access blocked: This app's request is invalid"

**Solution**:
- Make sure your OAuth consent screen is properly configured
- Add your email to test users if the app is in testing mode
- Verify all required fields are filled in the OAuth consent screen

#### 4. GitHub "Application error" 

**Problem**: GitHub shows "Application error"

**Solution**:
- Check that your GitHub OAuth app callback URL is exactly:
  - `http://localhost:7777/auth/github/callback`
- Verify your GitHub Client ID and Secret are correct
- Make sure your GitHub OAuth app is not suspended

#### 5. Environment Variables Not Loading

**Problem**: Credentials are not being loaded

**Solution**:
```bash
# Test if environment variables are loading
node -e "require('dotenv').config(); console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not set');"
```

### Debug Steps

1. **Check server logs** for any error messages
2. **Verify .env file** is in the correct location (project root)
3. **Restart server** after making changes to .env
4. **Check network tab** in browser dev tools for failed requests
5. **Verify callback URLs** match exactly in both your app and OAuth provider settings

### Security Best Practices

1. **Never commit .env file** to version control
2. **Use different credentials** for development and production
3. **Rotate secrets regularly** in production
4. **Use HTTPS** in production for all OAuth callbacks
5. **Implement proper error handling** for OAuth failures
6. **Use environment-specific callback URLs**

---

## Production Deployment

### For Production Environment

1. **Update callback URLs** to use your production domain:
   ```
   https://yourdomain.com/auth/google/callback
   https://yourdomain.com/auth/github/callback
   ```

2. **Set production environment variables**:
   ```env
   NODE_ENV=production
   CLIENT_URL=https://yourdomain.com
   ```

3. **Use HTTPS** for all OAuth callbacks in production

4. **Update OAuth app settings** in both Google Cloud Console and GitHub to include production URLs

---

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Passport.js Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
- [Passport.js GitHub Strategy](http://www.passportjs.org/packages/passport-github2/)

---

## Support

If you encounter any issues not covered in this guide:

1. Check the server logs for detailed error messages
2. Verify all environment variables are correctly set
3. Test with a fresh OAuth app setup
4. Ensure your callback URLs match exactly in all configurations

Remember to keep your OAuth credentials secure and never share them publicly!
