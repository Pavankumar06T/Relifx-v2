import express from "express";
import { requireUser } from "../middleware/requireUser.js";
import { upsertDailyLog, getDailyLog, listLogs, updateDailyLog, deleteDailyLog } from "../controllers/healthLogController.js";

const router = express.Router();

// NOTE: mount this router at "/api/health/extended-logs" in the shared
// app.js, NOT "/api/logs" (the old standalone path) and NOT
// "/api/health/daily-log" (that path belongs to Dhanajayan's DailyLog).
// See models/HealthLog.js for why this is a temporarily separate
// collection pending a schema-merge decision.
router.use(requireUser);

router.get("/", listLogs);
router.put("/daily", upsertDailyLog);
router.route("/daily/:date").get(getDailyLog).patch(updateDailyLog).delete(deleteDailyLog);

export default router;
