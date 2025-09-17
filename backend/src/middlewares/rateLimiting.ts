import rateLimit from 'express-rate-limit';

// DRY: Common rate limiter configuration
const createRateLimiter = (windowMs: number, max: number, errorMessage: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: errorMessage
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Rate limiting configurations using environment variables
const rateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS!);
const rateLimitMaxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS!);

const loginLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 requests per window
  "Too many login attempts, please try again after 15 minutes"
);

const forgotPasswordLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  3, // 3 requests per hour
  "Too many password reset requests, please try again after 1 hour"
);

const oauthLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10, // 10 OAuth attempts per 15 minutes
  "Too many OAuth attempts, please try again after 15 minutes"
);

// General API rate limiter
const apiLimiter = createRateLimiter(
  rateLimitWindow,
  rateLimitMaxRequests,
  "Too many requests, please try again later"
);

export {
  loginLimiter,
  forgotPasswordLimiter,
  oauthLimiter,
  apiLimiter
};
