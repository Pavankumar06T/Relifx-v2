const router = require("express").Router();
const { requireUser } = require("../middleware/requireUser");
const controller = require("../controllers/workoutController");

router.use(requireUser);
router.get("/summary", controller.getWorkoutSummary);
router.route("/").post(controller.createWorkout).get(controller.listWorkouts);
router.route("/:workoutId").get(controller.getWorkout).patch(controller.updateWorkout).delete(controller.deleteWorkout);

module.exports = router;
