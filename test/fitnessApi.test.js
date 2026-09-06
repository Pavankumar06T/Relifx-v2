const test = require("node:test");
const assert = require("node:assert/strict");

// Development-only in-memory model double. This exercises actual Express
// endpoints without MongoDB, Redis, real users, or health information.
const Workout = require("../src/models/Workout");
const HealthLog = require("../src/models/HealthLog");
const Habit = require("../src/models/Habit");

const workouts = [];
let sequence = 0;

function query(items) {
    const result = Promise.resolve(items);
    result.lean = async () => items;
    return { sort: () => result, lean: async () => items };
}

function matches(workout, filter) {
    if (workout.userId !== filter.userId) return false;
    if (filter._id && workout._id !== filter._id) return false;
    if (filter.date?.$gte) return workout.date >= filter.date.$gte && workout.date <= filter.date.$lte;
    return true;
}

Workout.create = async (data) => {
    const workout = { _id: `workout-${++sequence}`, ...data };
    workouts.push(workout);
    return workout;
};
Workout.find = (filter) => query(workouts.filter((workout) => matches(workout, filter)));
Workout.findOne = async (filter) => workouts.find((workout) => matches(workout, filter)) || null;
Workout.findOneAndUpdate = async (filter, update) => {
    const workout = workouts.find((item) => matches(item, filter));
    if (workout) Object.assign(workout, update.$set || {});
    return workout || null;
};
Workout.findOneAndDelete = async (filter) => {
    const index = workouts.findIndex((workout) => matches(workout, filter));
    return index === -1 ? null : workouts.splice(index, 1)[0];
};

// The Health Records integration test needs only empty raw-health/habit data.
HealthLog.find = () => ({ sort: () => ({ lean: async () => [] }) });
Habit.find = () => ({ lean: async () => [] });

const app = require("../src/app");
const headersFor = (userId) => ({ "X-User-Id": userId, "Content-Type": "application/json" });
let server;
let baseUrl;

async function request(path, options = {}) {
    return fetch(`${baseUrl}${path}`, options);
}

test.before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => new Promise((resolve) => server.close(resolve)));

test("fitness API creates, reads, updates, and deletes a fake workout", { concurrency: false }, async () => {
    const response = await request("/api/workouts", {
        method: "POST", headers: headersFor("test-user-001"),
        body: JSON.stringify({ date: "2020-01-02", workoutType: "walking", exerciseName: "Example outdoor walk", durationMinutes: 30, intensity: "moderate", caloriesBurned: 150 })
    });
    assert.equal(response.status, 201);
    const created = await response.json();
    const workoutId = created.data._id;

    let getResponse = await request(`/api/workouts/${workoutId}`, { headers: headersFor("test-user-001") });
    assert.equal((await getResponse.json()).data.exerciseName, "Example outdoor walk");

    getResponse = await request(`/api/workouts/${workoutId}`, { headers: headersFor("test-user-002") });
    assert.equal(getResponse.status, 404);
    getResponse = await request("/api/workouts?from=2020-01-01&to=2020-01-03", { headers: headersFor("test-user-002") });
    assert.equal((await getResponse.json()).data.length, 0);

    const updateResponse = await request(`/api/workouts/${workoutId}`, {
        method: "PATCH", headers: headersFor("test-user-001"), body: JSON.stringify({ durationMinutes: 35, caloriesBurned: 175 })
    });
    assert.equal((await updateResponse.json()).data.durationMinutes, 35);

    const deleteResponse = await request(`/api/workouts/${workoutId}`, { method: "DELETE", headers: headersFor("test-user-001") });
    assert.equal(deleteResponse.status, 204);
});

test("fitness filtering, summary, fake sample data, and Health Records integration work", { concurrency: false }, async () => {
    const sampleWorkouts = [
        { date: "2020-02-01", workoutType: "walking", exerciseName: "Example outdoor walk", durationMinutes: 30, intensity: "moderate", caloriesBurned: 150 },
        { date: "2020-02-02", workoutType: "cycling", exerciseName: "Example cycling session", durationMinutes: 45, intensity: "high", caloriesBurned: 300 },
        { date: "2020-02-04", workoutType: "strength_training", exerciseName: "Example strength training", durationMinutes: 40, intensity: "moderate", caloriesBurned: 220 }
    ];
    for (const workout of sampleWorkouts) {
        const response = await request("/api/workouts", { method: "POST", headers: headersFor("test-user-001"), body: JSON.stringify(workout) });
        assert.equal(response.status, 201);
    }

    let response = await request("/api/workouts?from=2020-02-01&to=2020-02-02", { headers: headersFor("test-user-001") });
    assert.equal((await response.json()).data.length, 2);

    response = await request("/api/workouts/summary?from=2020-02-01&to=2020-02-04", { headers: headersFor("test-user-001") });
    const summary = await response.json();
    assert.equal(summary.data.numberOfWorkouts, 3);
    assert.equal(summary.data.totalDurationMinutes, 115);
    assert.equal(summary.data.totalCaloriesBurned, 670);
    assert.equal(summary.data.averageWorkoutDuration, 38.33);
    assert.equal(summary.data.workoutBreakdownByType.cycling.workouts, 1);

    response = await request("/api/health-records?from=2020-02-01&to=2020-02-04", { headers: headersFor("test-user-001") });
    const healthRecords = await response.json();
    assert.equal(healthRecords.fitness.workouts, 3);
    assert.equal(healthRecords.fitness.totalCaloriesBurned, 670);
    assert.equal(healthRecords.fitness.workoutTypes.strength_training, 1);
});
