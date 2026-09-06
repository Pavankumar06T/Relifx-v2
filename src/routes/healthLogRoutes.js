const router = require("express").Router();
const { requireUser } = require("../middleware/requireUser");
const { upsertDailyLog, getDailyLog, listLogs, updateDailyLog, deleteDailyLog } = require("../controllers/healthLogController");

router.use(requireUser);
router.get("/", listLogs);
router.put("/daily", upsertDailyLog);
router.route("/daily/:date").get(getDailyLog).patch(updateDailyLog).delete(deleteDailyLog);

module.exports = router;
