const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');

// Nightly / Daily insight job trigger
router.post('/insights/daily', (req, res) => aiController.getDailyInsights(req, res));

// Weekly Recap insight generator
router.post('/insights/weekly-recap', (req, res) => aiController.getWeeklyRecap(req, res));

// RAG-grounded Q&A Chat endpoint
router.post('/chat', (req, res) => aiController.postChat(req, res));

// Vision Meal Parser endpoint
router.post('/meal-parse', (req, res) => aiController.parseMeal(req, res));

module.exports = router;
