import express from "express";
import { updateOnboarding } from "../controllers/profileController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// PUT /api/profile/onboarding
router.put("/onboarding", authMiddleware, updateOnboarding);

export default router;
