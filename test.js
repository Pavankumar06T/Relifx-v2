const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { loadJson } = require('./src/utils/dataStore');
const { app } = require('./src/server');
const Order = require('./src/models/Order');
const Booking = require('./src/models/Booking');
const Medicine = require('./src/models/Medicine');
const GoogleFitToken = require('./src/models/GoogleFitToken');
const NotificationLog = require('./src/models/NotificationLog');
const Cart = require('./src/models/Cart');

test('seeded catalog data is readable', () => {
  const meds = loadJson('medicines.json');
  assert.ok(Array.isArray(meds));
  assert.ok(meds.length >= 3);
});

test('mock diagnostics data is readable', () => {
  const items = loadJson('diagnostics.json');
  assert.ok(Array.isArray(items));
  assert.ok(items.some(x => x.name.includes('HbA1c')));
});

test('mock doctors data is readable', () => {
  const docs = loadJson('doctors.json');
  assert.ok(Array.isArray(docs));
  assert.ok(docs.length >= 2);
  assert.ok(docs.some(x => x.speciality.includes('Endocrinology')));
});

test('Mongoose models schema validation', async () => {
  await new Order({
    userId: 'user-001',
    items: [{ medicineId: 'med-001', name: 'Metformin 500 mg', quantity: 2, unitPrice: 35 }],
    total: 70
  }).validate();

  await new Booking({
    userId: 'user-001',
    type: 'DIAGNOSTIC',
    providerId: 'diag-001',
    providerName: 'ReLifeX Demo Diagnostics',
    serviceName: 'HbA1c Test',
    slot: '2026-09-05 10:00 AM'
  }).validate();

  await new Booking({
    userId: 'user-001',
    type: 'CONSULTATION',
    providerId: 'doc-001',
    providerName: 'Dr. Meera Rao',
    serviceName: 'Endocrinology',
    slot: '2026-09-05 11:30 AM'
  }).validate();

  await new Medicine({
    name: 'Metformin 500 mg',
    genericName: 'Metformin',
    strength: '500 mg',
    form: 'Tablet',
    category: 'Diabetes',
    price: 35,
    stock: 120
  }).validate();

  await new GoogleFitToken({
    userId: 'user-001',
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiryDate: Date.now() + 3600000
  }).validate();

  await new NotificationLog({
    userId: 'user-001',
    title: 'Test Notification',
    body: 'Test Body',
    token: 'device-token',
    eventType: 'HABIT_REMINDER',
    delivered: false,
    mode: 'mock'
  }).validate();

  await new Cart({
    userId: 'user-001',
    items: [{ medicineId: 'med-001', name: 'Metformin 500 mg', quantity: 2, unitPrice: 35 }]
  }).validate();
});

test('API endpoints integration suite', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    server.close();
  });

  await t.test('GET /api/health returns ok status and mongodb report', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.service, 'relifex-anurag-integrations');
    assert.equal(body.status, 'ok');
    assert.ok(body.timestamp);
    assert.ok(body.mongodb);
    assert.ok(typeof body.mongodb.connected === 'boolean');
  });

  await t.test('GET /api/ordering/medicines returns seeded catalog', async () => {
    const res = await fetch(`${baseUrl}/api/ordering/medicines`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.items));
    assert.ok(body.items.length >= 3);
  });

  await t.test('GET /api/ordering/medicines/:id returns medicine detail or 404', async () => {
    const resValid = await fetch(`${baseUrl}/api/ordering/medicines/med-001`);
    assert.equal(resValid.status, 200);
    const bodyValid = await resValid.json();
    assert.equal(bodyValid.item.id, 'med-001');

    const resNotFound = await fetch(`${baseUrl}/api/ordering/medicines/non-existent-id`);
    assert.equal(resNotFound.status, 404);
  });

  await t.test('GET /api/ordering/medicines filters by query and category', async () => {
    const resQ = await fetch(`${baseUrl}/api/ordering/medicines?q=Metformin`);
    assert.equal(resQ.status, 200);
    const bodyQ = await resQ.json();
    assert.ok(bodyQ.items.every(m => m.name.toLowerCase().includes('metformin')));

    const resCat = await fetch(`${baseUrl}/api/ordering/medicines?category=Vitamins`);
    assert.equal(resCat.status, 200);
    const bodyCat = await resCat.json();
    assert.ok(bodyCat.items.every(m => m.category === 'Vitamins'));
  });

  await t.test('POST /api/ordering/orders validates input before DB access', async () => {
    const resEmpty = await fetch(`${baseUrl}/api/ordering/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] })
    });
    assert.equal(resEmpty.status, 400);

    const resInvalid = await fetch(`${baseUrl}/api/ordering/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ medicineId: 'invalid-med-id', quantity: 1 }] })
    });
    assert.equal(resInvalid.status, 400);

    const resNegative = await fetch(`${baseUrl}/api/ordering/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ medicineId: 'med-001', quantity: 0 }] })
    });
    assert.equal(resNegative.status, 400);
  });

  await t.test('POST /api/ordering/orders creates an order and GET /orders retrieves list', async () => {
    const resCreate = await fetch(`${baseUrl}/api/ordering/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ medicineId: 'med-001', quantity: 2 }] })
    });
    assert.equal(resCreate.status, 201);
    const bodyCreate = await resCreate.json();
    assert.ok(bodyCreate.order);
    assert.equal(bodyCreate.order.total, 70);

    const resList = await fetch(`${baseUrl}/api/ordering/orders`);
    assert.equal(resList.status, 200);
    const bodyList = await resList.json();
    assert.ok(Array.isArray(bodyList.items));
  });

  await t.test('GET /api/diagnostics returns seeded tests', async () => {
    const res = await fetch(`${baseUrl}/api/diagnostics`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.items));
    assert.ok(body.items.some(d => d.name.includes('HbA1c')));
  });

  await t.test('GET /api/diagnostics/:id returns diagnostic detail or 404', async () => {
    const resValid = await fetch(`${baseUrl}/api/diagnostics/diag-001`);
    assert.equal(resValid.status, 200);
    const bodyValid = await resValid.json();
    assert.equal(bodyValid.item.id, 'diag-001');

    const resNotFound = await fetch(`${baseUrl}/api/diagnostics/diag-unknown`);
    assert.equal(resNotFound.status, 404);
  });

  await t.test('POST /api/diagnostics/bookings creates booking and validates inputs', async () => {
    const resNotFound = await fetch(`${baseUrl}/api/diagnostics/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagnosticId: 'nonexistent-diag', slot: '2026-09-05 10:00 AM' })
    });
    assert.equal(resNotFound.status, 404);

    const resNoSlot = await fetch(`${baseUrl}/api/diagnostics/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagnosticId: 'diag-001' })
    });
    assert.equal(resNoSlot.status, 400);

    const resSuccess = await fetch(`${baseUrl}/api/diagnostics/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagnosticId: 'diag-001', slot: '2026-09-05 10:00 AM' })
    });
    assert.equal(resSuccess.status, 201);
    const bodySuccess = await resSuccess.json();
    assert.ok(bodySuccess.booking);
    assert.equal(bodySuccess.booking.providerId, 'diag-001');

    const resMy = await fetch(`${baseUrl}/api/diagnostics/bookings/my`);
    assert.equal(resMy.status, 200);
  });

  await t.test('GET /api/consultation/doctors returns seeded doctors', async () => {
    const res = await fetch(`${baseUrl}/api/consultation/doctors`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.items));
    assert.ok(body.items.some(d => d.name.includes('Meera Rao')));
  });

  await t.test('GET /api/consultation/doctors/:id returns doctor detail or 404', async () => {
    const resValid = await fetch(`${baseUrl}/api/consultation/doctors/doc-001`);
    assert.equal(resValid.status, 200);
    const bodyValid = await resValid.json();
    assert.equal(bodyValid.item.id, 'doc-001');

    const resNotFound = await fetch(`${baseUrl}/api/consultation/doctors/doc-unknown`);
    assert.equal(resNotFound.status, 404);
  });

  await t.test('POST /api/consultation/bookings creates booking and validates inputs', async () => {
    const resNotFound = await fetch(`${baseUrl}/api/consultation/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId: 'nonexistent-doc', slot: '2026-09-05 10:00 AM' })
    });
    assert.equal(resNotFound.status, 404);

    const resNoSlot = await fetch(`${baseUrl}/api/consultation/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId: 'doc-001' })
    });
    assert.equal(resNoSlot.status, 400);

    const resSuccess = await fetch(`${baseUrl}/api/consultation/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId: 'doc-001', slot: '2026-09-05 11:30 AM' })
    });
    assert.equal(resSuccess.status, 201);
    const bodySuccess = await resSuccess.json();
    assert.ok(bodySuccess.booking);
    assert.equal(bodySuccess.booking.providerId, 'doc-001');

    const resMy = await fetch(`${baseUrl}/api/consultation/bookings/my`);
    assert.equal(resMy.status, 200);
  });

  await t.test('GET /api/wearables/google-fit/connect returns authorization URL', async () => {
    const res = await fetch(`${baseUrl}/api/wearables/google-fit/connect`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.authorizationUrl.includes('accounts.google.com'));
    assert.ok(body.authorizationUrl.includes('fitness.activity.read'));
  });

  await t.test('GET /api/wearables/google-fit/status returns connection state', async () => {
    const res = await fetch(`${baseUrl}/api/wearables/google-fit/status`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok('connected' in body);
  });

  await t.test('POST /api/wearables/google-fit/disconnect disconnects integration', async () => {
    const res = await fetch(`${baseUrl}/api/wearables/google-fit/disconnect`, {
      method: 'POST'
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.disconnected, true);
  });

  await t.test('GET /api/wearables/google-fit/summary returns normalized activity proposal', async () => {
    const res = await fetch(`${baseUrl}/api/wearables/google-fit/summary`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.source);
    assert.ok(Array.isArray(body.daily));
  });

  await t.test('POST /api/wearables/google-fit/sync accepts manual fitness metrics', async () => {
    const res = await fetch(`${baseUrl}/api/wearables/google-fit/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steps: 8400, calories: 2200, distanceMeters: 6200 })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.synced, true);
    assert.equal(body.data.steps, 8400);

    const resInvalid = await fetch(`${baseUrl}/api/wearables/google-fit/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(resInvalid.status, 400);
  });

  await t.test('GET /api/wearables/google-fit/callback validates code and state', async () => {
    const res = await fetch(`${baseUrl}/api/wearables/google-fit/callback`);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'code and state are required');
  });

  await t.test('GET /api/wearables/google-fit/activity validates time range', async () => {
    const res = await fetch(`${baseUrl}/api/wearables/google-fit/activity?startTimeMillis=2000&endTimeMillis=1000`);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'Invalid start/end time');
  });

  await t.test('POST /api/notifications/push handles fallback mock mode', async () => {
    const res = await fetch(`${baseUrl}/api/notifications/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'test-fcm-token', title: 'Med Alert', body: 'Take medicine' })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.delivered, false);
    assert.equal(body.mode, 'mock');

    const resInvalid = await fetch(`${baseUrl}/api/notifications/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'test-fcm-token' })
    });
    assert.equal(resInvalid.status, 400);
  });

  await t.test('POST /api/notifications/events handles event triggers in mock mode', async () => {
    const resHabit = await fetch(`${baseUrl}/api/notifications/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'HABIT_REMINDER',
        token: 'test-fcm-token',
        payload: { body: 'Drink 500ml water' }
      })
    });
    assert.equal(resHabit.status, 200);
    const bodyHabit = await resHabit.json();
    assert.equal(bodyHabit.eventType, 'HABIT_REMINDER');
    assert.equal(bodyHabit.mode, 'mock');

    const resInsight = await fetch(`${baseUrl}/api/notifications/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'INSIGHT_READY',
        token: 'test-fcm-token',
        payload: { body: 'Your glucose trend is stable' }
      })
    });
    assert.equal(resInsight.status, 200);
    const bodyInsight = await resInsight.json();
    assert.equal(bodyInsight.eventType, 'INSIGHT_READY');
    assert.equal(bodyInsight.mode, 'mock');
  });

  await t.test('GET /api/notifications/history returns history list', async () => {
    const res = await fetch(`${baseUrl}/api/notifications/history`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.items));
  });

  await t.test('Cart functionality: add, update, and checkout', async () => {
    // 1. Get initial cart
    const resGet = await fetch(`${baseUrl}/api/ordering/cart`);
    assert.equal(resGet.status, 200);

    // 2. Add item to cart
    const resAdd = await fetch(`${baseUrl}/api/ordering/cart/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicineId: 'med-001', quantity: 2 })
    });
    assert.equal(resAdd.status, 201);
    const bodyAdd = await resAdd.json();
    assert.equal(bodyAdd.totalItems, 2);
    assert.equal(bodyAdd.subtotal, 70);

    // 3. Patch quantity
    const resPatch = await fetch(`${baseUrl}/api/ordering/cart/items/med-001`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 3 })
    });
    assert.equal(resPatch.status, 200);
    const bodyPatch = await resPatch.json();
    assert.equal(bodyPatch.totalItems, 3);
    assert.equal(bodyPatch.subtotal, 105);

    // 4. Checkout cart
    const resCheckout = await fetch(`${baseUrl}/api/ordering/cart/checkout`, {
      method: 'POST'
    });
    assert.equal(resCheckout.status, 201);
    const bodyCheckout = await resCheckout.json();
    assert.ok(bodyCheckout.order);
    assert.equal(bodyCheckout.order.total, 105);

    // 5. Verify cart is empty after checkout
    const resAfter = await fetch(`${baseUrl}/api/ordering/cart`);
    const bodyAfter = await resAfter.json();
    assert.equal(bodyAfter.totalItems, 0);
  });

  await t.test('GET /api/wearables/google-fit/workouts returns workout sessions', async () => {
    const res = await fetch(`${baseUrl}/api/wearables/google-fit/workouts`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.items));
    assert.ok(body.items.some(w => w.activityType === 'Walking' || w.activityType === 'HIIT'));
  });

  await t.test('POST /api/wearables/google-fit/fitness-stream passes data to Fitness module', async () => {
    const res = await fetch(`${baseUrl}/api/wearables/google-fit/fitness-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.event, 'FITNESS_DATA_INGESTED');
    assert.equal(body.recipientModule, 'Harshavardhana.FitnessModule');
    assert.ok(body.data.workouts);
  });

  await t.test('GET /api/diagnostics/bookings/:id/report returns demo lab report', async () => {
    const res = await fetch(`${baseUrl}/api/diagnostics/bookings/demo-booking-123/report`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.report);
    assert.equal(body.mode, 'mock_demo_report');
    assert.ok(body.report.testName);
  });

  await t.test('GET /api/consultation/bookings/:id/join returns telehealth room URL', async () => {
    const res = await fetch(`${baseUrl}/api/consultation/bookings/demo-booking-456/join`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.meetingUrl);
    assert.equal(body.status, 'READY');
  });

  await t.test('POST /api/notifications/nudges/workout dispatches workout nudge', async () => {
    const res = await fetch(`${baseUrl}/api/notifications/nudges/workout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'test-device-token', nudgeType: 'WORKOUT_NUDGE' })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.nudgeType, 'WORKOUT_NUDGE');
    assert.equal(body.mode, 'mock');
  });
});

test('JWT authentication adapter verification', () => {
  const secret = process.env.JWT_SECRET || 'dev_secret_jwt_key_relifex_12345';
  const token = jwt.sign({ sub: 'user-789', role: 'patient' }, secret, { expiresIn: '1h' });
  const decoded = jwt.verify(token, secret);
  assert.equal(decoded.sub, 'user-789');
  assert.equal(decoded.role, 'patient');

  assert.throws(() => {
    jwt.verify(token, 'wrong-secret-key');
  });
});


