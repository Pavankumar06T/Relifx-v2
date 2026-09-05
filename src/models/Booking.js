const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, enum: ['DIAGNOSTIC', 'CONSULTATION'], required: true },
  providerId: { type: String, required: true },
  providerName: { type: String, required: true },
  serviceName: { type: String },
  slot: { type: String, required: true },
  status: { type: String, enum: ['BOOKED', 'CANCELLED'], default: 'BOOKED' }
}, { timestamps: true });

module.exports = mongoose.model('Booking', schema);
