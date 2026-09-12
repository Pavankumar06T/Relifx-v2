import mongoose from "mongoose";

// No equivalent exists in Dhanajayan's backend - habit/streak tracking is
// a genuinely new entity, not a duplicate of User, DailyLog, or Workout.
// Safe to keep as its own collection.

const checkInSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    completedAt: { type: Date, default: Date.now },
    note: { type: String, trim: true, maxlength: 500 },
    source: { type: String, enum: ["manual", "cron"], default: "manual" },
  },
  { _id: false }
);

const freezeSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    appliedAt: { type: Date, default: Date.now },
    reason: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const habitSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    category: {
      type: String,
      enum: ["nutrition", "medication", "activity", "sleep", "mindfulness", "custom"],
      default: "custom",
    },
    targetDays: { type: Number, default: 66, min: 1, max: 366 },
    active: { type: Boolean, default: true },
    timezone: { type: String, default: "Asia/Kolkata" },
    freezeCredits: { type: Number, default: 2, min: 0, max: 30 },
    checkIns: [checkInSchema],
    freezeDays: [freezeSchema],
    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    lastCompletedDate: Date,
  },
  { timestamps: true }
);

habitSchema.index({ userId: 1, active: 1 });

const Habit = mongoose.model("Habit", habitSchema);

export default Habit;
