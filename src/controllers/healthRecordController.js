import HealthLog from "../models/HealthLog.js";
import Habit from "../models/Habit.js";
import Workout from "../models/Workout.js";
import { addDays, startOfDay } from "../services/dateService.js";

const average = (values) =>
  values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null;

/**
 * GET /api/health/records
 * Stable AI-consumption contract: one normalized item per calendar day.
 * Fields with no observations are null rather than fabricated values.
 */
export const aggregateHealthRecords = async (req, res, next) => {
  try {
    const to = startOfDay(req.query.to || new Date());
    const from = startOfDay(req.query.from || addDays(to, -29));

    if (from > to) {
      const error = new Error("from must be on or before to");
      error.statusCode = 400;
      throw error;
    }

    const [logs, habits, workouts] = await Promise.all([
      HealthLog.find({ userId: req.userId, date: { $gte: from, $lte: to } }).sort({ date: 1 }).lean(),
      Habit.find({ userId: req.userId, active: true }).lean(),
      Workout.find({ userId: req.userId, date: { $gte: from, $lte: to } }).lean(),
    ]);

    const dailyRecords = logs.map((log) => {
      const glucose = (log.glucose || []).map((entry) => entry.value).filter(Number.isFinite);
      const meals = log.meals || [];
      const medication = log.medications || [];
      return {
        date: log.date.toISOString().slice(0, 10),
        glucose: { average: average(glucose), readings: glucose.length, unit: log.glucose?.[0]?.unit || "mg/dL" },
        nutrition: {
          mealsLogged: meals.length,
          calories: meals.reduce((sum, meal) => sum + (meal.calories || 0), 0),
          carbsGrams: meals.reduce((sum, meal) => sum + (meal.carbsGrams || 0), 0),
        },
        medication: { scheduled: medication.length, taken: medication.filter((entry) => entry.taken !== false).length },
        activity: log.activity
          ? { durationMinutes: log.activity.durationMinutes || 0, steps: log.activity.steps || 0, caloriesBurned: log.activity.caloriesBurned || 0 }
          : null,
        sleep: log.sleep?.hours !== undefined ? { hours: log.sleep.hours, quality: log.sleep.quality ?? null } : null,
        stress: log.stress?.level !== undefined ? { level: log.stress.level, note: log.stress.note || null } : null,
      };
    });

    const allGlucose = logs.flatMap((log) => (log.glucose || []).map((entry) => entry.value).filter(Number.isFinite));
    const sleepHours = dailyRecords.map((record) => record.sleep?.hours).filter(Number.isFinite);
    const stressLevels = dailyRecords.map((record) => record.stress?.level).filter(Number.isFinite);

    res.status(200).json({
      success: true,
      message: "Health records aggregated successfully",
      schemaVersion: "1.0",
      range: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
      summary: {
        loggedDays: dailyRecords.length,
        averageGlucose: average(allGlucose),
        totalActivityMinutes: dailyRecords.reduce((sum, record) => sum + (record.activity?.durationMinutes || 0), 0),
        totalSteps: dailyRecords.reduce((sum, record) => sum + (record.activity?.steps || 0), 0),
        averageSleepHours: average(sleepHours),
        averageStressLevel: average(stressLevels),
      },
      habits: {
        active: habits.length,
        completed: habits.filter((habit) => habit.currentStreak >= habit.targetDays).length,
        items: habits.map((habit) => ({
          id: String(habit._id),
          name: habit.name,
          category: habit.category,
          targetDays: habit.targetDays,
          currentStreak: habit.currentStreak,
          longestStreak: habit.longestStreak,
          freezeCredits: habit.freezeCredits,
          completed: habit.currentStreak >= habit.targetDays,
        })),
      },
      fitness: {
        workouts: workouts.length,
        totalDurationMinutes: workouts.reduce((sum, workout) => sum + workout.durationMinutes, 0),
        totalCaloriesBurned: workouts.reduce((sum, workout) => sum + workout.caloriesBurned, 0),
        averageDurationMinutes: average(workouts.map((workout) => workout.durationMinutes)),
        workoutTypes: workouts.reduce((types, workout) => {
          types[workout.workoutType] = (types[workout.workoutType] || 0) + 1;
          return types;
        }, {}),
      },
      // Both keys point at the same array: "data" to match Dhanajayan's
      // {success, message, data} envelope, "dailyRecords" kept for
      // backward compatibility with Harsha's existing tests/README.
      data: dailyRecords,
      dailyRecords,
    });
  } catch (error) {
    next(error);
  }
};
