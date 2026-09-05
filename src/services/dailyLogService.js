import DailyLog from "../models/DailyLog.js";

/**
 * Normalize a date input into a UTC-midnight Date object representing
 * the calendar day. This ensures that the same calendar day always
 * maps to the exact same stored Date value, regardless of the time
 * component or timezone offset supplied by the client. This is what
 * makes the (userId + date) uniqueness guarantee reliable.
 *
 * Accepts:
 *  - "YYYY-MM-DD" strings (preferred, used in URL params)
 *  - full ISO strings / Date objects (time portion is discarded)
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
    // Plain calendar-date string - parse components directly to avoid
    // any local-timezone interpretation.
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
    // Use the UTC calendar fields of whatever was parsed
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

const isValidDate = (value) => value instanceof Date ? !Number.isNaN(value.getTime()) : !Number.isNaN(new Date(value).getTime());

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
 * Validate and normalize the full DailyLog payload into an explicit,
 * allow-listed set of fields. Only fields defined on the DailyLog model
 * are accepted - anything else in the payload is silently dropped.
 */
const buildAllowedFields = (payload = {}) => {
  const { glucose, meals, medicationAdherence, activity, sleep, stress } = payload;

  const fields = {};

  // glucose: array of { value: Number, measuredAt: Date }
  if (glucose !== undefined && glucose !== null) {
    if (!Array.isArray(glucose)) {
      const error = new Error("glucose must be an array");
      error.statusCode = 400;
      throw error;
    }
    fields.glucose = glucose.map((entry) => {
      if (typeof entry.value !== "number" || Number.isNaN(entry.value)) {
        const error = new Error("glucose.value must be numeric");
        error.statusCode = 400;
        throw error;
      }
      const measuredAt = toValidatedDate(entry.measuredAt, "glucose.measuredAt");
      return { value: entry.value, measuredAt };
    });
  }

  // meals: array of { mealType: String, description: String, loggedAt: Date }
  if (meals !== undefined && meals !== null) {
    if (!Array.isArray(meals)) {
      const error = new Error("meals must be an array");
      error.statusCode = 400;
      throw error;
    }
    fields.meals = meals.map((entry) => {
      if (typeof entry.mealType !== "string" || !entry.mealType.trim()) {
        const error = new Error("mealType must be a string");
        error.statusCode = 400;
        throw error;
      }
      if (typeof entry.description !== "string" || !entry.description.trim()) {
        const error = new Error("description must be a string");
        error.statusCode = 400;
        throw error;
      }
      const loggedAt = toValidatedDate(entry.loggedAt, "loggedAt");
      return {
        mealType: entry.mealType.trim(),
        description: entry.description.trim(),
        loggedAt,
      };
    });
  }

  // medicationAdherence: array of { medication: String, taken: Boolean, loggedAt: Date }
  if (medicationAdherence !== undefined && medicationAdherence !== null) {
    if (!Array.isArray(medicationAdherence)) {
      const error = new Error("medicationAdherence must be an array");
      error.statusCode = 400;
      throw error;
    }
    fields.medicationAdherence = medicationAdherence.map((entry) => {
      if (typeof entry.medication !== "string" || !entry.medication.trim()) {
        const error = new Error("medication must be a string");
        error.statusCode = 400;
        throw error;
      }
      if (typeof entry.taken !== "boolean") {
        const error = new Error("taken must be boolean");
        error.statusCode = 400;
        throw error;
      }
      const loggedAt = toValidatedDate(entry.loggedAt, "loggedAt");
      return {
        medication: entry.medication.trim(),
        taken: entry.taken,
        loggedAt,
      };
    });
  }

  // activity: { activityType: String, durationMinutes: Number, loggedAt: Date }
  if (activity !== undefined && activity !== null) {
    if (typeof activity !== "object" || Array.isArray(activity)) {
      const error = new Error("activity must be an object");
      error.statusCode = 400;
      throw error;
    }
    const cleanActivity = {};
    if (activity.activityType !== undefined && activity.activityType !== null) {
      if (typeof activity.activityType !== "string") {
        const error = new Error("activityType must be a string");
        error.statusCode = 400;
        throw error;
      }
      cleanActivity.activityType = activity.activityType.trim();
    }
    if (activity.durationMinutes !== undefined && activity.durationMinutes !== null) {
      if (typeof activity.durationMinutes !== "number" || Number.isNaN(activity.durationMinutes)) {
        const error = new Error("durationMinutes must be numeric");
        error.statusCode = 400;
        throw error;
      }
      if (activity.durationMinutes < 0) {
        const error = new Error("durationMinutes must not be negative");
        error.statusCode = 400;
        throw error;
      }
      cleanActivity.durationMinutes = activity.durationMinutes;
    }
    if (activity.loggedAt !== undefined && activity.loggedAt !== null) {
      cleanActivity.loggedAt = toValidatedDate(activity.loggedAt, "activity.loggedAt");
    }
    fields.activity = cleanActivity;
  }

  // sleep: { sleepTime: Date, wakeTime: Date, durationMinutes: Number }
  if (sleep !== undefined && sleep !== null) {
    if (typeof sleep !== "object" || Array.isArray(sleep)) {
      const error = new Error("sleep must be an object");
      error.statusCode = 400;
      throw error;
    }
    const cleanSleep = {};
    if (sleep.sleepTime !== undefined && sleep.sleepTime !== null) {
      cleanSleep.sleepTime = toValidatedDate(sleep.sleepTime, "sleepTime");
    }
    if (sleep.wakeTime !== undefined && sleep.wakeTime !== null) {
      cleanSleep.wakeTime = toValidatedDate(sleep.wakeTime, "wakeTime");
    }
    if (sleep.durationMinutes !== undefined && sleep.durationMinutes !== null) {
      if (typeof sleep.durationMinutes !== "number" || Number.isNaN(sleep.durationMinutes)) {
        const error = new Error("durationMinutes must be numeric");
        error.statusCode = 400;
        throw error;
      }
      if (sleep.durationMinutes < 0) {
        const error = new Error("durationMinutes must not be negative");
        error.statusCode = 400;
        throw error;
      }
      cleanSleep.durationMinutes = sleep.durationMinutes;
    }
    fields.sleep = cleanSleep;
  }

  // stress: Number
  if (stress !== undefined && stress !== null) {
    if (typeof stress !== "number" || Number.isNaN(stress)) {
      const error = new Error("stress must be numeric");
      error.statusCode = 400;
      throw error;
    }
    fields.stress = stress;
  }

  return fields;
};

const toSafeDailyLog = (doc) => ({
  id: doc._id,
  userId: doc.userId,
  date: doc.date,
  glucose: doc.glucose,
  meals: doc.meals,
  medicationAdherence: doc.medicationAdherence,
  activity: doc.activity,
  sleep: doc.sleep,
  stress: doc.stress,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

/**
 * Create a DailyLog for the authenticated user.
 * userId is always taken from the authenticated identity - never from the payload.
 */
export const createDailyLog = async (userId, payload = {}) => {
  const date = normalizeDate(payload.date);
  const allowedFields = buildAllowedFields(payload);

  try {
    const dailyLog = await DailyLog.create({
      userId,
      date,
      ...allowedFields,
    });
    return toSafeDailyLog(dailyLog);
  } catch (error) {
    if (error.code === 11000) {
      const dupError = new Error("A daily log already exists for this date");
      dupError.statusCode = 409;
      throw dupError;
    }
    throw error;
  }
};

/**
 * Get all DailyLogs belonging to the authenticated user, most recent first.
 */
export const getDailyLogs = async (userId) => {
  const dailyLogs = await DailyLog.find({ userId }).sort({ date: -1 });
  return dailyLogs.map(toSafeDailyLog);
};

/**
 * Get the authenticated user's DailyLog for a specific date.
 */
export const getDailyLogByDate = async (userId, dateParam) => {
  const date = normalizeDate(dateParam);

  const dailyLog = await DailyLog.findOne({ userId, date });

  if (!dailyLog) {
    const error = new Error("Daily log not found");
    error.statusCode = 404;
    throw error;
  }

  return toSafeDailyLog(dailyLog);
};

/**
 * Update the authenticated user's DailyLog for a specific date.
 */
export const updateDailyLogByDate = async (userId, dateParam, payload = {}) => {
  const date = normalizeDate(dateParam);
  const allowedFields = buildAllowedFields(payload);

  const dailyLog = await DailyLog.findOneAndUpdate(
    { userId, date },
    { $set: allowedFields },
    { new: true, runValidators: true }
  );

  if (!dailyLog) {
    const error = new Error("Daily log not found");
    error.statusCode = 404;
    throw error;
  }

  return toSafeDailyLog(dailyLog);
};

/**
 * Delete the authenticated user's DailyLog for a specific date.
 */
export const deleteDailyLogByDate = async (userId, dateParam) => {
  const date = normalizeDate(dateParam);

  const dailyLog = await DailyLog.findOneAndDelete({ userId, date });

  if (!dailyLog) {
    const error = new Error("Daily log not found");
    error.statusCode = 404;
    throw error;
  }

  return toSafeDailyLog(dailyLog);
};
