interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-100
  errors: string[];
  suggestions: string[];
}

interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxLength: number;
  forbiddenPatterns: string[];
}

// Modern password requirements
const MODERN_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxLength: 128,
  forbiddenPatterns: [
    'password',
    '123456',
    'qwerty',
    'abc123',
    'password123',
    'admin',
    'user',
    'test',
    'welcome',
    'hello',
    'monkey',
    'dragon',
    'master',
    'letmein',
    'freedom',
    'whatever',
    'qazwsx',
    'trustno1',
    '654321',
    'jordan23',
    'harley',
    'shadow',
    'superman',
    'qwertyuiop',
    'michael',
    'football',
    'iloveyou'
  ]
};

// Common weak passwords
const COMMON_WEAK_PASSWORDS = [
  'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
  'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1',
  'qwerty123', 'dragon', 'master', 'hello', 'freedom', 'whatever',
  'qazwsx', 'trustno1', '654321', 'jordan23', 'harley', 'password1',
  'shadow', 'superman', 'qwertyuiop', 'michael', 'football', 'iloveyou',
  '123123', '111111', '000000', '123321', '654321', '1234567',
  '12345678', '1234567890', 'qwertyui', 'asdfgh', 'zxcvbn',
  'qwerty1234', 'password12', 'admin123', 'root', 'toor'
];

export const validatePassword = (
  password: string, 
  requirements: PasswordRequirements = MODERN_REQUIREMENTS
): PasswordValidationResult => {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Length validation
  if (password.length < requirements.minLength) {
    errors.push(`Password must be at least ${requirements.minLength} characters long`);
  } else {
    score += 20;
  }

  if (password.length > requirements.maxLength) {
    errors.push(`Password must be no more than ${requirements.maxLength} characters long`);
  }

  // Character type validation
  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  } else if (requirements.requireUppercase) {
    score += 20;
  }

  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z)');
  } else if (requirements.requireLowercase) {
    score += 20;
  }

  if (requirements.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number (0-9)');
  } else if (requirements.requireNumbers) {
    score += 20;
  }

  if (requirements.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?~`)');
  } else if (requirements.requireSpecialChars) {
    score += 20;
  }

  // Check for forbidden patterns
  const lowerPassword = password.toLowerCase();
  for (const pattern of requirements.forbiddenPatterns) {
    if (lowerPassword.includes(pattern.toLowerCase())) {
      errors.push(`Password cannot contain common patterns like "${pattern}"`);
      break;
    }
  }

  // Check for common weak passwords
  if (COMMON_WEAK_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('Password is too common and easily guessable');
    score = Math.max(0, score - 30);
  }

  // Additional strength checks
  if (password.length >= 12) {
    score += 10;
  }

  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password should not contain repeated characters (e.g., aaa, 111)');
    score = Math.max(0, score - 10);
  }

  // Check for sequential characters
  if (/123|abc|qwe|asd|zxc|456|def|rty|fgh|vbn|789|ghi|uio|jkl|mno/i.test(password)) {
    errors.push('Password should not contain sequential characters (e.g., 123, abc)');
    score = Math.max(0, score - 10);
  }

  // Check for keyboard patterns
  if (/qwerty|asdfgh|zxcvbn|qazwsx|edcrfv|tgbyhn/i.test(password)) {
    errors.push('Password should not contain keyboard patterns');
    score = Math.max(0, score - 15);
  }

  // Generate suggestions based on missing requirements
  if (password.length < 8) {
    suggestions.push('Use at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    suggestions.push('Add at least one uppercase letter (A-Z)');
  }
  if (!/[a-z]/.test(password)) {
    suggestions.push('Add at least one lowercase letter (a-z)');
  }
  if (!/\d/.test(password)) {
    suggestions.push('Add at least one number (0-9)');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    suggestions.push('Add at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?~`)');
  }
  if (password.length < 12) {
    suggestions.push('Consider using 12+ characters for better security');
  }

  const isValid = errors.length === 0 && score >= 60;

  return {
    isValid,
    score: Math.min(100, Math.max(0, score)),
    errors,
    suggestions
  };
};

export const getPasswordStrength = (score: number): string => {
  if (score < 30) return 'Very Weak';
  if (score < 50) return 'Weak';
  if (score < 70) return 'Fair';
  if (score < 90) return 'Good';
  return 'Strong';
};

export const generateSecurePassword = (length: number = 16): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?~`';
  
  const allChars = uppercase + lowercase + numbers + special;
  let password = '';
  
  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

export { PasswordValidationResult, PasswordRequirements, MODERN_REQUIREMENTS };
