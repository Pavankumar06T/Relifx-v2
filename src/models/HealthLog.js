import mongoose from "mongoose";

/**
 * ⚠️ KNOWN CONCEPTUAL DUPLICATE — flagged per integration contract.
 *
 * This model overlaps with Dhanajayan's existing DailyLog (one user +
 * one calendar day, storing glucose/meals/medicationAdherence/activity/
 * sleep/stress). I do not have write access to his models/DailyLog.js,
 * so I cannot merge the schemas myself. Until a data-model merge
 * decision is made, this stays as a SEPARATE collection ("HealthLog",
 * not "DailyLog") and is routed under a clearly distinct path
 * (/api/health/extended-logs, see routes/healthLogRoutes.js) so it
 * does not collide with his /api/health/daily-log routes or collection.
 *
 * Recommended follow-up (not done here, requires his file access):
 * fold whichever fields are unique to this schema (medications.dosage,
 * meal macros, sleep quality/bedtime/wakeTime, glucose timing/unit,
 * free-text notes) into his DailyLog schema as additive fields, then
 * retire this model and its routes.
 */

const glucoseSchema = new mongoose.Schema(
  {
    value: { type: Number, min: 0 },
    unit: { type: String, enum: ["mg/dL", "mmol/L"], default: "mg/dL" },
    timing: { type: String, enum: ["fasting", "before_meal", "after_meal", "bedtime", "random"] },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const mealSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    mealType: { type: String, enum: ["breakfast", "lunch", "dinner", "snack"] },
    calories: { type: Number, min: 0 },
    carbsGrams: { type: Number, min: 0 },
    proteinGrams: { type: Number, min: 0 },
    loggedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const medicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, trim: true },
    takenAt: { type: Date, default: Date.now },
    taken: { type: Boolean, default: true },
  },
  { _id: false }
);

const activitySchema = new mongoose.Schema(
  {
    type: { type: String, trim: true },
    durationMinutes: { type: Number, min: 0 },
    steps: { type: Number, min: 0 },
    caloriesBurned: { type: Number, min: 0 },
    intensity: { type: String, enum: ["low", "moderate", "high"] },
  },
  { _id: false }
);

const healthLogSchema = new mongoose.Schema(
  {
    // Kept as String (not ObjectId ref) intentionally: req.userId from the
    // shared authMiddleware is a string form of the Mongo _id, and this
    // schema predates that contract. Safe to leave as String.
    userId: { type: String, required: true, index: true },
    date: { type: Date, required: true, index: true },
    glucose: [glucoseSchema],
    meals: [mealSchema],
    medications: [medicationSchema],
    activity: activitySchema,
    sleep: {
      hours: { type: Number, min: 0, max: 24 },
      quality: { type: Number, min: 1, max: 5 },
      bedtime: Date,
      wakeTime: Date,
    },
    stress: {
      level: { type: Number, min: 1, max: 10 },
      note: { type: String, trim: true, maxlength: 1000 },
    },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true, minimize: false }
);

healthLogSchema.index({ userId: 1, date: 1 }, { unique: true });

const HealthLog = mongoose.model("HealthLog", healthLogSchema);

export default HealthLog;
