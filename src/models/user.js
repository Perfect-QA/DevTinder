const mongoose = require("mongoose");
const { Schema } = mongoose;
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');

// DRY: Common field validation functions
const validateEmail = (value) => {
    if(!validator.isEmail(value)){
        throw new Error("Invalid email address: " + value);
    }
};

const validateStrongPassword = (value) => {
    if(!validator.isStrongPassword(value)){
        throw new Error("Create strong password: " + value);
    }
};

const validateURL = (value) => {
    if(value && !validator.isURL(value)){
        throw new Error("Invalid URL: " + value);
    }
};

const validateGender = (value) => {
    if(value && !["Male", "Female", "Other"].includes(value)){
        throw new Error("Invalid gender");
    }
};

const userSchema = new Schema({
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

}
,{timestamps:true, collection: 'users'});

userSchema.methods.getJWT = function(){
    const user = this;
    const token = jwt.sign({ userId: this._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY });
    return token;
}

userSchema.methods.validatePassword = async function(passwordInputByUser){
    const user = this;
    const passwordHash = user.password;
    const isPasswordValid = await bcrypt.compare(passwordInputByUser, passwordHash);
    return isPasswordValid;
}

module.exports = mongoose.model("User", userSchema);
// model is used to create new instances of User