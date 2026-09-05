const router = require('express').Router();
const mongoose = require('mongoose');
const { requireAuth } = require('../middleware/auth');
const { sendPush } = require('../services/fcm');
const NotificationLog = require('../models/NotificationLog');

async function logNotification({ userId, title, body, token, eventType, delivered, mode, metadata }) {
  if (mongoose.connection.readyState === 1) {
    try {
      await NotificationLog.create({
        userId,
        title,
        body,
        token,
        eventType,
        delivered,
        mode,
        metadata
      });
    } catch (err) {
      console.warn('Failed to log notification to MongoDB:', err.message);
    }
  }
}

router.post('/push', requireAuth, async (req, res, next) => {
  try {
    const { token, title, body, data } = req.body;
    if (!token || !title || !body) return res.status(400).json({ error: 'token, title and body are required' });
    const result = await sendPush({ token, title, body, data });

    await logNotification({
      userId: req.user?.id,
      title,
      body,
      token,
      eventType: 'DIRECT_PUSH',
      delivered: Boolean(result.delivered),
      mode: result.mode || (result.delivered ? 'fcm' : 'mock'),
      metadata: data || {}
    });

    res.json(result);
  } catch (err) { next(err); }
});

// Event adapter for Harshavardhana/Pavan. Keep event contract stable as their services evolve.
router.post('/events', requireAuth, async (req, res, next) => {
  try {
    const { eventType, token, payload = {} } = req.body;
    if (!eventType || !token) return res.status(400).json({ error: 'eventType and token are required' });

    const templates = {
      MEDICATION_DUE: ['Medication reminder', 'You have a scheduled medication reminder.'],
      HABIT_REMINDER: ['Habit reminder', 'Your ReLifeX habit is ready to check in.'],
      INSIGHT_READY: ['New health insight', 'Your daily ReLifeX insight is ready.'],
      WORKOUT_NUDGE: ['Workout reminder', 'Time to get moving! Complete your daily workout goal.'],
      INACTIVITY_ALERT: ['Inactivity alert', 'You have been seated for a while. Take a brisk 5-minute walk.'],
      GOAL_ACHIEVED: ['Daily goal reached!', 'Awesome job! You reached your daily activity goal.']
    };
    const [title, defaultBody] = templates[eventType] || ['ReLifeX notification', 'You have a new ReLifeX update.'];
    const result = await sendPush({
      token,
      title,
      body: payload.body || defaultBody,
      data: { eventType, ...payload }
    });

    await logNotification({
      userId: req.user?.id,
      title,
      body: payload.body || defaultBody,
      token,
      eventType,
      delivered: Boolean(result.delivered),
      mode: result.mode || (result.delivered ? 'fcm' : 'mock'),
      metadata: payload
    });

    res.json({ eventType, ...result });
  } catch (err) { next(err); }
});

// Dedicated workout nudge trigger endpoint
router.post('/nudges/workout', requireAuth, async (req, res, next) => {
  try {
    const { token, nudgeType = 'WORKOUT_NUDGE', customMessage } = req.body;
    if (!token) return res.status(400).json({ error: 'token is required' });

    const messages = {
      WORKOUT_NUDGE: 'Time to start your scheduled workout session.',
      INACTIVITY_ALERT: 'Stand up and move around for 5 minutes.',
      GOAL_ACHIEVED: 'Daily step and activity target achieved!'
    };

    const title = nudgeType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    const body = customMessage || messages[nudgeType] || 'Stay active with ReLifeX!';

    const result = await sendPush({
      token,
      title,
      body,
      data: { eventType: nudgeType, category: 'WORKOUT_NUDGE' }
    });

    await logNotification({
      userId: req.user?.id,
      title,
      body,
      token,
      eventType: nudgeType,
      delivered: Boolean(result.delivered),
      mode: result.mode || (result.delivered ? 'fcm' : 'mock'),
      metadata: { nudgeType, category: 'WORKOUT_NUDGE' }
    });

    res.json({ nudgeType, ...result });
  } catch (err) { next(err); }
});

router.get('/history', requireAuth, async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ items: [], source: 'offline_mode' });
    }
    const limit = Math.min(Number(req.query.limit || 50), 100);
    const filter = req.user?.id ? { userId: req.user.id } : {};
    const items = await NotificationLog.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.json({ items, source: 'mongodb' });
  } catch (err) { next(err); }
});

module.exports = router;


