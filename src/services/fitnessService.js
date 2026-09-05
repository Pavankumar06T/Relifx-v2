import DailyLog from "../models/DailyLog.js";

const ALLOWED_INTENSITIES = ["low", "moderate", "high"];

/**
 * Normalize a date input into a UTC-midnight Date object representing
 * the calendar day. Mirrors the normalizeDate() convention already
 * established in dailyLogService.js so that fitness lookups key on
 * exactly the same calendar-day semantics as the rest of DailyLog.
 *
 * @param {string|Date} input
 * @returns {Date} UTC midnight Date object
 */
const normalizeDate = (input) => {
  if (input === undefined || input === null || input === "") {
    const error = new Error("date is required");
    error.statusCode = 400;
    throw error;
  }

  let year, month, day;

  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    const [y, m, d] = input.trim().split("-").map(Number);
    year = y;
    month = m;
    day = d;
  } else {
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) {
      const error = new Error("date must be a valid date");
      error.statusCode = 400;
      throw error;
    }
    year = parsed.getUTCFullYear();
    month = parsed.getUTCMonth() + 1;
    day = parsed.getUTCDate();
  }

  const normalized = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  if (Number.isNaN(normalized.getTime())) {
    const error = new Error("date must be a valid date");
    error.statusCode = 400;
    throw error;
  }

  return normalized;
};

const toValidatedDate = (value, fieldName) => {
  if (value === undefined || value === null) {
    const error = new Error(`${fieldName} is required`);
    error.statusCode = 400;
    throw error;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} must be a valid date`);
    error.statusCode = 400;
    throw error;
  }
  return date;
};

/**
 * Validate and normalize a workout payload into an explicit,
 * allow-listed set of fields. Only fields defined on workoutEntrySchema
 * are accepted - anything else in the payload is silently dropped.
 * Used for both create (all required fields must be present) and
 * update (partial payload allowed) flows.
 *
 * @param {Object} payload
 * @param {boolean} isPartial - true for update (PUT), false for create (POST)
 */
const buildWorkoutFields = (payload = {}, isPartial = false) => {
  const { activityType, durationMinutes, caloriesBurned, intensity, notes, loggedAt } = payload;

  const fields = {};

  // activityType: required on create, optional on update
  if (!isPartial || activityType !== undefined) {
    if (typeof activityType !== "string" || !activityType.trim()) {
      const error = new Error("activityType must be a valid non-empty string");
      error.statusCode = 400;
      throw error;
    }
    fields.activityType = activityType.trim();
  }

  // durationMinutes: required on create, optional on update
  if (!isPartial || durationMinutes !== undefined) {
    if (typeof durationMinutes !== "number" || Number.isNaN(durationMinutes)) {
      const error = new Error("durationMinutes must be numeric");
      error.statusCode = 400;
      throw error;
    }
    if (durationMinutes < 0) {
      const error = new Error("durationMinutes must not be negative");
      error.statusCode = 400;
      throw error;
    }
    fields.durationMinutes = durationMinutes;
  }

  // caloriesBurned: always optional, user/device-provided (no calculation performed here)
  if (caloriesBurned !== undefined && caloriesBurned !== null) {
    if (typeof caloriesBurned !== "number" || Number.isNaN(caloriesBurned)) {
      const error = new Error("caloriesBurned must be numeric");
      error.statusCode = 400;
      throw error;
    }
    if (caloriesBurned < 0) {
      const error = new Error("caloriesBurned must not be negative");
      error.statusCode = 400;
      throw error;
    }
    fields.caloriesBurned = caloriesBurned;
  }

  // intensity: always optional
  if (intensity !== undefined && intensity !== null) {
    if (typeof intensity !== "string" || !ALLOWED_INTENSITIES.includes(intensity)) {
      const error = new Error(`intensity must be one of: ${ALLOWED_INTENSITIES.join(", ")}`);
      error.statusCode = 400;
      throw error;
    }
    fields.intensity = intensity;
  }

  // notes: always optional
  if (notes !== undefined && notes !== null) {
    if (typeof notes !== "string") {
      const error = new Error("notes must be a string");
      error.statusCode = 400;
      throw error;
    }
    if (notes.length > 500) {
      const error = new Error("notes cannot exceed 500 characters");
      error.statusCode = 400;
      throw error;
    }
    fields.notes = notes.trim();
  }

  // loggedAt: required on create, optional on update
  if (!isPartial || loggedAt !== undefined) {
    fields.loggedAt = toValidatedDate(loggedAt, "loggedAt");
  }

  return fields;
};

const toSafeWorkout = (entry) => ({
  id: entry._id,
  activityType: entry.activityType,
  durationMinutes: entry.durationMinutes,
  caloriesBurned: entry.caloriesBurned,
  intensity: entry.intensity,
  notes: entry.notes,
  loggedAt: entry.loggedAt,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
});

const toSafeDailyLog = (doc) => ({
  id: doc._id,
  userId: doc.userId,
  date: doc.date,
  glucose: doc.glucose,
  meals: doc.meals,
  medicationAdherence: doc.medicationAdherence,
  activity: doc.activity,
  workouts: (doc.workouts || []).map(toSafeWorkout),
  sleep: doc.sleep,
  stress: doc.stress,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const findOwnedLogOrThrow = async (userId, dateParam) => {
  const date = normalizeDate(dateParam);
  const dailyLog = await DailyLog.findOne({ userId, date });

  if (!dailyLog) {
    const error = new Error("Daily log not found");
    error.statusCode = 404;
    throw error;
  }

  return dailyLog;
};

const findOwnedWorkoutOrThrow = (dailyLog, workoutId) => {
  const workout = dailyLog.workouts.id(workoutId);

  if (!workout) {
    const error = new Error("Workout not found");
    error.statusCode = 404;
    throw error;
  }

  return workout;
};

/**
 * Add a new workout entry to the authenticated user's DailyLog for a
 * specific date. The DailyLog for that date must already exist
 * (created via POST /api/health/daily-log).
 */
export const addWorkout = async (userId, dateParam, payload = {}) => {
  const dailyLog = await findOwnedLogOrThrow(userId, dateParam);
  const workoutFields = buildWorkoutFields(payload, false);

  dailyLog.workouts.push(workoutFields);
  await dailyLog.save();

  return toSafeDailyLog(dailyLog);
};

/**
 * Get all workout entries for the authenticated user's DailyLog on a
 * specific date.
 */
export const getWorkouts = async (userId, dateParam) => {
  const dailyLog = await findOwnedLogOrThrow(userId, dateParam);
  return dailyLog.workouts.map(toSafeWorkout);
};

/**
 * Update a specific workout entry (by sub-document id) within the
 * authenticated user's DailyLog for a specific date.
 */
export const updateWorkout = async (userId, dateParam, workoutId, payload = {}) => {
  const dailyLog = await findOwnedLogOrThrow(userId, dateParam);
  const workout = findOwnedWorkoutOrThrow(dailyLog, workoutId);

  const workoutFields = buildWorkoutFields(payload, true);

  Object.assign(workout, workoutFields);
  await dailyLog.save();

  return toSafeDailyLog(dailyLog);
};

/**
 * Delete a specific workout entry (by sub-document id) within the
 * authenticated user's DailyLog for a specific date.
 */
export const deleteWorkout = async (userId, dateParam, workoutId) => {
  const dailyLog = await findOwnedLogOrThrow(userId, dateParam);
  const workout = findOwnedWorkoutOrThrow(dailyLog, workoutId);

  workout.deleteOne();
  await dailyLog.save();

  return toSafeDailyLog(dailyLog);
};

/**
 * Build a pre-aggregated fitness summary for the authenticated user
 * across an optional date range. This performs plain arithmetic
 * aggregation only (totals, averages, session counts) - no AI/coaching
 * logic. It exists to give a future coaching module a ready-made,
 * structured input shape without that module needing to re-query
 * MongoDB or duplicate this aggregation logic.
 *
 * @param {string} userId
 * @param {string} [fromParam] - optional inclusive start date (YYYY-MM-DD)
 * @param {string} [toParam] - optional inclusive end date (YYYY-MM-DD)
 */
export const getFitnessSummary = async (userId, fromParam, toParam) => {
  const dateFilter = {};

  if (fromParam !== undefined && fromParam !== null && fromParam !== "") {
    dateFilter.$gte = normalizeDate(fromParam);
  }
  if (toParam !== undefined && toParam !== null && toParam !== "") {
    dateFilter.$lte = normalizeDate(toParam);
  }

  const query = { userId };
  if (Object.keys(dateFilter).length > 0) {
    query.date = dateFilter;
  }

  const dailyLogs = await DailyLog.find(query).sort({ date: 1 });

  let totalSessions = 0;
  let totalDurationMinutes = 0;
  let totalCaloriesBurned = 0;
  let caloriesTrackedSessions = 0;
  const activityTypeCounts = {};

  for (const log of dailyLogs) {
    for (const workout of log.workouts) {
      totalSessions += 1;
      totalDurationMinutes += workout.durationMinutes || 0;

      if (workout.caloriesBurned !== undefined && workout.caloriesBurned !== null) {
        totalCaloriesBurned += workout.caloriesBurned;
        caloriesTrackedSessions += 1;
      }

      const type = workout.activityType;
      activityTypeCounts[type] = (activityTypeCounts[type] || 0) + 1;
    }
  }

  return {
    from: fromParam || null,
    to: toParam || null,
    totalSessions,
    totalDurationMinutes,
    averageDurationMinutes: totalSessions > 0 ? Math.round((totalDurationMinutes / totalSessions) * 100) / 100 : 0,
    totalCaloriesBurned: caloriesTrackedSessions > 0 ? totalCaloriesBurned : null,
    activityTypeCounts,
  };
};

export { toSafeDailyLog };
