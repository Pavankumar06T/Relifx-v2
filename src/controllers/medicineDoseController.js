import {
  createDose,
  getDosesForMedicine,
  getAllDoses,
  updateDose,
  deleteDose,
  getMedicineAdherence,
  getUpcomingReminders,
} from "../services/medicineDoseService.js";

/**
 * Controller to create a dose log entry for a medicine.
 * POST /api/medicine/:medicineId/doses
 */
export const createDoseEntry = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { medicineId } = req.params;
    const payload = req.body || {};

    const newDose = await createDose(userId, medicineId, payload);

    res.status(201).json({
      success: true,
      message: "Dose logged successfully",
      data: newDose,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to list dose history for a specific medicine.
 * GET /api/medicine/:medicineId/doses
 */
export const listDosesForMedicine = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { medicineId } = req.params;

    const doses = await getDosesForMedicine(userId, medicineId);

    res.status(200).json({
      success: true,
      message: "Doses retrieved successfully",
      data: doses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to list all dose history for the authenticated user.
 * GET /api/medicine/doses
 */
export const listAllDoses = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { from, to } = req.query;

    const doses = await getAllDoses(userId, { from, to });

    res.status(200).json({
      success: true,
      message: "Doses retrieved successfully",
      data: doses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to update a dose log entry.
 * PUT /api/medicine/:medicineId/doses/:doseId
 */
export const updateDoseEntry = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { medicineId, doseId } = req.params;
    const payload = req.body || {};

    const updatedDose = await updateDose(userId, medicineId, doseId, payload);

    res.status(200).json({
      success: true,
      message: "Dose updated successfully",
      data: updatedDose,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to delete a dose log entry.
 * DELETE /api/medicine/:medicineId/doses/:doseId
 */
export const deleteDoseEntry = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { medicineId, doseId } = req.params;

    const deletedDose = await deleteDose(userId, medicineId, doseId);

    res.status(200).json({
      success: true,
      message: "Dose deleted successfully",
      data: deletedDose,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to calculate adherence for a specific medicine.
 * GET /api/medicine/:medicineId/adherence
 */
export const getAdherence = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { medicineId } = req.params;
    const { from, to } = req.query;

    const adherence = await getMedicineAdherence(userId, medicineId, { from, to });

    res.status(200).json({
      success: true,
      message: "Medicine adherence calculated successfully",
      data: adherence,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch upcoming scheduled doses for reminder purposes.
 * GET /api/medicine/reminders/upcoming?hours=24
 */
export const getReminders = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { hours } = req.query;

    const reminders = await getUpcomingReminders(userId, hours);

    res.status(200).json({
      success: true,
      message: "Upcoming reminders retrieved successfully",
      data: reminders,
    });
  } catch (error) {
    next(error);
  }
};
