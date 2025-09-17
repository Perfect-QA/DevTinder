import validator from "validator";
import { Request } from 'express';

// DRY: Common validation functions
const validateFieldLength = (field: string, fieldName: string, minLength: number = 2, maxLength: number = 30): void => {
    if (field.length < minLength || field.length > maxLength) {
        throw new Error(`${fieldName} must be between ${minLength} and ${maxLength} characters`);
    }
};

const validateEmailLength = (email: string): void => {
    if (email.length > 100) {
        throw new Error("Email is too long");
    }
};

const validateSignUpData = (req: Request): void => {
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

export { validateSignUpData };
