import express from "express";
import { register, login, protectedTest } from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import authRateLimiter from "../middleware/authRateLimiter.js";

const router = express.Router();

// POST /api/auth/register
router.post("/register", authRateLimiter, register);

// POST /api/auth/login
router.post("/login", authRateLimiter, login);

// GET /api/auth/protected-test
router.get("/protected-test", authMiddleware, protectedTest);

export default router;


