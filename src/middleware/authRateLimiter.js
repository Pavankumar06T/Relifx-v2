import rateLimit from "express-rate-limit";

/**
 * Rate limiter applied only to sensitive, unauthenticated auth endpoints
 * (register/login) to slow down credential-stuffing / brute-force attempts.
 * Deliberately NOT applied to authenticated CRUD routes elsewhere in the
 * app, per project scope.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

export default authRateLimiter;
