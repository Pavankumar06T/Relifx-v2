const test = require("node:test");
const assert = require("node:assert/strict");
const { checkInHabit, getStreakSummary } = require("../src/services/streakService");

const day = (value) => new Date(`${value}T00:00:00.000Z`);

function makeHabit({ freezeCredits = 2, targetDays = 66 } = {}) {
    return {
        _id: "test-habit-001",
        targetDays,
        freezeCredits,
        checkIns: [],
        freezeDays: [],
        currentStreak: 0,
        longestStreak: 0,
        saves: 0,
        async save() { this.saves += 1; return this; }
    };
}

test("first and consecutive check-ins build a streak", async () => {
    const habit = makeHabit();
    await checkInHabit(habit, day("2020-01-01"));
    await checkInHabit(habit, day("2020-01-02"));
    assert.equal(habit.currentStreak, 2);
    assert.equal(habit.longestStreak, 2);
    assert.equal(habit.freezeCredits, 2);
});

test("one missed day consumes a freeze and continues the streak", async () => {
    const habit = makeHabit({ freezeCredits: 1 });
    await checkInHabit(habit, day("2020-01-01"));
    const result = await checkInHabit(habit, day("2020-01-03"));
    assert.deepEqual(result.freezesUsed.map((date) => date.toISOString().slice(0, 10)), ["2020-01-02"]);
    assert.equal(habit.currentStreak, 3);
    assert.equal(habit.freezeCredits, 0);
});

test("multiple missed days consume multiple available freezes", async () => {
    const habit = makeHabit({ freezeCredits: 2 });
    await checkInHabit(habit, day("2020-01-01"));
    await checkInHabit(habit, day("2020-01-04"));
    assert.equal(habit.freezeDays.length, 2);
    assert.equal(habit.currentStreak, 4);
    assert.equal(habit.freezeCredits, 0);
});

test("a missed day resets the current streak when no freeze is available", async () => {
    const habit = makeHabit({ freezeCredits: 0 });
    await checkInHabit(habit, day("2020-01-01"));
    await checkInHabit(habit, day("2020-01-03"));
    assert.equal(habit.currentStreak, 1);
    assert.equal(habit.longestStreak, 1);
});

test("a duplicate check-in is idempotent", async () => {
    const habit = makeHabit();
    await checkInHabit(habit, day("2020-01-01"));
    const duplicate = await checkInHabit(habit, day("2020-01-01"));
    assert.equal(duplicate.created, false);
    assert.equal(habit.checkIns.length, 1);
    assert.equal(habit.saves, 1);
});

test("a check-in after a broken streak starts a new streak", async () => {
    const habit = makeHabit({ freezeCredits: 0 });
    await checkInHabit(habit, day("2020-01-01"));
    await checkInHabit(habit, day("2020-01-04"));
    await checkInHabit(habit, day("2020-01-05"));
    assert.equal(habit.currentStreak, 2);
    assert.equal(habit.longestStreak, 2);
});

test("66 consecutive check-ins mark the habit journey complete", async () => {
    const habit = makeHabit({ targetDays: 66 });
    for (let index = 0; index < 66; index += 1) {
        await checkInHabit(habit, new Date(Date.UTC(2020, 0, 1 + index)));
    }
    const streak = await getStreakSummary(habit);
    assert.equal(streak.currentStreak, 66);
    assert.equal(streak.completed, true);
});
