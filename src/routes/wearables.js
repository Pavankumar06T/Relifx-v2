const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const {
  getAuthUrl,
  exchangeCode,
  getConnectionStatus,
  disconnectGoogleFit,
  getActivitySummary,
  getNormalizedActivityProposal,
  getWorkoutSessions,
  passWearableDataToFitnessModule
} = require('../services/googleFit');

router.get('/google-fit/connect', requireAuth, (req, res) => {
  const url = getAuthUrl(req.user.id);
  res.json({ authorizationUrl: url });
});

router.get('/google-fit/callback', async (req, res, next) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).json({ error: 'code and state are required' });
    await exchangeCode(code, state);
    res.json({ connected: true });
  } catch (err) { next(err); }
});

router.get('/google-fit/status', requireAuth, async (req, res, next) => {
  try {
    const status = await getConnectionStatus(req.user.id);
    res.json(status);
  } catch (err) { next(err); }
});

router.post('/google-fit/disconnect', requireAuth, async (req, res, next) => {
  try {
    const result = await disconnectGoogleFit(req.user.id);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/google-fit/activity', requireAuth, async (req, res, next) => {
  try {
    const end = Number(req.query.endTimeMillis || Date.now());
    const start = Number(req.query.startTimeMillis || (end - 7 * 86400000));
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      return res.status(400).json({ error: 'Invalid start/end time' });
    }
    const allowMock = req.query.mock === 'true' || process.env.NODE_ENV !== 'production';
    const data = await getActivitySummary(req.user.id, start, end, allowMock);
    res.json({ source: 'google_fit', items: data });
  } catch (err) { next(err); }
});

// Workout sessions endpoint (Walking, Running, Cycling, HIIT, Strength Training, Yoga)
router.get('/google-fit/workouts', requireAuth, async (req, res, next) => {
  try {
    const end = Number(req.query.endTimeMillis || Date.now());
    const start = Number(req.query.startTimeMillis || (end - 7 * 86400000));
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      return res.status(400).json({ error: 'Invalid start/end time' });
    }
    const allowMock = req.query.mock === 'true' || process.env.NODE_ENV !== 'production';
    const workouts = await getWorkoutSessions(req.user.id, start, end, allowMock);
    res.json({ source: 'google_fit', items: workouts });
  } catch (err) { next(err); }
});

// Normalized wearable handoff endpoint for Harshavardhana (Fitness module)
router.get('/google-fit/summary', requireAuth, async (req, res, next) => {
  try {
    const end = Number(req.query.endTimeMillis || Date.now());
    const start = Number(req.query.startTimeMillis || (end - 7 * 86400000));
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      return res.status(400).json({ error: 'Invalid start/end time' });
    }
    const allowMock = req.query.mock === 'true' || process.env.NODE_ENV !== 'production';
    const payload = await getNormalizedActivityProposal(req.user.id, start, end, allowMock);
    res.json(payload);
  } catch (err) { next(err); }
});

// Pass wearable activity & workout data directly into Harshavardhana's Fitness module
router.post('/google-fit/fitness-stream', requireAuth, async (req, res, next) => {
  try {
    const end = Number(req.body.endTimeMillis || Date.now());
    const start = Number(req.body.startTimeMillis || (end - 7 * 86400000));
    const result = await passWearableDataToFitnessModule(req.user.id, start, end, true);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/google-fit/sync', requireAuth, async (req, res, next) => {
  try {
    const { steps, calories, distanceMeters } = req.body;
    if (steps == null) return res.status(400).json({ error: 'steps is required' });
    res.json({
      synced: true,
      userId: req.user.id,
      data: {
        steps: Number(steps),
        calories: Number(calories || Math.round(Number(steps) * 0.04)),
        distanceMeters: Number(distanceMeters || Math.round(Number(steps) * 0.75)),
        syncedAt: new Date().toISOString()
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;


