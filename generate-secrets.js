#!/usr/bin/env node

/**
 * Generate secure random secrets for JWT and session
 * Run with: node generate-secrets.js
 */

const crypto = require('crypto');

console.log('🔐 GENERATING SECURE SECRETS FOR PERFECT AI');
console.log('==========================================\n');

// Generate JWT Secret (64 bytes = 512 bits)
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('JWT_SECRET=' + jwtSecret);

// Generate JWT Refresh Secret (64 bytes = 512 bits)
const jwtRefreshSecret = crypto.randomBytes(64).toString('hex');
console.log('JWT_REFRESH_SECRET=' + jwtRefreshSecret);

// Generate Session Secret (32 bytes = 256 bits)
const sessionSecret = crypto.randomBytes(32).toString('hex');
console.log('SESSION_SECRET=' + sessionSecret);

console.log('\n==========================================');
console.log('✅ Copy these values to your backend/.env file');
console.log('⚠️  Keep these secrets secure and never commit them to version control!');
console.log('==========================================');
