const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: String, unique: true, index: true },
  accessToken: { type: String, required: true },
  refreshToken: String,
  expiryDate: Number,
  scope: String,
  tokenType: String
}, { timestamps: true });

module.exports = mongoose.model('GoogleFitToken', schema);
