import express from "express";
import { requireUser } from "../middleware/requireUser.js";
import {
  createWorkout,
  listWorkouts,
  getWorkout,
  updateWorkout,
  deleteWorkout,
  getWorkoutSummary,
} from "../controllers/workoutController.js";

const router = express.Router();

// NOTE: mount this router at "/api/health/workouts-extended" in the
// shared app.js, NOT "/api/workouts" (the old standalone path) and NOT
// under Dhanajayan's "/api/health/fitness/*" or
// "/api/health/daily-log/:date/workouts" paths - those belong to his
// embedded DailyLog.workouts sub-schema. See models/Workout.js for why
// this is a temporarily separate collection pending a merge decision.
router.use(requireUser);

router.get("/summary", getWorkoutSummary);
router.route("/").post(createWorkout).get(listWorkouts);
router.route("/:workoutId").get(getWorkout).patch(updateWorkout).delete(deleteWorkout);

export default router;
