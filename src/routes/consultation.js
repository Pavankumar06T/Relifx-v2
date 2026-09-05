const router = require('express').Router();
const mongoose = require('mongoose');
const { requireAuth } = require('../middleware/auth');
const { loadJson } = require('../utils/dataStore');
const Booking = require('../models/Booking');

router.get('/doctors', requireAuth, (req, res) => {
  res.json({ items: loadJson('doctors.json') });
});

router.get('/doctors/:id', requireAuth, (req, res) => {
  const doctor = loadJson('doctors.json').find(x => x.id === req.params.id);
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
  res.json({ item: doctor });
});

router.post('/bookings', requireAuth, async (req, res, next) => {
  try {
    const { doctorId, slot } = req.body;
    const doctor = loadJson('doctors.json').find(x => x.id === doctorId);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    if (!slot) return res.status(400).json({ error: 'slot is required' });

    if (mongoose.connection.readyState === 1) {
      const booking = await Booking.create({
        userId: req.user.id,
        type: 'CONSULTATION',
        providerId: doctor.id,
        providerName: doctor.name,
        serviceName: doctor.speciality,
        slot
      });
      return res.status(201).json({ booking });
    }

    // Offline / mock development fallback
    const mockBooking = {
      _id: `mock-doc-booking-${Date.now()}`,
      userId: req.user.id,
      type: 'CONSULTATION',
      providerId: doctor.id,
      providerName: doctor.name,
      serviceName: doctor.speciality,
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
      const items = await Booking.find({ userId: req.user.id, type: 'CONSULTATION' }).sort({ createdAt: -1 });
      return res.json({ items });
    }
    res.json({ items: [], mode: 'offline_mock' });
  } catch (err) { next(err); }
});

router.get('/bookings/:id', requireAuth, async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const booking = await Booking.findOne({ _id: req.params.id, userId: req.user.id, type: 'CONSULTATION' });
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      return res.json({ booking });
    }
    res.status(404).json({ error: 'Booking not found' });
  } catch (err) { next(err); }
});

router.post('/bookings/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const booking = await Booking.findOne({ _id: req.params.id, userId: req.user.id, type: 'CONSULTATION' });
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

// Demo telehealth room session join endpoint for consultation demo flow
router.get('/bookings/:id/join', requireAuth, async (req, res, next) => {
  try {
    let booking;
    if (mongoose.connection.readyState === 1) {
      booking = await Booking.findOne({ _id: req.params.id, userId: req.user.id, type: 'CONSULTATION' });
    }
    const roomId = `room-${req.params.id}`;
    res.json({
      bookingId: req.params.id,
      meetingUrl: `https://telehealth.relifex.internal/rooms/${roomId}`,
      roomName: booking?.serviceName ? `${booking.serviceName} Consultation Room` : 'General Consultation Room',
      doctorName: booking?.providerName || 'Dr. Meera Rao',
      status: 'READY',
      demoToken: `telehealth-token-${Date.now()}`
    });
  } catch (err) { next(err); }
});

module.exports = router;


