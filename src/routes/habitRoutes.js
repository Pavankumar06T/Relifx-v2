import express from "express";
import { requireUser } from "../middleware/requireUser.js";
import { createHabit, listHabits, getHabit, updateHabit, deleteHabit, checkIn } from "../controllers/habitController.js";

const router = express.Router();

// Mount at "/api/health/habits" in the shared app.js (renamed from the
// old standalone "/api/habits" to follow the "/api/health/..."
// convention). No conceptual conflict with Dhanajayan's backend -
// habit/streak tracking is a genuinely new entity.
router.use(requireUser);

router.route("/").post(createHabit).get(listHabits);
router.post("/:habitId/check-ins", checkIn);
router.route("/:habitId").get(getHabit).patch(updateHabit).delete(deleteHabit);

export default router;
