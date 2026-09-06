const router = require("express").Router();
const { requireUser } = require("../middleware/requireUser");
const { aggregateHealthRecords } = require("../controllers/healthRecordController");

router.get("/", requireUser, aggregateHealthRecords);
module.exports = router;
