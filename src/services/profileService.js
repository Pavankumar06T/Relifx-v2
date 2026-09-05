import User from "../models/User.js";

/**
 * Service to update onboarding baseline profile for authenticated user
 * @param {string} userId - Authenticated user ID from JWT
 * @param {Object} onboardingData - User provided onboarding baseline fields
 * @returns {Object} Safe updated user profile data
 */
export const updateOnboardingProfile = async (userId, onboardingData = {}) => {
  const {
    diabetesType,
    medications,
    lastHbA1c,
    sleepSchedule,
    dietPattern,
    primaryGoal,
  } = onboardingData;

  const updateFields = {};

  // 1. Validate & process diabetesType
  if (diabetesType !== undefined && diabetesType !== null) {
    if (typeof diabetesType !== "string" || !diabetesType.trim()) {
      const error = new Error("diabetesType must be a valid non-empty string");
      error.statusCode = 400;
      throw error;
    }
    updateFields.diabetesType = diabetesType.trim();
  }

  // 2. Validate & process medications
  if (medications !== undefined && medications !== null) {
    if (!Array.isArray(medications)) {
      const error = new Error("medications must be an array of strings");
      error.statusCode = 400;
      throw error;
    }
    const cleanMedications = medications.map((med) => {
      if (typeof med !== "string") {
        const error = new Error("Each medication must be a string");
        error.statusCode = 400;
        throw error;
      }
      return med.trim();
    });
    updateFields.medications = cleanMedications;
  }

  // 3. Validate & process lastHbA1c
  if (lastHbA1c !== undefined && lastHbA1c !== null) {
    if (typeof lastHbA1c !== "number" || Number.isNaN(lastHbA1c)) {
      const error = new Error("lastHbA1c must be a valid number");
      error.statusCode = 400;
      throw error;
    }
    updateFields.lastHbA1c = lastHbA1c;
  }

  // 4. Validate & process sleepSchedule
  if (sleepSchedule !== undefined && sleepSchedule !== null) {
    if (typeof sleepSchedule !== "object" || Array.isArray(sleepSchedule)) {
      const error = new Error("sleepSchedule must be an object");
      error.statusCode = 400;
      throw error;
    }

    const { sleepTime, wakeTime } = sleepSchedule;
    const cleanSleepSchedule = {};

    if (sleepTime !== undefined && sleepTime !== null) {
      if (typeof sleepTime !== "string") {
        const error = new Error("sleepTime must be a string");
        error.statusCode = 400;
        throw error;
      }
      cleanSleepSchedule.sleepTime = sleepTime.trim();
    }

    if (wakeTime !== undefined && wakeTime !== null) {
      if (typeof wakeTime !== "string") {
        const error = new Error("wakeTime must be a string");
        error.statusCode = 400;
        throw error;
      }
      cleanSleepSchedule.wakeTime = wakeTime.trim();
    }

    updateFields.sleepSchedule = cleanSleepSchedule;
  }

  // 5. Validate & process dietPattern
  if (dietPattern !== undefined && dietPattern !== null) {
    if (typeof dietPattern !== "string" || !dietPattern.trim()) {
      const error = new Error("dietPattern must be a valid non-empty string");
      error.statusCode = 400;
      throw error;
    }
    updateFields.dietPattern = dietPattern.trim();
  }

  // 6. Validate & process primaryGoal
  if (primaryGoal !== undefined && primaryGoal !== null) {
    if (typeof primaryGoal !== "string" || !primaryGoal.trim()) {
      const error = new Error("primaryGoal must be a valid non-empty string");
      error.statusCode = 400;
      throw error;
    }
    updateFields.primaryGoal = primaryGoal.trim();
  }

  // 7. Find and Update User document using explicit whitelist
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updateFields },
    { new: true, runValidators: true }
  ).select("-password");

  if (!updatedUser) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    diabetesType: updatedUser.diabetesType,
    medications: updatedUser.medications,
    lastHbA1c: updatedUser.lastHbA1c,
    sleepSchedule: updatedUser.sleepSchedule,
    dietPattern: updatedUser.dietPattern,
    primaryGoal: updatedUser.primaryGoal,
    createdAt: updatedUser.createdAt,
    updatedAt: updatedUser.updatedAt,
  };
};
