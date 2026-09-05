import express from "express";
import { register, login, protectedTest } from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// GET /api/auth/protected-test
router.get("/protected-test", authMiddleware, protectedTest);

export default router;


