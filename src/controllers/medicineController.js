import {
  createMedicine,
  getMedicines,
  getMedicineById,
  updateMedicine,
  deleteMedicine,
} from "../services/medicineService.js";

/**
 * Controller to create a Medicine for the authenticated user.
 * POST /api/medicine
 */
export const createMedicineEntry = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const payload = req.body || {};

    const newMedicine = await createMedicine(userId, payload);

    res.status(201).json({
      success: true,
      message: "Medicine created successfully",
      data: newMedicine,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to list all medicines belonging to the authenticated user.
 * GET /api/medicine
 */
export const listMedicines = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const medicines = await getMedicines(userId);

    res.status(200).json({
      success: true,
      message: "Medicines retrieved successfully",
      data: medicines,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch a single medicine belonging to the authenticated user.
 * GET /api/medicine/:medicineId
 */
export const getMedicine = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { medicineId } = req.params;

    const medicine = await getMedicineById(userId, medicineId);

    res.status(200).json({
      success: true,
      message: "Medicine retrieved successfully",
      data: medicine,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to update a medicine belonging to the authenticated user.
 * PUT /api/medicine/:medicineId
 */
export const updateMedicineEntry = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { medicineId } = req.params;
    const payload = req.body || {};

    const updatedMedicine = await updateMedicine(userId, medicineId, payload);

    res.status(200).json({
      success: true,
      message: "Medicine updated successfully",
      data: updatedMedicine,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to delete a medicine belonging to the authenticated user.
 * DELETE /api/medicine/:medicineId
 */
export const deleteMedicineEntry = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { medicineId } = req.params;

    const deletedMedicine = await deleteMedicine(userId, medicineId);

    res.status(200).json({
      success: true,
      message: "Medicine deleted successfully",
      data: deletedMedicine,
    });
  } catch (error) {
    next(error);
  }
};
