require('dotenv').config();
const mongoose = require('mongoose');
const Medicine = require('../src/models/Medicine');
const Order = require('../src/models/Order');
const Cart = require('../src/models/Cart');
const Booking = require('../src/models/Booking');
const NotificationLog = require('../src/models/NotificationLog');
const GoogleFitToken = require('../src/models/GoogleFitToken');

const seed = require('../data/medicines.json');

(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected to MongoDB database: "${mongoose.connection.name}"`);

  // 1. Medicines
  await Medicine.deleteMany({});
  const docs = seed.map(({ id, ...rest }) => ({
    medicineId: id,
    ...rest
  }));
  await Medicine.insertMany(docs);
  console.log(`✔ Seeded ${docs.length} medicines`);

  // 2. Orders
  await Order.deleteMany({});
  await Order.create([
    {
      userId: 'test-user-001',
      items: [
        { medicineId: 'med-001', name: 'Metformin 500 mg', quantity: 2, unitPrice: 35 },
        { medicineId: 'med-003', name: 'Vitamin D3 60K IU', quantity: 1, unitPrice: 120 }
      ],
      total: 190,
      status: 'PLACED'
    }
  ]);
  console.log('✔ Seeded sample orders');

  // 3. Cart
  await Cart.deleteMany({});
  await Cart.create({
    userId: 'test-user-001',
    items: [
      { medicineId: 'med-002', name: 'Atorvastatin 10 mg', quantity: 1, unitPrice: 85 }
    ]
  });
  console.log('✔ Seeded sample cart');

  // 4. Bookings (Diagnostics & Consultation)
  await Booking.deleteMany({});
  await Booking.create([
    {
      userId: 'test-user-001',
      type: 'DIAGNOSTIC',
      providerId: 'diag-001',
      providerName: 'ReLifeX Demo Diagnostics',
      serviceName: 'HbA1c Glycated Hemoglobin Test',
      slot: '2026-09-05 10:00 AM',
      status: 'BOOKED'
    },
    {
      userId: 'test-user-001',
      type: 'CONSULTATION',
      providerId: 'doc-001',
      providerName: 'Dr. Meera Rao',
      serviceName: 'Endocrinology & Diabetes Consultation',
      slot: '2026-09-06 11:30 AM',
      status: 'BOOKED'
    }
  ]);
  console.log('✔ Seeded sample bookings');

  // 5. Notification Logs
  await NotificationLog.deleteMany({});
  await NotificationLog.create([
    {
      userId: 'test-user-001',
      title: 'Workout Reminder',
      body: 'Time for your 30-minute evening walk session.',
      token: 'demo-fcm-token',
      eventType: 'WORKOUT_NUDGE',
      delivered: true,
      mode: 'mock',
      metadata: { nudgeType: 'WORKOUT_NUDGE', targetMinutes: 30 }
    },
    {
      userId: 'test-user-001',
      title: 'Medication Reminder',
      body: 'Scheduled reminder: Take Metformin 500 mg with dinner.',
      token: 'demo-fcm-token',
      eventType: 'MEDICATION_DUE',
      delivered: true,
      mode: 'mock',
      metadata: { medicineId: 'med-001' }
    }
  ]);
  console.log('✔ Seeded sample notification logs');

  // 6. Google Fit Wearables Token
  await GoogleFitToken.deleteMany({});
  await GoogleFitToken.create({
    userId: 'test-user-001',
    accessToken: 'ya29.sample_oauth_access_token_demo_google_fit',
    refreshToken: '1//0sample_refresh_token_demo',
    expiryDate: Date.now() + 3600000,
    scope: 'https://www.googleapis.com/auth/fitness.activity.read',
    tokenType: 'Bearer'
  });
  console.log('✔ Seeded sample Google Fit token');

  console.log('\nAll 6 collections successfully created & populated in the "relifex" database!');
  await mongoose.disconnect();
})().catch(err => { console.error(err); process.exit(1); });
