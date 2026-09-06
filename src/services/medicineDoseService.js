import mongoose from "mongoose";
import MedicineDose, { ALLOWED_STATUSES } from "../models/MedicineDose.js";
import Medicine from "../models/Medicine.js";
import { findOwnedMedicineOrThrow } from "./medicineService.js";

const validateObjectId = (id, fieldName = "id") => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error(`Invalid ${fieldName}`);
    error.statusCode = 400;
    throw error;
  }
};

const toValidatedDate = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
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
 * Parse a YYYY-MM-DD (or full ISO) query-param date into a Date, throwing
 * a 400 on anything malformed. Used for optional from/to filtering.
 */
const toValidatedQueryDate = (value, fieldName) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} must be a valid date`);
    error.statusCode = 400;
    throw error;
  }
  return date;
};

/**
 * Validate and normalize a dose payload into an explicit, allow-listed set
 * of fields. Only fields defined on MedicineDose are accepted.
 *
 * @param {Object} payload
 * @param {boolean} isPartial - true for update (PUT), false for create (POST)
 */
const buildDoseFields = (payload = {}, isPartial = false) => {
  const { scheduledAt, takenAt, status, notes } = payload;

  const fields = {};

  // scheduledAt: required on create, optional on update
  if (!isPartial || scheduledAt !== undefined) {
    fields.scheduledAt = toValidatedDate(scheduledAt, "scheduledAt");
  }

  // takenAt: always optional; explicit null clears it
  if (takenAt !== undefined) {
    fields.takenAt = takenAt === null ? null : toValidatedDate(takenAt, "takenAt");
  }

  // status: required on create, optional on update
  if (!isPartial || status !== undefined) {
    if (typeof status !== "string" || !ALLOWED_STATUSES.includes(status)) {
      const error = new Error(`status must be one of: ${ALLOWED_STATUSES.join(", ")}`);
      error.statusCode = 400;
      throw error;
    }
    fields.status = status;
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

  return fields;
};

const toSafeDose = (doc) => ({
  id: doc._id,
  userId: doc.userId,
  medicineId: doc.medicineId,
  scheduledAt: doc.scheduledAt,
  takenAt: doc.takenAt,
  status: doc.status,
  notes: doc.notes,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

/**
 * Find a dose owned by userId AND belonging to a medicine owned by userId,
 * or throw 404. Confirms medicine ownership first so a dose can never be
 * reached through a medicineId the caller doesn't own.
 */
const findOwnedDoseOrThrow = async (userId, medicineId, doseId) => {
  validateObjectId(doseId, "doseId");

  // Confirms medicineId belongs to this user (throws 404 otherwise).
  await findOwnedMedicineOrThrow(userId, medicineId);

  const dose = await MedicineDose.findOne({ _id: doseId, userId, medicineId });

  if (!dose) {
    const error = new Error("Dose not found");
    error.statusCode = 404;
    throw error;
  }

  return dose;
};

/**
 * Create a dose log entry for a medicine owned by the authenticated user.
 */
export const createDose = async (userId, medicineId, payload = {}) => {
  const medicine = await findOwnedMedicineOrThrow(userId, medicineId);
  const doseFields = buildDoseFields(payload, false);

  const dose = await MedicineDose.create({
    userId,
    medicineId: medicine._id,
    ...doseFields,
  });

  return toSafeDose(dose);
};

/**
 * Get dose history for a specific medicine owned by the authenticated user,
 * most recent first.
 */
export const getDosesForMedicine = async (userId, medicineId) => {
  await findOwnedMedicineOrThrow(userId, medicineId);

  const doses = await MedicineDose.find({ userId, medicineId }).sort({ scheduledAt: -1 });
  return doses.map(toSafeDose);
};

/**
 * Get all dose history for the authenticated user across all medicines,
 * with optional inclusive from/to date filtering on scheduledAt.
 */
export const getAllDoses = async (userId, { from, to } = {}) => {
  const query = { userId };
  const scheduledAtFilter = {};

  if (from !== undefined && from !== null && from !== "") {
    scheduledAtFilter.$gte = toValidatedQueryDate(from, "from");
  }
  if (to !== undefined && to !== null && to !== "") {
    scheduledAtFilter.$lte = toValidatedQueryDate(to, "to");
  }
  if (Object.keys(scheduledAtFilter).length > 0) {
    query.scheduledAt = scheduledAtFilter;
  }

  const doses = await MedicineDose.find(query).sort({ scheduledAt: -1 });
  return doses.map(toSafeDose);
};

/**
 * Update a dose log entry, verifying ownership of both the dose and its
 * parent medicine.
 */
export const updateDose = async (userId, medicineId, doseId, payload = {}) => {
  const dose = await findOwnedDoseOrThrow(userId, medicineId, doseId);
  const doseFields = buildDoseFields(payload, true);

  Object.assign(dose, doseFields);
  await dose.save();

  return toSafeDose(dose);
};

/**
 * Delete a dose log entry, verifying ownership of both the dose and its
 * parent medicine.
 */
export const deleteDose = async (userId, medicineId, doseId) => {
  const dose = await findOwnedDoseOrThrow(userId, medicineId, doseId);
  await dose.deleteOne();
  return toSafeDose(dose);
};

/**
 * Calculate a simple, explainable adherence summary for a medicine based
 * on its logged doses (not a scheduling projection). No AI/inference -
 * just counts and a percentage.
 */
export const getMedicineAdherence = async (userId, medicineId, { from, to } = {}) => {
  const medicine = await findOwnedMedicineOrThrow(userId, medicineId);

  const query = { userId, medicineId: medicine._id };
  const scheduledAtFilter = {};

  if (from !== undefined && from !== null && from !== "") {
    scheduledAtFilter.$gte = toValidatedQueryDate(from, "from");
  }
  if (to !== undefined && to !== null && to !== "") {
    scheduledAtFilter.$lte = toValidatedQueryDate(to, "to");
  }
  if (Object.keys(scheduledAtFilter).length > 0) {
    query.scheduledAt = scheduledAtFilter;
  }

  const doses = await MedicineDose.find(query);

  let takenDoses = 0;
  let missedDoses = 0;
  let skippedDoses = 0;

  for (const dose of doses) {
    if (dose.status === "taken") takenDoses += 1;
    else if (dose.status === "missed") missedDoses += 1;
    else if (dose.status === "skipped") skippedDoses += 1;
  }

  const totalDoses = doses.length;
  const adherencePercentage =
    totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 10000) / 100 : 0;

  return {
    medicineId: medicine._id,
    medicineName: medicine.name,
    totalDoses,
    takenDoses,
    missedDoses,
    skippedDoses,
    adherencePercentage,
  };
};

/**
 * Build upcoming scheduled-dose reminders for the authenticated user over
 * the next `hours` (default 24), based on each active medicine's
 * scheduleTimes/startDate/endDate. This is a projection of when doses
 * *should* occur, not a read of logged doses - it's the backend surface
 * a future reminder/notification service can poll.
 *
 * Schedule times are treated as UTC HH:mm for now (no per-user timezone
 * is currently tracked anywhere in the project).
 */
export const getUpcomingReminders = async (userId, hoursParam) => {
  let hours = hoursParam !== undefined && hoursParam !== null && hoursParam !== "" ? Number(hoursParam) : 24;

  if (Number.isNaN(hours) || hours <= 0) {
    const error = new Error("hours must be a positive number");
    error.statusCode = 400;
    throw error;
  }

  // Cap the window to avoid unbounded iteration from a huge query param.
  const MAX_HOURS = 24 * 14; // 14 days
  if (hours > MAX_HOURS) {
    hours = MAX_HOURS;
  }

  const windowStart = new Date();
  const windowEnd = new Date(windowStart.getTime() + hours * 60 * 60 * 1000);

  const medicines = await Medicine.find({
    userId,
    isActive: true,
    startDate: { $lte: windowEnd },
    $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: windowStart } }],
  });

  const reminders = [];

  for (const medicine of medicines) {
    if (!medicine.scheduleTimes || medicine.scheduleTimes.length === 0) continue;

    // Walk each UTC calendar day that overlaps the window.
    const dayCursor = new Date(
      Date.UTC(windowStart.getUTCFullYear(), windowStart.getUTCMonth(), windowStart.getUTCDate())
    );
    const lastDay = new Date(
      Date.UTC(windowEnd.getUTCFullYear(), windowEnd.getUTCMonth(), windowEnd.getUTCDate())
    );

    while (dayCursor <= lastDay) {
      for (const timeStr of medicine.scheduleTimes) {
        const [hh, mm] = timeStr.split(":").map(Number);
        const candidate = new Date(dayCursor);
        candidate.setUTCHours(hh, mm, 0, 0);

        const withinWindow = candidate >= windowStart && candidate <= windowEnd;
        const withinMedicineRange =
          candidate >= medicine.startDate && (!medicine.endDate || candidate <= medicine.endDate);

        if (withinWindow && withinMedicineRange) {
          reminders.push({
            medicineId: medicine._id,
            medicineName: medicine.name,
            dosage: medicine.dosage,
            scheduledAt: candidate,
            instructions: medicine.instructions,
          });
        }
      }
      dayCursor.setUTCDate(dayCursor.getUTCDate() + 1);
    }
  }

  reminders.sort((a, b) => a.scheduledAt - b.scheduledAt);

  return reminders;
};

export { toSafeDose, validateObjectId };
