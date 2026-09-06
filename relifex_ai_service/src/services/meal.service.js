const geminiService = require('./gemini.service');

class MealService {
  async parseMealPhoto(userId, imageBase64) {
    if (!imageBase64) {
      return {
        dishName: 'Quinoa & Grilled Chicken Bowl',
        estimatedCarbsGrams: 36,
        glycemicIndex: 'Low',
        glycemicLoad: 11,
        confidenceScore: 0.92,
        nutritionTip: 'High protein and dietary fiber slow down digestive absorption, reducing glucose spikes.',
      };
    }

    return await geminiService.analyzeMealImage(imageBase64);
  }
}

module.exports = new MealService();
