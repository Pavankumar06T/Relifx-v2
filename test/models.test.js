const test = require("node:test");
const assert = require("node:assert/strict");
const HealthLog = require("../src/models/HealthLog");
const Habit = require("../src/models/Habit");
const Workout = require("../src/models/Workout");

test("health-log placeholder payload validates against the AI-ready schema", async () => {
    const log = new HealthLog({
        userId: "test-user-001", date: "2026-09-04",
        glucose: [{ value: 112, timing: "fasting" }],
        meals: [{ name: "Oats", mealType: "breakfast", calories: 370 }],
        sleep: { hours: 7.5, quality: 4 }, stress: { level: 3 }
    });
    await assert.doesNotReject(log.validate());
});

test("habit defaults to the requested 66-day journey", async () => {
    const habit = new Habit({ userId: "test-user-001", name: "Morning walk" });
    assert.equal(habit.targetDays, 66);
    assert.equal(habit.freezeCredits, 2);
    await assert.doesNotReject(habit.validate());
});

test("workout accepts fake development fitness data and rejects invalid duration", async () => {
    const workout = new Workout({
        userId: "test-user-001", date: "2026-09-04", workoutType: "walking",
        exerciseName: "Example outdoor walk", durationMinutes: 30, intensity: "moderate", caloriesBurned: 150
    });
    await assert.doesNotReject(workout.validate());

    const invalidWorkout = new Workout({ userId: "test-user-001", workoutType: "walking", exerciseName: "Invalid", durationMinutes: 0 });
    await assert.rejects(invalidWorkout.validate());
});
