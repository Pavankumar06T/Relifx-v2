const insightService = require('../services/insight.service');
const ragService = require('../services/rag.service');
const mealService = require('../services/meal.service');

class AIController {
  /**
   * POST /ai/insights/daily
   */
  async getDailyInsights(req, res) {
    try {
      const { userId, scenarioId } = req.body;
      const result = await insightService.generateDailyInsight(userId || 'user_mock_123', scenarioId || 'default');
      return res.status(200).json(result);
    } catch (error) {
      console.error('[AIController getDailyInsights error]:', error);
      return res.status(500).json({
        error: 'Failed to generate daily insight',
        message: error.message,
      });
    }
  }

  /**
   * POST /ai/insights/weekly-recap
   */
  async getWeeklyRecap(req, res) {
    try {
      const { userId, scenarioId } = req.body;
      const result = await insightService.generateWeeklyRecap(userId || 'user_mock_123', scenarioId || 'default');
      return res.status(200).json(result);
    } catch (error) {
      console.error('[AIController getWeeklyRecap error]:', error);
      return res.status(500).json({
        error: 'Failed to generate weekly recap',
        message: error.message,
      });
    }
  }

  /**
   * POST /ai/chat
   */
  async postChat(req, res) {
    try {
      const { userId, message } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message payload is required' });
      }

      const result = await ragService.processGroundedChat(userId || 'user_mock_123', message);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[AIController postChat error]:', error);
      return res.status(500).json({
        error: 'Failed to process chat query',
        message: error.message,
      });
    }
  }

  /**
   * POST /ai/meal-parse
   */
  async parseMeal(req, res) {
    try {
      const { userId, imageBase64 } = req.body;
      const result = await mealService.parseMealPhoto(userId || 'user_mock_123', imageBase64);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[AIController parseMeal error]:', error);
      return res.status(500).json({
        error: 'Failed to parse meal image',
        message: error.message,
      });
    }
  }
}

module.exports = new AIController();
