/*
 * DEVELOPMENT ONLY. This script is intentionally restricted to the fake
 * user below so it cannot be used to load, modify, or expose real health
 * data. Unchanged in behavior from the original - converted to ESM only.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import HealthLog from "../models/HealthLog.js";
import Habit from "../models/Habit.js";
import Workout from "../models/Workout.js";

dotenv.config();

const SAMPLE_USER_ID = "test-user-001";

function daysAgo(days) {
  const value = new Date();
  value.setUTCHours(0, 0, 0, 0);
  value.setUTCDate(value.getUTCDate() - days);
  return value;
}

async function seed() {
  if (process.env.NODE_ENV !== "development" || process.env.ALLOW_DEVELOPMENT_SEED !== "true") {
    throw new Error("Refusing to seed. Set NODE_ENV=development and ALLOW_DEVELOPMENT_SEED=true.");
  }
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required to seed development data.");

  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([
    HealthLog.deleteMany({ userId: SAMPLE_USER_ID }),
    Habit.deleteMany({ userId: SAMPLE_USER_ID }),
    Workout.deleteMany({ userId: SAMPLE_USER_ID }),
  ]);

  await HealthLog.insertMany([
    {
      userId: SAMPLE_USER_ID,
      date: daysAgo(2),
      glucose: [{ value: 108, timing: "fasting" }, { value: 136, timing: "after_meal" }],
      meals: [{ name: "Example oats bowl", mealType: "breakfast", calories: 360, carbsGrams: 54 }],
      medications: [{ name: "Example medication", dosage: "500 mg", taken: true }],
      activity: { type: "walking", durationMinutes: 30, steps: 4300, intensity: "moderate" },
      sleep: { hours: 7.5, quality: 4 },
      stress: { level: 3, note: "Example low-stress day" },
    },
    {
      userId: SAMPLE_USER_ID,
      date: daysAgo(1),
      glucose: [{ value: 111, timing: "fasting" }],
      meals: [{ name: "Example salad", mealType: "lunch", calories: 430, carbsGrams: 38 }],
      activity: { type: "cycling", durationMinutes: 20, steps: 2100, intensity: "moderate" },
      sleep: { hours: 7, quality: 3 },
      stress: { level: 4, note: "Example busy day" },
    },
  ]);

  await Habit.insertMany([
    {
      userId: SAMPLE_USER_ID,
      name: "Example morning walk",
      category: "activity",
      targetDays: 66,
      currentStreak: 3,
      longestStreak: 5,
      lastCompletedDate: daysAgo(0),
      freezeCredits: 1,
      checkIns: [{ date: daysAgo(3) }, { date: daysAgo(1) }, { date: daysAgo(0) }],
      freezeDays: [{ date: daysAgo(2), reason: "Example development freeze" }],
    },
    {
      userId: SAMPLE_USER_ID,
      name: "Example hydration reminder",
      category: "nutrition",
      targetDays: 66,
      currentStreak: 1,
      longestStreak: 1,
      lastCompletedDate: daysAgo(0),
      freezeCredits: 2,
      checkIns: [{ date: daysAgo(0) }],
    },
  ]);

  await Workout.insertMany([
    { userId: SAMPLE_USER_ID, date: daysAgo(3), workoutType: "walking", exerciseName: "Example outdoor walk", durationMinutes: 30, intensity: "moderate", caloriesBurned: 150 },
    { userId: SAMPLE_USER_ID, date: daysAgo(2), workoutType: "cycling", exerciseName: "Example cycling session", durationMinutes: 45, intensity: "high", caloriesBurned: 300 },
    { userId: SAMPLE_USER_ID, date: daysAgo(1), workoutType: "strength_training", exerciseName: "Example strength training", durationMinutes: 40, intensity: "moderate", caloriesBurned: 220 },
  ]);

  console.log(`Development-only sample data seeded for ${SAMPLE_USER_ID}.`);
}

seed()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
