const router = require("express").Router();
const { requireUser } = require("../middleware/requireUser");
const controller = require("../controllers/habitController");

router.use(requireUser);
router.route("/").post(controller.createHabit).get(controller.listHabits);
router.post("/:habitId/check-ins", controller.checkIn);
router.route("/:habitId").get(controller.getHabit).patch(controller.updateHabit).delete(controller.deleteHabit);

module.exports = router;
