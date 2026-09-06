import express from "express";
import {
  createMedicineEntry,
  listMedicines,
  getMedicine,
  updateMedicineEntry,
  deleteMedicineEntry,
} from "../controllers/medicineController.js";
import { getReminders } from "../controllers/medicineDoseController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// All Medicine Intake Tracker routes require authentication
router.use(authMiddleware);

// GET /api/medicine/reminders/upcoming?hours=24
// Registered before "/:medicineId" so "reminders" is never captured as a
// medicineId param.
router.get("/reminders/upcoming", getReminders);

// POST /api/medicine
router.post("/", createMedicineEntry);

// GET /api/medicine
router.get("/", listMedicines);

// GET /api/medicine/:medicineId
router.get("/:medicineId", getMedicine);

// PUT /api/medicine/:medicineId
router.put("/:medicineId", updateMedicineEntry);

// DELETE /api/medicine/:medicineId
router.delete("/:medicineId", deleteMedicineEntry);

export default router;
