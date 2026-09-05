import express from "express";
import {
  createWorkout,
  listWorkouts,
  updateWorkoutEntry,
  deleteWorkoutEntry,
  getSummary,
} from "../controllers/fitnessController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// All Fitness Tracking & Coaching routes require authentication
router.use(authMiddleware);

// GET /api/health/fitness/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/fitness/summary", getSummary);

// POST /api/health/daily-log/:date/workouts
router.post("/daily-log/:date/workouts", createWorkout);

// GET /api/health/daily-log/:date/workouts
router.get("/daily-log/:date/workouts", listWorkouts);

// PUT /api/health/daily-log/:date/workouts/:workoutId
router.put("/daily-log/:date/workouts/:workoutId", updateWorkoutEntry);

// DELETE /api/health/daily-log/:date/workouts/:workoutId
router.delete("/daily-log/:date/workouts/:workoutId", deleteWorkoutEntry);

export default router;
