const test = require("node:test");
const assert = require("node:assert/strict");

// This is a dependency-free API test double. It exercises Express routes and
// controllers without requiring MongoDB, Redis, another service, or real data.
const HealthLog = require("../src/models/HealthLog");
const Habit = require("../src/models/Habit");
const Workout = require("../src/models/Workout");

const logs = [];
const habits = [];
let habitSequence = 0;

function sameDate(left, right) {
    return new Date(left).getTime() === new Date(right).getTime();
}

function promiseWithLean(value) {
    const promise = Promise.resolve(value);
    promise.lean = async () => value;
    return promise;
}

function logMatches(log, filter) {
    if (log.userId !== filter.userId) return false;
    if (filter.date instanceof Date) return sameDate(log.date, filter.date);
    if (filter.date?.$gte) return log.date >= filter.date.$gte && log.date <= filter.date.$lte;
    return true;
}

HealthLog.findOneAndUpdate = async (filter, update, options = {}) => {
    let log = logs.find((item) => logMatches(item, filter));
    if (!log && !options.upsert) return null;
    if (!log) {
        log = { _id: `log-${logs.length + 1}`, userId: update.$setOnInsert.userId, date: update.$setOnInsert.date };
        logs.push(log);
    }
    Object.assign(log, update.$set || {});
    return log;
};
HealthLog.findOne = async (filter) => logs.find((item) => logMatches(item, filter)) || null;
HealthLog.findOneAndDelete = async (filter) => {
    const index = logs.findIndex((item) => logMatches(item, filter));
    return index === -1 ? null : logs.splice(index, 1)[0];
};
HealthLog.find = (filter) => ({ sort: () => promiseWithLean(logs.filter((item) => logMatches(item, filter))) });

function makeHabit(data) {
    const habit = {
        _id: `habit-${++habitSequence}`,
        targetDays: 66,
        freezeCredits: 2,
        active: true,
        category: "custom",
        checkIns: [],
        freezeDays: [],
        currentStreak: 0,
        longestStreak: 0,
        ...data,
        async save() { return this; }
    };
    return habit;
}

function habitMatches(habit, filter) {
    return Object.entries(filter).every(([key, value]) => key === "_id" ? habit._id === value : habit[key] === value);
}

Habit.create = async (data) => {
    const habit = makeHabit(data);
    habits.push(habit);
    return habit;
};
Habit.find = (filter) => {
    const matches = habits.filter((habit) => habitMatches(habit, filter));
    return { sort: () => promiseWithLean(matches), lean: async () => matches };
};
Habit.findOne = async (filter) => habits.find((habit) => habitMatches(habit, filter)) || null;
Habit.findOneAndUpdate = async (filter, update) => {
    const habit = habits.find((item) => habitMatches(item, filter));
    if (habit) Object.assign(habit, update.$set || update);
    return habit || null;
};
Habit.findOneAndDelete = async (filter) => {
    const index = habits.findIndex((item) => habitMatches(item, filter));
    return index === -1 ? null : habits.splice(index, 1)[0];
};

// Health Records now includes fitness. Keep its existing API test independent
// of MongoDB by providing an empty in-memory workout query.
Workout.find = () => ({ lean: async () => [] });

const app = require("../src/app");
let server;
let baseUrl;
const auth = { "X-User-Id": "test-user-001", "Content-Type": "application/json" };

test.before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => new Promise((resolve) => server.close(resolve)));

test("daily-log CRUD and health-record aggregation work through the API", { concurrency: false }, async () => {
    const body = {
        date: "2020-01-03", glucose: [{ value: 110, timing: "fasting" }],
        meals: [{ name: "Example meal", mealType: "breakfast", calories: 300, carbsGrams: 40 }],
        medications: [{ name: "Example medication", taken: true }],
        activity: { type: "walking", durationMinutes: 25, steps: 3000 }, sleep: { hours: 7 }, stress: { level: 4 }
    };
    let response = await fetch(`${baseUrl}/api/logs/daily`, { method: "PUT", headers: auth, body: JSON.stringify(body) });
    assert.equal(response.status, 200);

    response = await fetch(`${baseUrl}/api/logs?from=2020-01-01&to=2020-01-04`, { headers: auth });
    assert.equal((await response.json()).data.length, 1);

    const habit = makeHabit({ userId: "test-user-001", name: "Example habit", currentStreak: 3, longestStreak: 3 });
    habits.push(habit);
    response = await fetch(`${baseUrl}/api/health-records?from=2020-01-01&to=2020-01-04`, { headers: auth });
    const aggregate = await response.json();
    assert.equal(response.status, 200);
    assert.equal(aggregate.summary.averageGlucose, 110);
    assert.equal(aggregate.summary.totalSteps, 3000);
    assert.equal(aggregate.habits.items[0].currentStreak, 3);

    response = await fetch(`${baseUrl}/api/logs/daily/2020-01-03`, { method: "PATCH", headers: auth, body: JSON.stringify({ stress: { level: 2 } }) });
    assert.equal((await response.json()).data.stress.level, 2);

    response = await fetch(`${baseUrl}/api/logs/daily/2020-01-03`, { method: "DELETE", headers: auth });
    assert.equal(response.status, 204);
    response = await fetch(`${baseUrl}/api/logs/daily/2020-01-03`, { headers: auth });
    assert.equal(response.status, 404);
});

test("habit CRUD and idempotent check-in work through the API", { concurrency: false }, async () => {
    let response = await fetch(`${baseUrl}/api/habits`, {
        method: "POST", headers: auth, body: JSON.stringify({ name: "API walk", category: "activity" })
    });
    const created = await response.json();
    assert.equal(response.status, 201);
    assert.equal(created.data.targetDays, 66);
    const habitId = created.data._id;

    response = await fetch(`${baseUrl}/api/habits/${habitId}/check-ins`, {
        method: "POST", headers: auth, body: JSON.stringify({ date: "2020-02-01" })
    });
    assert.equal(response.status, 201);
    response = await fetch(`${baseUrl}/api/habits/${habitId}/check-ins`, {
        method: "POST", headers: auth, body: JSON.stringify({ date: "2020-02-01" })
    });
    assert.equal((await response.json()).idempotent, true);

    response = await fetch(`${baseUrl}/api/habits/${habitId}`, {
        method: "PATCH", headers: auth, body: JSON.stringify({ description: "Updated fake habit" })
    });
    assert.equal((await response.json()).data.description, "Updated fake habit");
    response = await fetch(`${baseUrl}/api/habits/${habitId}`, { method: "DELETE", headers: auth });
    assert.equal(response.status, 204);
});
