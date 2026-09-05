const router = require('express').Router();

const mongoose = require('mongoose');

router.get('/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const dbStatus = states[mongoose.connection.readyState] || 'unknown';
  res.json({
    service: 'relifex-anurag-integrations',
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: {
      status: dbStatus,
      connected: mongoose.connection.readyState === 1
    }
  });
});

module.exports = router;
