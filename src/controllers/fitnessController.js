import {
  addWorkout,
  getWorkouts,
  updateWorkout,
  deleteWorkout,
  getFitnessSummary,
} from "../services/fitnessService.js";

/**
 * Controller to add a workout entry to the authenticated user's
 * DailyLog for a specific date.
 * POST /api/health/daily-log/:date/workouts
 */
export const createWorkout = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;
    const payload = req.body || {};

    const updatedLog = await addWorkout(userId, date, payload);

    res.status(201).json({
      success: true,
      message: "Workout logged successfully",
      data: updatedLog,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to list all workout entries for the authenticated user's
 * DailyLog on a specific date.
 * GET /api/health/daily-log/:date/workouts
 */
export const listWorkouts = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;

    const workouts = await getWorkouts(userId, date);

    res.status(200).json({
      success: true,
      message: "Workouts retrieved successfully",
      data: workouts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to update a specific workout entry for the authenticated
 * user's DailyLog on a specific date.
 * PUT /api/health/daily-log/:date/workouts/:workoutId
 */
export const updateWorkoutEntry = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { date, workoutId } = req.params;
    const payload = req.body || {};

    const updatedLog = await updateWorkout(userId, date, workoutId, payload);

    res.status(200).json({
      success: true,
      message: "Workout updated successfully",
      data: updatedLog,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to delete a specific workout entry for the authenticated
 * user's DailyLog on a specific date.
 * DELETE /api/health/daily-log/:date/workouts/:workoutId
 */
export const deleteWorkoutEntry = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { date, workoutId } = req.params;

    const updatedLog = await deleteWorkout(userId, date, workoutId);

    res.status(200).json({
      success: true,
      message: "Workout deleted successfully",
      data: updatedLog,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to retrieve an aggregated fitness summary for the
 * authenticated user over an optional date range.
 * GET /api/health/fitness/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export const getSummary = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { from, to } = req.query;

    const summary = await getFitnessSummary(userId, from, to);

    res.status(200).json({
      success: true,
      message: "Fitness summary retrieved successfully",
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};
