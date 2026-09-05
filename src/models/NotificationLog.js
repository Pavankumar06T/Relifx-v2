const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: String, index: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  token: { type: String },
  eventType: { type: String, default: 'PUSH' },
  delivered: { type: Boolean, default: false },
  mode: { type: String, default: 'mock' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('NotificationLog', schema);
