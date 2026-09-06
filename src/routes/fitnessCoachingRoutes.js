import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { getFitnessCoaching } from "../controllers/fitnessCoachingController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Dedicated, lightweight rate limiter scoped ONLY to the AI coaching
 * endpoint. Kept separate from authRateLimiter (which only guards the
 * unauthenticated /register and /login endpoints) because every request
 * here triggers a billed Gemini API call and is made by an already
 * authenticated user, so it is limited per-user rather than per-IP.
 */
const coachingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 AI coaching requests per user per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId?.toString() || ipKeyGenerator(req.ip),
  message: {
    success: false,
    message: "Too many coaching requests. Please try again later.",
  },
});

// All Fitness Coaching routes require authentication.
router.use(authMiddleware);

// POST /api/health/fitness/coaching
router.post("/coaching", coachingRateLimiter, getFitnessCoaching);

export default router;
