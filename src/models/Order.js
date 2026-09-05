const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  medicineId: { type: String, required: true },
  name: String,
  quantity: { type: Number, min: 1, required: true },
  unitPrice: { type: Number, min: 0, required: true }
}, { _id: false });

const schema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  items: { type: [itemSchema], required: true },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['PLACED', 'CANCELLED'], default: 'PLACED' }
}, { timestamps: true });

module.exports = mongoose.model('Order', schema);
