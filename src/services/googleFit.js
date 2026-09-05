const { google } = require('googleapis');
const mongoose = require('mongoose');
const GoogleFitToken = require('../models/GoogleFitToken');

const FIT_SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.location.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.sleep.read'
];

function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function getAuthUrl(state) {
  const client = oauthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: FIT_SCOPES,
    state
  });
}

async function exchangeCode(code, userId) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (mongoose.connection.readyState === 1) {
    await GoogleFitToken.findOneAndUpdate(
      { userId },
      {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        scope: tokens.scope,
        tokenType: tokens.token_type
      },
      { upsert: true, new: true }
    );
  }
  return tokens;
}

async function getConnectionStatus(userId) {
  if (mongoose.connection.readyState !== 1) {
    return {
      connected: false,
      userId,
      mode: 'offline_mode'
    };
  }
  const saved = await GoogleFitToken.findOne({ userId });
  if (!saved) {
    return {
      connected: false,
      userId
    };
  }
  const isExpired = saved.expiryDate ? Date.now() > saved.expiryDate : false;
  return {
    connected: true,
    userId: saved.userId,
    expiryDate: saved.expiryDate,
    isExpired,
    scope: saved.scope,
    tokenType: saved.tokenType,
    updatedAt: saved.updatedAt
  };
}

async function disconnectGoogleFit(userId) {
  if (mongoose.connection.readyState !== 1) {
    return { disconnected: true, alreadyDisconnected: true, mode: 'offline_mode' };
  }
  const saved = await GoogleFitToken.findOne({ userId });
  if (!saved) {
    return { disconnected: true, alreadyDisconnected: true };
  }
  try {
    const client = oauthClient();
    if (saved.accessToken) {
      await client.revokeToken(saved.accessToken);
    }
  } catch {
    // Proceed with database removal even if remote revoke is unavailable
  }
  await GoogleFitToken.deleteOne({ userId });
  return { disconnected: true, userId };
}

function generateMockActivity(startTimeMillis, endTimeMillis) {
  const dayMs = 86400000;
  const items = [];
  let cur = Number(startTimeMillis);
  while (cur < Number(endTimeMillis)) {
    const next = Math.min(cur + dayMs, Number(endTimeMillis));
    const steps = Math.floor(4500 + ((cur / 1000) % 4000));
    items.push({
      startTimeMillis: String(cur),
      endTimeMillis: String(next),
      steps,
      calories: Math.round(1800 + steps * 0.04),
      distanceMeters: Math.round(steps * 0.75),
      heartRateAvg: 72
    });
    cur = next;
  }
  return items;
}

async function getActivitySummary(userId, startTimeMillis, endTimeMillis, allowMock = false) {
  if (mongoose.connection.readyState !== 1) {
    if (allowMock || process.env.NODE_ENV !== 'production') {
      return generateMockActivity(startTimeMillis, endTimeMillis);
    }
    throw Object.assign(new Error('Google Fit is not connected for this user'), { status: 400 });
  }

  const saved = await GoogleFitToken.findOne({ userId });
  if (!saved) {
    if (allowMock || process.env.NODE_ENV !== 'production') {
      return generateMockActivity(startTimeMillis, endTimeMillis);
    }
    throw Object.assign(new Error('Google Fit is not connected for this user'), { status: 400 });
  }

  const client = oauthClient();
  client.setCredentials({
    access_token: saved.accessToken,
    refresh_token: saved.refreshToken,
    expiry_date: saved.expiryDate
  });

  const fitness = google.fitness({ version: 'v1', auth: client });
  const { data } = await fitness.users.dataset.aggregate({
    userId: 'me',
    requestBody: {
      aggregateBy: [
        { dataTypeName: 'com.google.step_count.delta' },
        { dataTypeName: 'com.google.calories.expended' },
        { dataTypeName: 'com.google.distance.delta' }
      ],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: String(startTimeMillis),
      endTimeMillis: String(endTimeMillis)
    }
  });

  return (data.bucket || []).map(bucket => {
    const stepDataset = bucket.dataset?.[0];
    const calDataset = bucket.dataset?.[1];
    const distDataset = bucket.dataset?.[2];

    const steps = stepDataset?.point?.reduce((sum, p) => sum + (p.value?.[0]?.intVal || 0), 0) || 0;
    const calories = Math.round(calDataset?.point?.reduce((sum, p) => sum + (p.value?.[0]?.fpVal || 0), 0) || 0);
    const distanceMeters = Math.round(distDataset?.point?.reduce((sum, p) => sum + (p.value?.[0]?.fpVal || 0), 0) || 0);

    return {
      startTimeMillis: bucket.startTimeMillis,
      endTimeMillis: bucket.endTimeMillis,
      steps,
      calories,
      distanceMeters
    };
  });
}

async function getNormalizedActivityProposal(userId, startTimeMillis, endTimeMillis, allowMock = false) {
  const status = await getConnectionStatus(userId);
  const items = await getActivitySummary(userId, startTimeMillis, endTimeMillis, allowMock);
  return {
    source: status.connected ? 'google_fit' : 'mock_wearable',
    userId,
    timeRange: { startTimeMillis, endTimeMillis },
    daily: items.map(item => ({
      date: new Date(Number(item.startTimeMillis)).toISOString().slice(0, 10),
      steps: item.steps || 0,
      calories: item.calories || Math.round((item.steps || 0) * 0.04),
      distanceMeters: item.distanceMeters || Math.round((item.steps || 0) * 0.75),
      activeMinutes: Math.round((item.steps || 0) / 100),
      heartRateAvg: item.heartRateAvg || 72
    }))
  };
}

const ACTIVITY_TYPE_NAMES = {
  1: 'Biking',
  7: 'Walking',
  8: 'Running',
  72: 'Strength Training',
  97: 'Weightlifting',
  100: 'Yoga',
  114: 'HIIT'
};

function generateMockWorkouts(startTimeMillis, endTimeMillis) {
  const start = Number(startTimeMillis);
  return [
    {
      id: 'session-001',
      name: 'Morning Power Walk',
      activityType: 'Walking',
      activityCode: 7,
      startTimeMillis: String(start + 3600000),
      endTimeMillis: String(start + 5400000),
      durationMinutes: 30,
      caloriesBurned: 145,
      avgHeartRateBpm: 105,
      steps: 3200
    },
    {
      id: 'session-002',
      name: 'Evening HIIT Routine',
      activityType: 'HIIT',
      activityCode: 114,
      startTimeMillis: String(start + 36000000),
      endTimeMillis: String(start + 38400000),
      durationMinutes: 40,
      caloriesBurned: 320,
      avgHeartRateBpm: 142,
      steps: 1800
    }
  ];
}

async function getWorkoutSessions(userId, startTimeMillis, endTimeMillis, allowMock = false) {
  if (mongoose.connection.readyState !== 1) {
    if (allowMock || process.env.NODE_ENV !== 'production') {
      return generateMockWorkouts(startTimeMillis, endTimeMillis);
    }
    throw Object.assign(new Error('Google Fit is not connected for this user'), { status: 400 });
  }

  const saved = await GoogleFitToken.findOne({ userId });
  if (!saved) {
    if (allowMock || process.env.NODE_ENV !== 'production') {
      return generateMockWorkouts(startTimeMillis, endTimeMillis);
    }
    throw Object.assign(new Error('Google Fit is not connected for this user'), { status: 400 });
  }

  try {
    const client = oauthClient();
    client.setCredentials({
      access_token: saved.accessToken,
      refresh_token: saved.refreshToken,
      expiry_date: saved.expiryDate
    });

    const fitness = google.fitness({ version: 'v1', auth: client });
    const { data } = await fitness.users.sessions.list({
      userId: 'me',
      startTime: new Date(Number(startTimeMillis)).toISOString(),
      endTime: new Date(Number(endTimeMillis)).toISOString()
    });

    const sessions = data.session || [];
    return sessions.map(s => {
      const dur = Math.round((Number(s.endTimeMillis) - Number(s.startTimeMillis)) / 60000);
      return {
        id: s.id,
        name: s.name || 'Workout Session',
        activityType: ACTIVITY_TYPE_NAMES[s.activityType] || 'General Workout',
        activityCode: s.activityType,
        startTimeMillis: s.startTimeMillis,
        endTimeMillis: s.endTimeMillis,
        durationMinutes: dur,
        caloriesBurned: Math.round(dur * 6.5),
        avgHeartRateBpm: 120
      };
    });
  } catch (err) {
    if (allowMock || process.env.NODE_ENV !== 'production') {
      return generateMockWorkouts(startTimeMillis, endTimeMillis);
    }
    throw err;
  }
}

async function passWearableDataToFitnessModule(userId, startTimeMillis, endTimeMillis, allowMock = true) {
  const [activity, workouts] = await Promise.all([
    getNormalizedActivityProposal(userId, startTimeMillis, endTimeMillis, allowMock),
    getWorkoutSessions(userId, startTimeMillis, endTimeMillis, allowMock)
  ]);

  return {
    event: 'FITNESS_DATA_INGESTED',
    timestamp: new Date().toISOString(),
    recipientModule: 'Harshavardhana.FitnessModule',
    userId,
    data: {
      activitySummary: activity.daily,
      workouts,
      source: activity.source,
      totalActiveMinutes: activity.daily.reduce((sum, d) => sum + (d.activeMinutes || 0), 0) +
        workouts.reduce((sum, w) => sum + (w.durationMinutes || 0), 0)
    }
  };
}

module.exports = {
  FIT_SCOPES,
  getAuthUrl,
  exchangeCode,
  getConnectionStatus,
  disconnectGoogleFit,
  generateMockActivity,
  getActivitySummary,
  getNormalizedActivityProposal,
  getWorkoutSessions,
  passWearableDataToFitnessModule
};


