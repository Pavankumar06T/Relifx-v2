import express from "express";
import { requireUser } from "../middleware/requireUser.js";
import { aggregateHealthRecords } from "../controllers/healthRecordController.js";

const router = express.Router();

// Mount at "/api/health/records" in the shared app.js (renamed from the
// old standalone "/api/health-records" to follow the "/api/health/..."
// convention consistently).
router.get("/", requireUser, aggregateHealthRecords);

export default router;
