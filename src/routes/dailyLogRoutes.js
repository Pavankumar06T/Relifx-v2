import express from "express";
import {
  createLog,
  listLogs,
  getLogByDate,
  updateLogByDate,
  deleteLogByDate,
} from "../controllers/dailyLogController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// All Daily Health Tracking routes require authentication
router.use(authMiddleware);

// POST /api/health/daily-log
router.post("/daily-log", createLog);

// GET /api/health/daily-log
router.get("/daily-log", listLogs);

// GET /api/health/daily-log/:date
router.get("/daily-log/:date", getLogByDate);

// PUT /api/health/daily-log/:date
router.put("/daily-log/:date", updateLogByDate);

// DELETE /api/health/daily-log/:date
router.delete("/daily-log/:date", deleteLogByDate);

export default router;
