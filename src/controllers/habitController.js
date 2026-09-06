const Habit = require("../models/Habit");
const { clearCachedSummary, checkInHabit, getStreakSummary } = require("../services/streakService");

const editableFields = ["name", "description", "category", "targetDays", "active", "timezone"];
const pickEditableFields = (body) => Object.fromEntries(editableFields
    .filter((key) => body[key] !== undefined)
    .map((key) => [key, body[key]]));

async function createHabit(req, res, next) {
    try {
        const habit = await Habit.create({ ...pickEditableFields(req.body), userId: req.userId });
        res.status(201).json({ success: true, data: habit, streak: await getStreakSummary(habit) });
    } catch (error) { next(error); }
}

async function listHabits(req, res, next) {
    try {
        const filter = { userId: req.userId };
        if (req.query.active !== undefined) filter.active = req.query.active === "true";
        const habits = await Habit.find(filter).sort({ createdAt: -1 });
        const data = await Promise.all(habits.map(async (habit) => ({ habit, streak: await getStreakSummary(habit) })));
        res.json({ success: true, data });
    } catch (error) { next(error); }
}

async function getHabit(req, res, next) {
    try {
        const habit = await Habit.findOne({ _id: req.params.habitId, userId: req.userId });
        if (!habit) return res.status(404).json({ success: false, message: "Habit not found" });
        res.json({ success: true, data: habit, streak: await getStreakSummary(habit) });
    } catch (error) { next(error); }
}

async function updateHabit(req, res, next) {
    try {
        const update = pickEditableFields(req.body);
        const habit = await Habit.findOneAndUpdate({ _id: req.params.habitId, userId: req.userId }, { $set: update }, { new: true, runValidators: true });
        if (!habit) return res.status(404).json({ success: false, message: "Habit not found" });
        await clearCachedSummary(habit._id);
        res.json({ success: true, data: habit, streak: await getStreakSummary(habit) });
    } catch (error) { next(error); }
}

async function deleteHabit(req, res, next) {
    try {
        const habit = await Habit.findOneAndDelete({ _id: req.params.habitId, userId: req.userId });
        if (!habit) return res.status(404).json({ success: false, message: "Habit not found" });
        await clearCachedSummary(habit._id);
        res.status(204).send();
    } catch (error) { next(error); }
}

async function checkIn(req, res, next) {
    try {
        const habit = await Habit.findOne({ _id: req.params.habitId, userId: req.userId, active: true });
        if (!habit) return res.status(404).json({ success: false, message: "Active habit not found" });
        const result = await checkInHabit(habit, req.body.date || new Date(), req.body.note);
        res.status(result.created ? 201 : 200).json({
            success: true,
            idempotent: !result.created,
            freezesUsed: result.freezesUsed.map((date) => date.toISOString().slice(0, 10)),
            data: result.habit,
            streak: await getStreakSummary(result.habit)
        });
    } catch (error) { next(error); }
}

module.exports = { createHabit, listHabits, getHabit, updateHabit, deleteHabit, checkIn };
