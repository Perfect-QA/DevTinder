const validator = require("validator");

// DRY: Common validation functions
const validateFieldLength = (field, fieldName, minLength = 2, maxLength = 30) => {
    if (field.length < minLength || field.length > maxLength) {
        throw new Error(`${fieldName} must be between ${minLength} and ${maxLength} characters`);
    }
};

const validateEmailLength = (email) => {
    if (email.length > 100) {
        throw new Error("Email is too long");
    }
};

const validateSignUpData = (req) => {
    const {firstName, lastName, emailId, password, confirmPassword} = req.body;
    
    // Only validate fields that are NOT handled by the model schema
    // Model already handles: firstName, lastName, emailId, password (all required: true)
    
    if (!confirmPassword) {
        throw new Error("Confirm password is required");
    }
    
    if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
    }
    
    validateFieldLength(firstName, "First name");
    validateFieldLength(lastName, "Last name");
    validateEmailLength(emailId);
}

module.exports = {validateSignUpData};          