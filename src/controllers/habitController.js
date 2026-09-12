import Habit from "../models/Habit.js";
import { clearCachedSummary, checkInHabit, getStreakSummary } from "../services/streakService.js";

const EDITABLE_FIELDS = ["name", "description", "category", "targetDays", "active", "timezone"];
const pickEditableFields = (body = {}) =>
  Object.fromEntries(EDITABLE_FIELDS.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));

/**
 * POST /api/health/habits
 * Ownership always comes from req.userId - never from the request body.
 */
export const createHabit = async (req, res, next) => {
  try {
    const habit = await Habit.create({ ...pickEditableFields(req.body), userId: req.userId });

    res.status(201).json({
      success: true,
      message: "Habit created successfully",
      data: habit,
      streak: await getStreakSummary(habit),
    });
  } catch (error) {
    next(error);
  }
};

export const listHabits = async (req, res, next) => {
  try {
    const filter = { userId: req.userId };
    if (req.query.active !== undefined) filter.active = req.query.active === "true";

    const habits = await Habit.find(filter).sort({ createdAt: -1 });
    const data = await Promise.all(habits.map(async (habit) => ({ habit, streak: await getStreakSummary(habit) })));

    res.status(200).json({
      success: true,
      message: "Habits retrieved successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getHabit = async (req, res, next) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.habitId, userId: req.userId });

    if (!habit) {
      return res.status(404).json({ success: false, message: "Habit not found" });
    }

    res.status(200).json({
      success: true,
      message: "Habit retrieved successfully",
      data: habit,
      streak: await getStreakSummary(habit),
    });
  } catch (error) {
    next(error);
  }
};

export const updateHabit = async (req, res, next) => {
  try {
    const update = pickEditableFields(req.body);
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.habitId, userId: req.userId },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!habit) {
      return res.status(404).json({ success: false, message: "Habit not found" });
    }

    await clearCachedSummary(habit._id);

    res.status(200).json({
      success: true,
      message: "Habit updated successfully",
      data: habit,
      streak: await getStreakSummary(habit),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteHabit = async (req, res, next) => {
  try {
    const habit = await Habit.findOneAndDelete({ _id: req.params.habitId, userId: req.userId });

    if (!habit) {
      return res.status(404).json({ success: false, message: "Habit not found" });
    }

    await clearCachedSummary(habit._id);

    // Changed from 204 No Content to 200 + envelope to match Dhanajayan's
    // { success, message, data } response contract used everywhere else.
    res.status(200).json({
      success: true,
      message: "Habit deleted successfully",
      data: habit,
    });
  } catch (error) {
    next(error);
  }
};

export const checkIn = async (req, res, next) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.habitId, userId: req.userId, active: true });

    if (!habit) {
      return res.status(404).json({ success: false, message: "Active habit not found" });
    }

    const result = await checkInHabit(habit, req.body.date || new Date(), req.body.note);

    res.status(result.created ? 201 : 200).json({
      success: true,
      message: result.created ? "Check-in recorded successfully" : "Check-in already recorded for this date",
      idempotent: !result.created,
      freezesUsed: result.freezesUsed.map((date) => date.toISOString().slice(0, 10)),
      data: result.habit,
      streak: await getStreakSummary(result.habit),
    });
  } catch (error) {
    next(error);
  }
};
