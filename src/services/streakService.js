const cron = require("node-cron");
const Habit = require("../models/Habit");
const { getRedisClient } = require("../config/redis");
const { addDays, dateKey, isSameDay, startOfDay } = require("./dateService");

const cacheKey = (habitId) => `relifex:habit:${habitId}:streak`;

function includedDates(habit) {
    return new Set([
        ...habit.checkIns.map((entry) => dateKey(entry.date)),
        ...habit.freezeDays.map((entry) => dateKey(entry.date))
    ]);
}

function calculateStreak(habit, endingOn = habit.lastCompletedDate || new Date()) {
    const included = includedDates(habit);
    let cursor = startOfDay(endingOn);
    let count = 0;
    while (included.has(dateKey(cursor))) {
        count += 1;
        cursor = addDays(cursor, -1);
    }
    return count;
}

function summary(habit) {
    return {
        habitId: String(habit._id),
        targetDays: habit.targetDays,
        currentStreak: habit.currentStreak,
        longestStreak: habit.longestStreak,
        freezeCredits: habit.freezeCredits,
        completed: habit.currentStreak >= habit.targetDays,
        lastCompletedDate: habit.lastCompletedDate
    };
}

async function cacheSummary(habit) {
    const client = getRedisClient();
    if (client) await client.set(cacheKey(habit._id), JSON.stringify(summary(habit)), { EX: 172800 });
}

async function clearCachedSummary(habitId) {
    const client = getRedisClient();
    if (client) await client.del(cacheKey(habitId));
}

async function getStreakSummary(habit) {
    const client = getRedisClient();
    if (client) {
        const cached = await client.get(cacheKey(habit._id));
        if (cached) return JSON.parse(cached);
    }
    const result = summary(habit);
    await cacheSummary(habit);
    return result;
}

/**
 * A freeze preserves an unbroken streak for a missed calendar day. The service
 * automatically consumes credits only when every gap since the last completion
 * can be covered. This avoids silently wasting a credit on a broken streak.
 */
function coverGapWithFreezes(habit, completedOn) {
    if (!habit.lastCompletedDate) return [];
    const gap = [];
    for (let day = addDays(habit.lastCompletedDate, 1); day < completedOn; day = addDays(day, 1)) {
        if (!habit.freezeDays.some((entry) => isSameDay(entry.date, day))) gap.push(day);
    }
    if (gap.length && gap.length <= habit.freezeCredits) {
        for (const day of gap) habit.freezeDays.push({ date: day, reason: "Automatic streak grace" });
        habit.freezeCredits -= gap.length;
        return gap;
    }
    return [];
}

async function checkInHabit(habit, completedOn, note) {
    const date = startOfDay(completedOn);
    if (date > startOfDay(new Date())) throw Object.assign(new Error("A habit cannot be checked in for a future date"), { statusCode: 400 });
    if (habit.checkIns.some((entry) => isSameDay(entry.date, date))) {
        return { habit, created: false, freezesUsed: [] };
    }

    const isBackfill = habit.lastCompletedDate && date < startOfDay(habit.lastCompletedDate);
    const freezesUsed = isBackfill ? [] : coverGapWithFreezes(habit, date);
    habit.checkIns.push({ date, note, source: "manual" });
    if (!habit.lastCompletedDate || date > startOfDay(habit.lastCompletedDate)) habit.lastCompletedDate = date;
    habit.currentStreak = calculateStreak(habit, habit.lastCompletedDate);
    habit.longestStreak = Math.max(habit.longestStreak, habit.currentStreak);
    await habit.save();
    await cacheSummary(habit);
    return { habit, created: true, freezesUsed };
}

async function applyDailyGracePeriod() {
    const yesterday = addDays(new Date(), -1);
    const habits = await Habit.find({ active: true, lastCompletedDate: { $exists: true } });
    for (const habit of habits) {
        if (habit.checkIns.some((entry) => isSameDay(entry.date, yesterday)) || habit.freezeDays.some((entry) => isSameDay(entry.date, yesterday))) continue;
        if (habit.freezeCredits > 0 && isSameDay(habit.lastCompletedDate, addDays(yesterday, -1))) {
            habit.freezeDays.push({ date: yesterday, reason: "Scheduled daily grace" });
            habit.freezeCredits -= 1;
            habit.lastCompletedDate = yesterday;
            habit.currentStreak = calculateStreak(habit, yesterday);
            habit.longestStreak = Math.max(habit.longestStreak, habit.currentStreak);
            await habit.save();
            await cacheSummary(habit);
        }
    }
}

function scheduleDailyStreakMaintenance() {
    if (process.env.DISABLE_STREAK_CRON === "true") return;
    cron.schedule("10 0 * * *", () => {
        applyDailyGracePeriod().catch((error) => console.error("Daily streak maintenance failed", error));
    }, { timezone: process.env.STREAK_TIMEZONE || "Asia/Kolkata" });
}

module.exports = {
    calculateStreak,
    checkInHabit,
    getStreakSummary,
    clearCachedSummary,
    applyDailyGracePeriod,
    scheduleDailyStreakMaintenance
};
