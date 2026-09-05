const router = require('express').Router();
const mongoose = require('mongoose');
const { requireAuth } = require('../middleware/auth');
const { loadJson } = require('../utils/dataStore');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');
const Cart = require('../models/Cart');

// In-memory cart store for offline development mode
const memoryCarts = new Map();

async function getUserCart(userId) {
  if (mongoose.connection.readyState === 1) {
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }
    return cart;
  }
  const items = memoryCarts.get(userId) || [];
  return { userId, items, isOffline: true };
}

async function saveUserCart(cart, items) {
  if (mongoose.connection.readyState === 1) {
    cart.items = items;
    await cart.save();
    return cart;
  }
  memoryCarts.set(cart.userId, items);
  cart.items = items;
  return cart;
}

function computeCartSummary(items) {
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  return { items, totalItems, subtotal };
}

async function getCatalog() {
  if (mongoose.connection.readyState === 1) {
    try {
      const dbMedicines = await Medicine.find({}).lean();
      if (dbMedicines && dbMedicines.length > 0) {
        return dbMedicines.map(m => ({
          _id: String(m._id),
          id: m.medicineId || String(m._id),
          medicineId: m.medicineId || String(m._id),
          name: m.name,
          genericName: m.genericName,
          strength: m.strength,
          form: m.form,
          category: m.category,
          price: m.price,
          stock: m.stock,
          prescriptionRequired: m.prescriptionRequired
        }));
      }
    } catch {
      // Fallback to static seed data
    }
  }
  return loadJson('medicines.json');
}

router.get('/medicines', requireAuth, async (req, res, next) => {
  try {
    const { q, category } = req.query;
    let medicines = await getCatalog();
    if (q) medicines = medicines.filter(m => `${m.name} ${m.genericName}`.toLowerCase().includes(String(q).toLowerCase()));
    if (category) medicines = medicines.filter(m => m.category.toLowerCase() === String(category).toLowerCase());
    res.json({ items: medicines });
  } catch (err) { next(err); }
});

router.get('/medicines/:id', requireAuth, async (req, res, next) => {
  try {
    const medicines = await getCatalog();
    const item = medicines.find(m => m.id === req.params.id || m.medicineId === req.params.id || m._id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Medicine not found' });
    res.json({ item });
  } catch (err) { next(err); }
});

// ================= Cart Functionality =================

router.get('/cart', requireAuth, async (req, res, next) => {
  try {
    const cart = await getUserCart(req.user.id);
    res.json(computeCartSummary(cart.items));
  } catch (err) { next(err); }
});

router.post('/cart/items', requireAuth, async (req, res, next) => {
  try {
    const { medicineId, quantity = 1 } = req.body;
    if (!medicineId) return res.status(400).json({ error: 'medicineId is required' });
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ error: 'quantity must be a positive integer' });

    const catalog = await getCatalog();
    const med = catalog.find(m => m.id === medicineId || m.medicineId === medicineId || m._id === medicineId);
    if (!med) return res.status(404).json({ error: `Unknown medicine: ${medicineId}` });

    const cart = await getUserCart(req.user.id);
    const existingIndex = cart.items.findIndex(i => i.medicineId === med.id || i.medicineId === medicineId);

    const items = [...cart.items];
    if (existingIndex >= 0) {
      items[existingIndex] = {
        ...items[existingIndex],
        quantity: items[existingIndex].quantity + qty
      };
    } else {
      items.push({
        medicineId: med.id,
        name: med.name,
        quantity: qty,
        unitPrice: med.price
      });
    }

    await saveUserCart(cart, items);
    res.status(201).json(computeCartSummary(items));
  } catch (err) { next(err); }
});

router.patch('/cart/items/:medicineId', requireAuth, async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 0) return res.status(400).json({ error: 'quantity must be a non-negative integer' });

    const cart = await getUserCart(req.user.id);
    let items = [...cart.items];
    const index = items.findIndex(i => i.medicineId === req.params.medicineId);
    if (index === -1) return res.status(404).json({ error: 'Item not in cart' });

    if (qty === 0) {
      items.splice(index, 1);
    } else {
      items[index] = { ...items[index], quantity: qty };
    }

    await saveUserCart(cart, items);
    res.json(computeCartSummary(items));
  } catch (err) { next(err); }
});

router.delete('/cart/items/:medicineId', requireAuth, async (req, res, next) => {
  try {
    const cart = await getUserCart(req.user.id);
    const items = cart.items.filter(i => i.medicineId !== req.params.medicineId);
    await saveUserCart(cart, items);
    res.json(computeCartSummary(items));
  } catch (err) { next(err); }
});

router.delete('/cart', requireAuth, async (req, res, next) => {
  try {
    const cart = await getUserCart(req.user.id);
    await saveUserCart(cart, []);
    res.json({ cleared: true, ...computeCartSummary([]) });
  } catch (err) { next(err); }
});

router.post('/cart/checkout', requireAuth, async (req, res, next) => {
  try {
    const cart = await getUserCart(req.user.id);
    if (!cart.items || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const total = cart.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

    let order;
    if (mongoose.connection.readyState === 1) {
      order = await Order.create({ userId: req.user.id, items: cart.items, total });
    } else {
      order = {
        _id: `mock-order-${Date.now()}`,
        userId: req.user.id,
        items: cart.items,
        total,
        status: 'PLACED',
        createdAt: new Date().toISOString()
      };
    }

    // Clear cart upon successful checkout
    await saveUserCart(cart, []);

    res.status(201).json({ order, message: 'Order placed successfully from cart' });
  } catch (err) { next(err); }
});

// ================= Direct Orders =================

router.post('/orders', requireAuth, async (req, res, next) => {
  try {
    const catalog = await getCatalog();
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: 'items is required' });

    const normalized = items.map(item => {
      const med = catalog.find(m => m.id === item.medicineId || m.medicineId === item.medicineId || m._id === item.medicineId);
      if (!med) throw Object.assign(new Error(`Unknown medicine: ${item.medicineId}`), { status: 400 });
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) throw Object.assign(new Error('quantity must be a positive integer'), { status: 400 });
      return { medicineId: med.id, name: med.name, quantity, unitPrice: med.price };
    });

    const total = normalized.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

    if (mongoose.connection.readyState === 1) {
      const order = await Order.create({ userId: req.user.id, items: normalized, total });
      return res.status(201).json({ order });
    }

    // Offline / mock development fallback when MongoDB is not running
    const mockOrder = {
      _id: `mock-order-${Date.now()}`,
      userId: req.user.id,
      items: normalized,
      total,
      status: 'PLACED',
      createdAt: new Date().toISOString()
    };
    res.status(201).json({ order: mockOrder, mode: 'offline_mock' });
  } catch (err) { next(err); }
});

router.get('/orders', requireAuth, async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
      return res.json({ items: orders });
    }
    res.json({ items: [], mode: 'offline_mock' });
  } catch (err) { next(err); }
});

router.get('/orders/:id', requireAuth, async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const order = await Order.findOne({ _id: req.params.id, userId: req.user.id });
      if (!order) return res.status(404).json({ error: 'Order not found' });
      return res.json({ order });
    }
    res.status(404).json({ error: 'Order not found' });
  } catch (err) { next(err); }
});

router.post('/orders/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const order = await Order.findOne({ _id: req.params.id, userId: req.user.id });
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.status === 'CANCELLED') {
        return res.status(400).json({ error: 'Order is already cancelled' });
      }
      order.status = 'CANCELLED';
      await order.save();
      return res.json({ order });
    }
    res.status(503).json({ error: 'Database unavailable: MongoDB is not connected' });
  } catch (err) { next(err); }
});

module.exports = router;


