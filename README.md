# ReLifeX Health Service

Express/MongoDB service for daily health logging, 66-day habit journeys, streak grace freezes, Fitness Tracking, and normalized Health Records for the AI pipeline.

## Run locally

Create a local `.env` from `.env.example` (never commit it), supply MongoDB and optionally Redis, then run `npm start`. Redis is an optional cache: MongoDB remains the durable source of truth. Run `npm test` for schema, streak-engine, and API-behavior tests without external services.

Until the shared JWT middleware is mounted, make authenticated local requests with `X-User-Id: test-user-001`. The hand-off contract is simple: the JWT middleware must set `req.user.id` or `req.user._id`; the compatibility header can then be removed from `src/middleware/requireUser.js`.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| PUT | `/api/logs/daily` | Upsert one calendar day's glucose, meals, meds, activity, sleep, stress, or notes. |
| GET | `/api/logs?from=YYYY-MM-DD&to=YYYY-MM-DD` | List raw daily logs (defaults to 30 days). |
| GET/PATCH/DELETE | `/api/logs/daily/:date` | Get, partially update, or delete one raw daily log. |
| POST | `/api/habits` | Create a habit; `targetDays` defaults to 66 and `freezeCredits` defaults to 2. |
| GET | `/api/habits` | List habits with cached streak summaries. |
| GET/PATCH/DELETE | `/api/habits/:habitId` | Read, edit, or delete a habit. |
| POST | `/api/habits/:habitId/check-ins` | Idempotent daily check-in; accepts optional `date` and `note`. |
| GET | `/api/health-records?from=YYYY-MM-DD&to=YYYY-MM-DD` | AI-ready daily health-record aggregation and range summary. |
| POST | `/api/workouts` | Record one workout. |
| GET | `/api/workouts?from=YYYY-MM-DD&to=YYYY-MM-DD` | List the current user's workouts; defaults to 30 days. |
| GET | `/api/workouts/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` | Workout counts, duration, calories, averages, and type breakdown. |
| GET/PATCH/DELETE | `/api/workouts/:workoutId` | Read, partially update, or delete one workout. |

Use `examples/sample-health-log.json` as an initial `PUT /api/logs/daily` body.

## Fitness Tracking

Workouts are separate records in the existing MongoDB database. Each record belongs to one user and includes a calendar date, `workoutType`, exercise name, duration, intensity, calories burned, and optional notes. Supported types are `walking`, `running`, `cycling`, `strength_training`, `yoga`, `swimming`, and `other`.

Use an item from `examples/sample-workouts.json` as a request body with `POST /api/workouts` and the development header `X-User-Id: test-user-001`:

```json
{
  "date": "2026-09-02",
  "workoutType": "walking",
  "exerciseName": "Example outdoor walk",
  "durationMinutes": 30,
  "intensity": "moderate",
  "caloriesBurned": 150
}
```

The success response is `{ "success": true, "data": { ...workout } }`. `GET /api/workouts/summary` reports `numberOfWorkouts`, `totalDurationMinutes`, `totalCaloriesBurned`, `averageWorkoutDuration`, and `workoutBreakdownByType`.

## Development-only seed data

The seed is deliberately guarded. Set `NODE_ENV=development` and `ALLOW_DEVELOPMENT_SEED=true`, configure `MONGODB_URI`, then run `npm run seed`. It only removes and recreates records for the fake `test-user-001`; it never touches other users. The seed creates logs, two habits, check-ins, a freeze day, and the three fake workouts in `examples/sample-workouts.json`.

## Streak rules

A check-in records a single UTC calendar day and is idempotent. If a user resumes a habit after missed days, all missed days are covered only when their remaining freeze credits can cover the entire gap; otherwise the new check-in begins a new streak. A midnight cron job also applies one available freeze to yesterday when it immediately follows the previous completion. Streak summaries are cached in Redis for two days and invalidated after habit edits.

`GET /api/health-records` returns `schemaVersion: "1.0"`, `summary`, active `habits`, an additive `fitness` summary, and `dailyRecords`. Fitness provides workout frequency, duration, calories burned, and a type count for later AI consumption; no AI pipeline is changed here. Missing measurements are represented as `null`, never invented numeric data.

## Authentication hand-off

`X-User-Id` is DEVELOPMENT ONLY and is rejected when `NODE_ENV=production`. When the shared authentication middleware is ready, mount it before these routes and set `req.user.id` or `req.user._id`; the workout and existing business logic will use it automatically without a rewrite.
