import mongoose from "mongoose";

/**
 * ⚠️ KNOWN CONCEPTUAL DUPLICATE — flagged per integration contract.
 *
 * Dhanajayan already has fitness tracking as a `workouts` sub-array
 * embedded inside his DailyLog documents (activityType, durationMinutes,
 * caloriesBurned, intensity, notes, loggedAt), reachable via
 * /api/health/daily-log/:date/workouts and /api/health/fitness/summary.
 *
 * This model is a top-level Workout collection (not embedded in a
 * calendar-day document), with a slightly different field set
 * (workoutType enum + exerciseName vs. his activityType, plus a
 * "date" field independent of a parent DailyLog). I don't have write
 * access to his DailyLog.js, so I can't fold this into his embedded
 * workouts sub-schema myself. Kept as a separate collection, routed
 * under /api/health/workouts-extended (see routes/workoutRoutes.js)
 * to avoid colliding with his /api/health/fitness/* paths.
 *
 * Recommended follow-up (requires his file access): decide whether
 * exerciseName + workoutType should just become additional fields on
 * his existing workoutEntrySchema, then retire this collection/routes.
 */

const workoutSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    date: { type: Date, required: true, default: Date.now, index: true },
    workoutType: {
      type: String,
      required: true,
      enum: ["walking", "running", "cycling", "strength_training", "yoga", "swimming", "other"],
    },
    exerciseName: { type: String, required: true, trim: true, maxlength: 120 },
    durationMinutes: { type: Number, required: true, min: 1, max: 1440 },
    intensity: { type: String, enum: ["low", "moderate", "high"], default: "moderate" },
    caloriesBurned: { type: Number, min: 0, default: 0 },
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

workoutSchema.index({ userId: 1, date: -1 });

const Workout = mongoose.model("Workout", workoutSchema);

export default Workout;
