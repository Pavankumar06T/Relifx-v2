import mongoose from "mongoose";

const glucoseEntrySchema = new mongoose.Schema(
  {
    value: {
      type: Number,
      required: [true, "Glucose value is required"],
    },
    measuredAt: {
      type: Date,
      required: [true, "Glucose measuredAt is required"],
    },
  },
  { _id: false }
);

const mealEntrySchema = new mongoose.Schema(
  {
    mealType: {
      type: String,
      trim: true,
      required: [true, "mealType is required"],
    },
    description: {
      type: String,
      trim: true,
      required: [true, "description is required"],
    },
    loggedAt: {
      type: Date,
      required: [true, "loggedAt is required"],
    },
  },
  { _id: false }
);

const medicationAdherenceEntrySchema = new mongoose.Schema(
  {
    medication: {
      type: String,
      trim: true,
      required: [true, "medication is required"],
    },
    taken: {
      type: Boolean,
      required: [true, "taken is required"],
    },
    loggedAt: {
      type: Date,
      required: [true, "loggedAt is required"],
    },
  },
  { _id: false }
);

const activitySchema = new mongoose.Schema(
  {
    activityType: {
      type: String,
      trim: true,
    },
    durationMinutes: {
      type: Number,
      min: [0, "durationMinutes cannot be negative"],
    },
    loggedAt: {
      type: Date,
    },
  },
  { _id: false }
);

const sleepSchema = new mongoose.Schema(
  {
    sleepTime: {
      type: Date,
    },
    wakeTime: {
      type: Date,
    },
    durationMinutes: {
      type: Number,
      min: [0, "durationMinutes cannot be negative"],
    },
  },
  { _id: false }
);

/**
 * Fitness Tracking (Module 6)
 * Represents a single workout/exercise session logged for a given day.
 * Distinct from the legacy singular `activity` field, which is left
 * untouched for backward compatibility. Multiple workouts can be
 * logged per day, each retaining its own sub-document _id so that
 * individual entries can be targeted for update/delete.
 */
const workoutEntrySchema = new mongoose.Schema(
  {
    activityType: {
      type: String,
      trim: true,
      required: [true, "activityType is required"],
    },
    durationMinutes: {
      type: Number,
      required: [true, "durationMinutes is required"],
      min: [0, "durationMinutes cannot be negative"],
    },
    caloriesBurned: {
      type: Number,
      min: [0, "caloriesBurned cannot be negative"],
    },
    intensity: {
      type: String,
      enum: {
        values: ["low", "moderate", "high"],
        message: "intensity must be one of: low, moderate, high",
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "notes cannot exceed 500 characters"],
    },
    loggedAt: {
      type: Date,
      required: [true, "loggedAt is required"],
    },
  },
  { timestamps: true }
);

const dailyLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required"],
    },
    date: {
      type: Date,
      required: [true, "date is required"],
    },
    glucose: {
      type: [glucoseEntrySchema],
      default: [],
    },
    meals: {
      type: [mealEntrySchema],
      default: [],
    },
    medicationAdherence: {
      type: [medicationAdherenceEntrySchema],
      default: [],
    },
    activity: {
      type: activitySchema,
      default: {},
    },
    // Module 6: Fitness Tracking & Coaching - additive field only.
    // The legacy `activity` field above is untouched.
    workouts: {
      type: [workoutEntrySchema],
      default: [],
    },
    sleep: {
      type: sleepSchema,
      default: {},
    },
    stress: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

// A user must not have more than one DailyLog per calendar day
dailyLogSchema.index({ userId: 1, date: 1 }, { unique: true });

const DailyLog = mongoose.model("DailyLog", dailyLogSchema);

export default DailyLog;
