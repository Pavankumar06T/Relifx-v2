const mongoose = require("mongoose");

const workoutSchema = new mongoose.Schema({
    // String keeps this model compatible with the existing auth-provider-neutral convention.
    userId: { type: String, required: true, index: true },
    date: { type: Date, required: true, default: Date.now, index: true },
    workoutType: {
        type: String,
        required: true,
        enum: ["walking", "running", "cycling", "strength_training", "yoga", "swimming", "other"]
    },
    exerciseName: { type: String, required: true, trim: true, maxlength: 120 },
    durationMinutes: { type: Number, required: true, min: 1, max: 1440 },
    intensity: { type: String, enum: ["low", "moderate", "high"], default: "moderate" },
    caloriesBurned: { type: Number, min: 0, default: 0 },
    notes: { type: String, trim: true, maxlength: 1000 }
}, { timestamps: true });

workoutSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model("Workout", workoutSchema);
