require('dotenv').config();
const express = require('express');
const cors = require('cors');
const aiRoutes = require('./routes/ai.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ReLifeX AI Health Intelligence Service',
    timestamp: new Date().toISOString(),
    aiEngine: 'Gemini 2.0 Flash',
  });
});

// AI Routes
app.use('/ai', aiRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` ReLifeX AI Intelligence Service running on port ${PORT}`);
    console.log(` Health Check: http://localhost:${PORT}/health`);
    console.log(` Daily Insights: POST http://localhost:${PORT}/ai/insights/daily`);
    console.log(` RAG Chat: POST http://localhost:${PORT}/ai/chat`);
    console.log(` Meal Vision: POST http://localhost:${PORT}/ai/meal-parse`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
