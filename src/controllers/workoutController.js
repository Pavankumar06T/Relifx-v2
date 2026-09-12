import Workout from "../models/Workout.js";
import { addDays, startOfDay } from "../services/dateService.js";

const EDITABLE_FIELDS = ["date", "workoutType", "exerciseName", "durationMinutes", "intensity", "caloriesBurned", "notes"];
const average = (values) =>
  values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : 0;

function pickEditableFields(body = {}) {
  const fields = Object.fromEntries(
    EDITABLE_FIELDS.filter((field) => body[field] !== undefined).map((field) => [field, body[field]])
  );
  if (fields.date !== undefined) fields.date = startOfDay(fields.date);
  return fields;
}

function dateFilter(req) {
  const to = startOfDay(req.query.to || new Date());
  const from = startOfDay(req.query.from || addDays(to, -29));
  if (from > to) {
    const error = new Error("from must be on or before to");
    error.statusCode = 400;
    throw error;
  }
  return { from, to };
}

function breakdownByType(workouts) {
  return workouts.reduce((breakdown, workout) => {
    const current = breakdown[workout.workoutType] || { workouts: 0, durationMinutes: 0, caloriesBurned: 0 };
    current.workouts += 1;
    current.durationMinutes += workout.durationMinutes;
    current.caloriesBurned += workout.caloriesBurned;
    breakdown[workout.workoutType] = current;
    return breakdown;
  }, {});
}

/**
 * POST /api/health/workouts-extended
 * Ownership always comes from req.userId - never from the request body.
 */
export const createWorkout = async (req, res, next) => {
  try {
    const workout = await Workout.create({
      ...pickEditableFields(req.body),
      userId: req.userId,
      date: startOfDay(req.body.date || new Date()),
    });

    res.status(201).json({
      success: true,
      message: "Workout logged successfully",
      data: workout,
    });
  } catch (error) {
    next(error);
  }
};

export const listWorkouts = async (req, res, next) => {
  try {
    const { from, to } = dateFilter(req);
    const workouts = await Workout.find({ userId: req.userId, date: { $gte: from, $lte: to } }).sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Workouts retrieved successfully",
      data: workouts,
      range: { from, to },
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkout = async (req, res, next) => {
  try {
    const workout = await Workout.findOne({ _id: req.params.workoutId, userId: req.userId });

    if (!workout) {
      return res.status(404).json({ success: false, message: "Workout not found" });
    }

    res.status(200).json({
      success: true,
      message: "Workout retrieved successfully",
      data: workout,
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorkout = async (req, res, next) => {
  try {
    const workout = await Workout.findOneAndUpdate(
      { _id: req.params.workoutId, userId: req.userId },
      { $set: pickEditableFields(req.body) },
      { new: true, runValidators: true }
    );

    if (!workout) {
      return res.status(404).json({ success: false, message: "Workout not found" });
    }

    res.status(200).json({
      success: true,
      message: "Workout updated successfully",
      data: workout,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteWorkout = async (req, res, next) => {
  try {
    const workout = await Workout.findOneAndDelete({ _id: req.params.workoutId, userId: req.userId });

    if (!workout) {
      return res.status(404).json({ success: false, message: "Workout not found" });
    }

    // Changed from 204 No Content to 200 + envelope to match Dhanajayan's
    // { success, message, data } response contract used everywhere else.
    res.status(200).json({
      success: true,
      message: "Workout deleted successfully",
      data: workout,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkoutSummary = async (req, res, next) => {
  try {
    const { from, to } = dateFilter(req);
    const workouts = await Workout.find({ userId: req.userId, date: { $gte: from, $lte: to } }).lean();

    const totalDurationMinutes = workouts.reduce((sum, workout) => sum + workout.durationMinutes, 0);
    const totalCaloriesBurned = workouts.reduce((sum, workout) => sum + workout.caloriesBurned, 0);

    res.status(200).json({
      success: true,
      message: "Workout summary retrieved successfully",
      range: { from, to },
      data: {
        numberOfWorkouts: workouts.length,
        totalDurationMinutes,
        totalCaloriesBurned,
        averageWorkoutDuration: average(workouts.map((workout) => workout.durationMinutes)),
        workoutBreakdownByType: breakdownByType(workouts),
      },
    });
  } catch (error) {
    next(error);
  }
};

export { breakdownByType };
