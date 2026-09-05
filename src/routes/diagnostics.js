const router = require('express').Router();
const mongoose = require('mongoose');
const { requireAuth } = require('../middleware/auth');
const { loadJson } = require('../utils/dataStore');
const Booking = require('../models/Booking');

router.get('/', requireAuth, (req, res) => {
  res.json({ items: loadJson('diagnostics.json') });
});

router.get('/:id', requireAuth, (req, res) => {
  const item = loadJson('diagnostics.json').find(x => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Diagnostic not found' });
  res.json({ item });
});

router.post('/bookings', requireAuth, async (req, res, next) => {
  try {
    const { diagnosticId, slot } = req.body;
    const diagnostic = loadJson('diagnostics.json').find(x => x.id === diagnosticId);
    if (!diagnostic) return res.status(404).json({ error: 'Diagnostic not found' });
    if (!slot) return res.status(400).json({ error: 'slot is required' });

    if (mongoose.connection.readyState === 1) {
      const booking = await Booking.create({
        userId: req.user.id,
        type: 'DIAGNOSTIC',
        providerId: diagnostic.id,
        providerName: 'ReLifeX Demo Diagnostics',
        serviceName: diagnostic.name,
        slot
      });
      return res.status(201).json({ booking });
    }

    // Offline / mock development fallback
    const mockBooking = {
      _id: `mock-diag-booking-${Date.now()}`,
      userId: req.user.id,
      type: 'DIAGNOSTIC',
      providerId: diagnostic.id,
      providerName: 'ReLifeX Demo Diagnostics',
      serviceName: diagnostic.name,
      slot,
      status: 'BOOKED',
      createdAt: new Date().toISOString()
    };
    res.status(201).json({ booking: mockBooking, mode: 'offline_mock' });
  } catch (err) { next(err); }
});

router.get('/bookings/my', requireAuth, async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const items = await Booking.find({ userId: req.user.id, type: 'DIAGNOSTIC' }).sort({ createdAt: -1 });
      return res.json({ items });
    }
    res.json({ items: [], mode: 'offline_mock' });
  } catch (err) { next(err); }
});

router.get('/bookings/:id', requireAuth, async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const booking = await Booking.findOne({ _id: req.params.id, userId: req.user.id, type: 'DIAGNOSTIC' });
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      return res.json({ booking });
    }
    res.status(404).json({ error: 'Booking not found' });
  } catch (err) { next(err); }
});

router.post('/bookings/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const booking = await Booking.findOne({ _id: req.params.id, userId: req.user.id, type: 'DIAGNOSTIC' });
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      if (booking.status === 'CANCELLED') {
        return res.status(400).json({ error: 'Booking is already cancelled' });
      }
      booking.status = 'CANCELLED';
      await booking.save();
      return res.json({ booking });
    }
    res.status(503).json({ error: 'Database unavailable: MongoDB is not connected' });
  } catch (err) { next(err); }
});

// Demo sample lab report generation for the diagnostics demo flow
router.get('/bookings/:id/report', requireAuth, async (req, res, next) => {
  try {
    let booking;
    if (mongoose.connection.readyState === 1) {
      booking = await Booking.findOne({ _id: req.params.id, userId: req.user.id, type: 'DIAGNOSTIC' });
    }
    const mockReports = {
      'diag-001': {
        testId: 'diag-001',
        testName: 'HbA1c Test',
        resultValue: '5.6',
        unit: '%',
        referenceRange: '< 5.7% (Normal), 5.7-6.4% (Prediabetes), >= 6.5% (Diabetes)',
        clinicalStatus: 'NORMAL',
        notes: 'Optimal glycemic control maintained.'
      },
      'diag-002': {
        testId: 'diag-002',
        testName: 'Fasting Blood Glucose',
        resultValue: '94',
        unit: 'mg/dL',
        referenceRange: '70 - 99 mg/dL',
        clinicalStatus: 'NORMAL',
        notes: 'Normal fasting glucose levels.'
      },
      'diag-003': {
        testId: 'diag-003',
        testName: 'Lipid Profile',
        resultValue: '178',
        unit: 'mg/dL',
        referenceRange: '< 200 mg/dL',
        clinicalStatus: 'DESIRABLE',
        notes: 'Total cholesterol within desirable range.'
      }
    };
    const reportData = mockReports[booking?.providerId] || mockReports['diag-001'];
    res.json({
      bookingId: req.params.id,
      patientId: req.user.id,
      generatedAt: new Date().toISOString(),
      report: reportData,
      mode: 'mock_demo_report'
    });
  } catch (err) { next(err); }
});

module.exports = router;


