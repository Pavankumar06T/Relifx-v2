import mongoose from "mongoose";
import Medicine, { ALLOWED_FREQUENCIES, TIME_REGEX } from "../models/Medicine.js";

/**
 * Throw a consistent 400 error for a malformed ObjectId, rather than letting
 * Mongoose throw a raw CastError that could leak internal details.
 */
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
 * Validate and normalize the Medicine payload into an explicit,
 * allow-listed set of fields. Only fields defined on the Medicine model
 * are accepted - userId, createdAt, updatedAt, and anything else supplied
 * by the client is always dropped, regardless of isPartial.
 *
 * @param {Object} payload
 * @param {boolean} isPartial - true for update (PUT), false for create (POST)
 */
const buildAllowedFields = (payload = {}, isPartial = false) => {
  const { name, dosage, frequency, scheduleTimes, startDate, endDate, instructions, isActive } =
    payload;

  const fields = {};

  // name: required on create, optional on update
  if (!isPartial || name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      const error = new Error("name must be a valid non-empty string");
      error.statusCode = 400;
      throw error;
    }
    const trimmed = name.trim();
    if (trimmed.length > 100) {
      const error = new Error("name cannot exceed 100 characters");
      error.statusCode = 400;
      throw error;
    }
    fields.name = trimmed;
  }

  // dosage: required on create, optional on update
  if (!isPartial || dosage !== undefined) {
    if (typeof dosage !== "string" || !dosage.trim()) {
      const error = new Error("dosage must be a valid non-empty string");
      error.statusCode = 400;
      throw error;
    }
    const trimmed = dosage.trim();
    if (trimmed.length > 50) {
      const error = new Error("dosage cannot exceed 50 characters");
      error.statusCode = 400;
      throw error;
    }
    fields.dosage = trimmed;
  }

  // frequency: required on create, optional on update
  if (!isPartial || frequency !== undefined) {
    if (typeof frequency !== "string" || !ALLOWED_FREQUENCIES.includes(frequency)) {
      const error = new Error(`frequency must be one of: ${ALLOWED_FREQUENCIES.join(", ")}`);
      error.statusCode = 400;
      throw error;
    }
    fields.frequency = frequency;
  }

  // scheduleTimes: always optional, but must be well-formed if provided
  if (scheduleTimes !== undefined && scheduleTimes !== null) {
    if (!Array.isArray(scheduleTimes)) {
      const error = new Error("scheduleTimes must be an array of HH:mm strings");
      error.statusCode = 400;
      throw error;
    }
    const cleanTimes = scheduleTimes.map((t) => {
      if (typeof t !== "string" || !TIME_REGEX.test(t.trim())) {
        const error = new Error("Each scheduleTimes entry must be a valid HH:mm time string");
        error.statusCode = 400;
        throw error;
      }
      return t.trim();
    });
    fields.scheduleTimes = cleanTimes;
  }

  // startDate: required on create, optional on update
  if (!isPartial || startDate !== undefined) {
    fields.startDate = toValidatedDate(startDate, "startDate");
  }

  // endDate: always optional; explicit null clears it
  if (endDate !== undefined) {
    fields.endDate = endDate === null ? null : toValidatedDate(endDate, "endDate");
  }

  // Cross-field check: endDate must not precede startDate. This needs both
  // values, so on a partial update that only touches one of them we fall
  // back to the existing document's value (handled by the caller passing
  // `existing` through); here we only check when both are present.
  const effectiveStart = fields.startDate;
  const effectiveEnd = fields.endDate;
  if (effectiveStart && effectiveEnd && effectiveEnd < effectiveStart) {
    const error = new Error("endDate cannot be before startDate");
    error.statusCode = 400;
    throw error;
  }

  // instructions: always optional
  if (instructions !== undefined && instructions !== null) {
    if (typeof instructions !== "string") {
      const error = new Error("instructions must be a string");
      error.statusCode = 400;
      throw error;
    }
    if (instructions.length > 500) {
      const error = new Error("instructions cannot exceed 500 characters");
      error.statusCode = 400;
      throw error;
    }
    fields.instructions = instructions.trim();
  }

  // isActive: always optional
  if (isActive !== undefined && isActive !== null) {
    if (typeof isActive !== "boolean") {
      const error = new Error("isActive must be a boolean");
      error.statusCode = 400;
      throw error;
    }
    fields.isActive = isActive;
  }

  return fields;
};

const toSafeMedicine = (doc) => ({
  id: doc._id,
  userId: doc.userId,
  name: doc.name,
  dosage: doc.dosage,
  frequency: doc.frequency,
  scheduleTimes: doc.scheduleTimes,
  startDate: doc.startDate,
  endDate: doc.endDate,
  instructions: doc.instructions,
  isActive: doc.isActive,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

/**
 * Find a Medicine document owned by userId, or throw 404. Also validates
 * the id format up front (400), so callers never leak a raw CastError.
 */
export const findOwnedMedicineOrThrow = async (userId, medicineId) => {
  validateObjectId(medicineId, "medicineId");

  const medicine = await Medicine.findOne({ _id: medicineId, userId });

  if (!medicine) {
    const error = new Error("Medicine not found");
    error.statusCode = 404;
    throw error;
  }

  return medicine;
};

/**
 * Create a Medicine for the authenticated user. userId always comes from
 * the authenticated identity - never from the payload.
 */
export const createMedicine = async (userId, payload = {}) => {
  const allowedFields = buildAllowedFields(payload, false);

  const medicine = await Medicine.create({
    userId,
    ...allowedFields,
  });

  return toSafeMedicine(medicine);
};

/**
 * List all medicines belonging to the authenticated user, most recently
 * created first.
 */
export const getMedicines = async (userId) => {
  const medicines = await Medicine.find({ userId }).sort({ createdAt: -1 });
  return medicines.map(toSafeMedicine);
};

/**
 * Get a single medicine belonging to the authenticated user.
 */
export const getMedicineById = async (userId, medicineId) => {
  const medicine = await findOwnedMedicineOrThrow(userId, medicineId);
  return toSafeMedicine(medicine);
};

/**
 * Update a medicine belonging to the authenticated user, using an explicit
 * allow-list. userId/createdAt/updatedAt can never be modified by the
 * client, and endDate-vs-startDate is re-checked against the existing
 * document when only one of the two is supplied in the update.
 */
export const updateMedicine = async (userId, medicineId, payload = {}) => {
  const medicine = await findOwnedMedicineOrThrow(userId, medicineId);
  const allowedFields = buildAllowedFields(payload, true);

  const effectiveStart = allowedFields.startDate || medicine.startDate;
  const effectiveEnd =
    allowedFields.endDate !== undefined ? allowedFields.endDate : medicine.endDate;

  if (effectiveStart && effectiveEnd && effectiveEnd < effectiveStart) {
    const error = new Error("endDate cannot be before startDate");
    error.statusCode = 400;
    throw error;
  }

  Object.assign(medicine, allowedFields);
  await medicine.save();

  return toSafeMedicine(medicine);
};

/**
 * Delete a medicine belonging to the authenticated user.
 */
export const deleteMedicine = async (userId, medicineId) => {
  const medicine = await findOwnedMedicineOrThrow(userId, medicineId);
  await medicine.deleteOne();
  return toSafeMedicine(medicine);
};

export { toSafeMedicine, validateObjectId };
