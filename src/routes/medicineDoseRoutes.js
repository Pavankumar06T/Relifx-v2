import express from "express";
import {
  createDoseEntry,
  listDosesForMedicine,
  listAllDoses,
  updateDoseEntry,
  deleteDoseEntry,
  getAdherence,
} from "../controllers/medicineDoseController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// All Medicine Dose routes require authentication
router.use(authMiddleware);

// GET /api/medicine/doses
// Registered before this router's "/:medicineId/..." style routes are
// reached and, critically, mounted in app.js BEFORE medicineRoutes.js so
// "doses" is never captured as a medicineId param by "/:medicineId".
router.get("/doses", listAllDoses);

// POST /api/medicine/:medicineId/doses
router.post("/:medicineId/doses", createDoseEntry);

// GET /api/medicine/:medicineId/doses
router.get("/:medicineId/doses", listDosesForMedicine);

// PUT /api/medicine/:medicineId/doses/:doseId
router.put("/:medicineId/doses/:doseId", updateDoseEntry);

// DELETE /api/medicine/:medicineId/doses/:doseId
router.delete("/:medicineId/doses/:doseId", deleteDoseEntry);

// GET /api/medicine/:medicineId/adherence
router.get("/:medicineId/adherence", getAdherence);

export default router;
