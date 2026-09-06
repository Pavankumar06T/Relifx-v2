const mongoose = require("mongoose");

const glucoseSchema = new mongoose.Schema({
    value: { type: Number, min: 0 },
    unit: { type: String, enum: ["mg/dL", "mmol/L"], default: "mg/dL" },
    timing: { type: String, enum: ["fasting", "before_meal", "after_meal", "bedtime", "random"] },
    recordedAt: { type: Date, default: Date.now }
}, { _id: false });

const mealSchema = new mongoose.Schema({
    name: { type: String, trim: true },
    mealType: { type: String, enum: ["breakfast", "lunch", "dinner", "snack"] },
    calories: { type: Number, min: 0 },
    carbsGrams: { type: Number, min: 0 },
    proteinGrams: { type: Number, min: 0 },
    loggedAt: { type: Date, default: Date.now }
}, { _id: false });

const medicationSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    dosage: { type: String, trim: true },
    takenAt: { type: Date, default: Date.now },
    taken: { type: Boolean, default: true }
}, { _id: false });

const activitySchema = new mongoose.Schema({
    type: { type: String, trim: true },
    durationMinutes: { type: Number, min: 0 },
    steps: { type: Number, min: 0 },
    caloriesBurned: { type: Number, min: 0 },
    intensity: { type: String, enum: ["low", "moderate", "high"] }
}, { _id: false });

const healthLogSchema = new mongoose.Schema({
    // String deliberately supports any auth provider's user identifier.
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
        wakeTime: Date
    },
    stress: {
        level: { type: Number, min: 1, max: 10 },
        note: { type: String, trim: true, maxlength: 1000 }
    },
    notes: { type: String, trim: true, maxlength: 2000 }
}, { timestamps: true, minimize: false });

healthLogSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("HealthLog", healthLogSchema);
