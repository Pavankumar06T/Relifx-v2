const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  medicineId: { type: String, index: true },
  name: { type: String, required: true, trim: true },
  genericName: { type: String, trim: true },
  strength: { type: String, trim: true },
  form: { type: String, trim: true },
  category: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  prescriptionRequired: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Medicine', schema);
