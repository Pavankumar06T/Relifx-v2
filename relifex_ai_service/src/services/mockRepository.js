/**
 * MOCK REPOSITORY LAYER - SCENARIO-AWARE
 * Supports 8 daily scenarios + 3 weekly recap scenarios.
 */

class MockRepository {
  async getUserBaseline(userId, scenarioId = 'default') {
    return {
      userId: userId || 'user_mock_123',
      diabetesType: 'Type 2 Diabetes',
      medicationList: [{ name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' }],
      sleepScheduleTarget: '7-8 hours (11 PM - 7 AM)',
      dietPattern: 'Moderate Carb & Mediterranean',
      targetGlucoseRange: { fastingMin: 80, fastingMax: 110, postMealMax: 140 },
      healthGoal: 'Maintain Fasting Glucose < 110 mg/dL',
    };
  }

  async getTodayLog(userId, scenarioId = 'default') {
    const activeScenario = scenarioId !== 'default' ? scenarioId : this._resolveScenarioFromUserId(userId);
    const today = new Date().toISOString().split('T')[0];

    switch (activeScenario) {
      case 'fitness_mixed_sparse':
      case 'missing_incomplete_logs':
      case 'weekly_rough_week':
        return {
          logId: `log_${today}`,
          userId: userId,
          date: today,
          glucoseReadings: [],
          mealLogs: [],
          medicationChecks: [],
          activityMinutes: 0,
          sleepDurationHours: 0,
          stressLevel: 0,
        };

      case 'fitness_consistent_exerciser':
        return {
          logId: `log_${today}`,
          userId: userId,
          date: today,
          glucoseReadings: [
            { value: 98, tag: 'Fasting', timestamp: new Date(Date.now() - 14400000) },
            { value: 120, tag: 'Post-Lunch', timestamp: new Date(Date.now() - 3600000) },
          ],
          mealLogs: [
            { mealType: 'Lunch', dishName: 'Grilled Chicken Salad', estimatedCarbsGrams: 30, glycemicIndexTag: 'Low' },
          ],
          medicationChecks: [{ medicationName: 'Metformin 500mg', checked: true }],
          activityMinutes: 35,
          activityType: 'Brisk Walk',
          sleepDurationHours: 7.8,
          stressLevel: 2,
        };

      case 'fitness_sedentary_week':
        return {
          logId: `log_${today}`,
          userId: userId,
          date: today,
          glucoseReadings: [
            { value: 116, tag: 'Fasting', timestamp: new Date(Date.now() - 14400000) },
            { value: 165, tag: 'Post-Lunch', timestamp: new Date(Date.now() - 3600000) },
          ],
          mealLogs: [
            { mealType: 'Lunch', dishName: 'Pasta', estimatedCarbsGrams: 60, glycemicIndexTag: 'High' },
          ],
          medicationChecks: [{ medicationName: 'Metformin 500mg', checked: true }],
          activityMinutes: 0,
          activityType: 'None',
          sleepDurationHours: 7.0,
          stressLevel: 3,
        };

      case 'high_post_dinner_carbs':
        return {
          logId: `log_${today}`,
          userId: userId,
          date: today,
          glucoseReadings: [
            { value: 106, tag: 'Fasting', timestamp: new Date(Date.now() - 14400000) },
            { value: 172, tag: 'Post-Dinner', timestamp: new Date(Date.now() - 3600000) },
          ],
          mealLogs: [
            { mealType: 'Dinner', dishName: 'White Rice Bowl with Sweet Sauce', estimatedCarbsGrams: 78, glycemicIndexTag: 'High' },
          ],
          medicationChecks: [{ medicationName: 'Metformin 500mg', checked: true }],
          activityMinutes: 0,
          sleepDurationHours: 7.2,
          stressLevel: 2,
        };

      default:
        return {
          logId: `log_${today}`,
          userId: userId,
          date: today,
          glucoseReadings: [
            { value: 105, tag: 'Fasting', timestamp: new Date(Date.now() - 14400000) },
            { value: 132, tag: 'Post-Breakfast', timestamp: new Date(Date.now() - 7200000) },
          ],
          mealLogs: [
            { mealType: 'Breakfast', dishName: 'Oatmeal with Almonds', estimatedCarbsGrams: 30, glycemicIndexTag: 'Low' },
          ],
          medicationChecks: [{ medicationName: 'Metformin 500mg', checked: true }],
          activityMinutes: 20,
          activityType: 'Brisk Walk',
          sleepDurationHours: 7.5,
          stressLevel: 2,
        };
    }
  }

  async getSevenDayHistory(userId, scenarioId = 'default') {
    const activeScenario = scenarioId !== 'default' ? scenarioId : this._resolveScenarioFromUserId(userId);
    const now = new Date();

    switch (activeScenario) {
      case 'high_post_dinner_carbs':
        return Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now); d.setDate(d.getDate() - (i + 1));
          return {
            date: d.toISOString().split('T')[0],
            glucoseReadings: [
              { value: 102 + (i % 3), tag: 'Fasting' },
              { value: 168 + (i * 2), tag: 'Post-Dinner' },
            ],
            mealLogs: [
              { mealType: 'Dinner', dishName: 'Refined White Rice & Fried Noodles', estimatedCarbsGrams: 75, glycemicIndexTag: 'High' },
            ],
            activityMinutes: 0,
            sleepDurationHours: 7.5,
            stressLevel: 2,
          };
        });

      case 'noisy_no_pattern':
        const randomVals = [115, 142, 98, 155, 108, 134, 121];
        const randomMeals = ['Salad', 'Burger', 'Soup', 'Pizza', 'Fish', 'Pasta', 'Steak'];
        return Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now); d.setDate(d.getDate() - (i + 1));
          return {
            date: d.toISOString().split('T')[0],
            glucoseReadings: [{ value: randomVals[i], tag: i % 2 === 0 ? 'Fasting' : 'Random' }],
            mealLogs: [{ mealType: 'Mixed', dishName: randomMeals[i], estimatedCarbsGrams: 20 + i * 8, glycemicIndexTag: 'Medium' }],
            activityMinutes: (i * 13) % 40,
            sleepDurationHours: 5.5 + (i % 4),
            stressLevel: (i % 5) + 1,
          };
        });

      case 'missing_incomplete_logs':
      case 'weekly_rough_week':
        return [
          {
            date: new Date(now.getTime() - 86400000).toISOString().split('T')[0],
            glucoseReadings: [{ value: 110, tag: 'Random' }],
            mealLogs: [],
            activityMinutes: 0,
            sleepDurationHours: 0,
            stressLevel: 0,
          },
          {
            date: new Date(now.getTime() - 4 * 86400000).toISOString().split('T')[0],
            glucoseReadings: [],
            mealLogs: [{ mealType: 'Lunch', dishName: 'Sandwich', estimatedCarbsGrams: 40 }],
            activityMinutes: 0,
            sleepDurationHours: 6,
            stressLevel: 3,
          },
        ];

      case 'weekly_strong_week':
      case 'clear_positive_trend':
        const fastingTrend = [135, 128, 120, 112, 105, 99, 94];
        return Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now); d.setDate(d.getDate() - (7 - i));
          return {
            date: d.toISOString().split('T')[0],
            glucoseReadings: [
              { value: fastingTrend[i], tag: 'Fasting' },
              { value: fastingTrend[i] + 25, tag: 'Post-Dinner' },
            ],
            mealLogs: [{ mealType: 'Dinner', dishName: 'Steamed Fish & Broccoli', estimatedCarbsGrams: 25, glycemicIndexTag: 'Low' }],
            activityMinutes: 20 + i * 3,
            sleepDurationHours: 7.5,
            stressLevel: 2,
          };
        });

      case 'post_dinner_walk_positive':
        return Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now); d.setDate(d.getDate() - (i + 1));
          const walked = i % 2 === 0;
          return {
            date: d.toISOString().split('T')[0],
            glucoseReadings: [{ value: 104, tag: 'Fasting' }, { value: walked ? 124 : 162, tag: 'Post-Dinner' }],
            mealLogs: [{ mealType: 'Dinner', dishName: 'Chicken Quinoa Bowl', estimatedCarbsGrams: 45, glycemicIndexTag: 'Medium' }],
            activityMinutes: walked ? 25 : 0,
            activityType: walked ? 'Evening Walk' : 'None',
            sleepDurationHours: 7.5,
            stressLevel: 2,
          };
        });

      case 'sleep_deprivation_fasting_spike':
        return Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now); d.setDate(d.getDate() - (i + 1));
          const poorSleep = i % 2 === 0;
          return {
            date: d.toISOString().split('T')[0],
            glucoseReadings: [{ value: poorSleep ? 138 : 102, tag: 'Fasting' }, { value: 130, tag: 'Post-Lunch' }],
            mealLogs: [{ mealType: 'Lunch', dishName: 'Turkey Wrap', estimatedCarbsGrams: 35, glycemicIndexTag: 'Low' }],
            activityMinutes: 15,
            sleepDurationHours: poorSleep ? 5.0 : 7.8,
            stressLevel: poorSleep ? 4 : 2,
          };
        });

      case 'high_stress_spike':
        return Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now); d.setDate(d.getDate() - (i + 1));
          const highStress = i < 4;
          return {
            date: d.toISOString().split('T')[0],
            glucoseReadings: [{ value: highStress ? 142 : 105, tag: 'Fasting' }, { value: highStress ? 165 : 128, tag: 'Post-Lunch' }],
            mealLogs: [{ mealType: 'Lunch', dishName: 'Green Salad with Chicken', estimatedCarbsGrams: 20, glycemicIndexTag: 'Low' }],
            activityMinutes: 20,
            sleepDurationHours: 7.0,
            stressLevel: highStress ? 5 : 2,
          };
        });

      case 'weekly_mixed_week':
        return Array.from({ length: 5 }, (_, i) => {
          const d = new Date(now); d.setDate(d.getDate() - (i + 1));
          return {
            date: d.toISOString().split('T')[0],
            glucoseReadings: [{ value: 102 + (i % 4) * 4, tag: 'Fasting' }, { value: 130 + (i % 3) * 6, tag: 'Post-Lunch' }],
            mealLogs: [{ mealType: 'Lunch', dishName: 'Mediterranean Chickpea Salad', estimatedCarbsGrams: 34, glycemicIndexTag: 'Low' }],
            activityMinutes: 15 + i * 5,
            sleepDurationHours: 7.0,
            stressLevel: 2,
          };
        });

      case 'fitness_consistent_exerciser':
        return Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now); d.setDate(d.getDate() - (i + 1));
          return {
            date: d.toISOString().split('T')[0],
            glucoseReadings: [{ value: 100, tag: 'Fasting' }, { value: 122, tag: 'Post-Lunch' }],
            mealLogs: [{ mealType: 'Lunch', dishName: 'Chicken Salad', estimatedCarbsGrams: 35, glycemicIndexTag: 'Low' }],
            activityMinutes: 35,
            activityType: 'Brisk Walking / Cycling',
            sleepDurationHours: 7.5,
            stressLevel: 2,
          };
        });

      case 'fitness_sedentary_week':
        return Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now); d.setDate(d.getDate() - (i + 1));
          return {
            date: d.toISOString().split('T')[0],
            glucoseReadings: [{ value: 118, tag: 'Fasting' }, { value: 168, tag: 'Post-Lunch' }],
            mealLogs: [{ mealType: 'Lunch', dishName: 'Pasta Primavera', estimatedCarbsGrams: 65, glycemicIndexTag: 'High' }],
            activityMinutes: 0,
            activityType: 'None',
            sleepDurationHours: 7.0,
            stressLevel: 3,
          };
        });

      case 'fitness_mixed_sparse':
        return [
          {
            date: new Date(now.getTime() - 86400000).toISOString().split('T')[0],
            glucoseReadings: [{ value: 112, tag: 'Fasting' }, { value: 145, tag: 'Post-Lunch' }],
            mealLogs: [{ mealType: 'Lunch', dishName: 'Rice & Curry', estimatedCarbsGrams: 50 }],
            activityMinutes: 15,
            activityType: 'Light Walk',
            sleepDurationHours: 6.5,
            stressLevel: 3,
          },
          {
            date: new Date(now.getTime() - 3 * 86400000).toISOString().split('T')[0],
            glucoseReadings: [{ value: 120, tag: 'Fasting' }],
            mealLogs: [],
            activityMinutes: 0,
            activityType: 'None',
            sleepDurationHours: 7.0,
            stressLevel: 2,
          },
        ];

      case 'low_gi_mediterranean_success':
      default:
        return Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now); d.setDate(d.getDate() - (i + 1));
          return {
            date: d.toISOString().split('T')[0],
            glucoseReadings: [{ value: 96 + (i % 3), tag: 'Fasting' }, { value: 118 + (i % 4), tag: 'Post-Lunch' }],
            mealLogs: [{ mealType: 'Lunch', dishName: 'Mediterranean Chickpea & Olive Bowl', estimatedCarbsGrams: 32, glycemicIndexTag: 'Low' }],
            activityMinutes: 30,
            sleepDurationHours: 8.0,
            stressLevel: 1,
          };
        });
    }
  }

  /**
   * Get Weekly Recap Input Data (7-day insights history + habit streak data)
   */
  async getWeeklyRecapData(userId, scenarioId = 'default') {
    const activeScenario = scenarioId !== 'default' ? scenarioId : this._resolveScenarioFromUserId(userId);

    switch (activeScenario) {
      case 'weekly_strong_week':
        return {
          userId: userId,
          streakCount: 14,
          loggedDaysCount: 7,
          bestDay: 'Friday (94 mg/dL Fasting)',
          dailyInsightsHistory: [
            { day: 'Monday', insight: 'Logging 20+ minutes of post-dinner walking was associated with lower post-prandial glucose.' },
            { day: 'Tuesday', insight: 'Fasting glucose readings coincided with a steady downward trajectory.' },
            { day: 'Wednesday', insight: 'Low-GI Mediterranean meals were associated with post-meal glucose remaining in target.' },
            { day: 'Thursday', insight: 'Logging 25 minutes of evening movement coincided with a 124 mg/dL post-dinner peak.' },
            { day: 'Friday', insight: 'Fasting glucose reached an optimal 94 mg/dL following consistent low-GI dinners.' },
            { day: 'Saturday', insight: 'Post-dinner walking coincided with stable glucose curves.' },
            { day: 'Sunday', insight: 'Weekly metabolic consistency kept fasting glucose below 100 mg/dL.' },
          ],
        };

      case 'weekly_mixed_week':
        return {
          userId: userId,
          streakCount: 4,
          loggedDaysCount: 5,
          bestDay: 'Wednesday (98 mg/dL Fasting)',
          dailyInsightsHistory: [
            { day: 'Monday', insight: 'Lower GI Mediterranean meal selections coincided with stable post-lunch readings.' },
            { day: 'Tuesday', insight: 'No log recorded.' },
            { day: 'Wednesday', insight: 'Fasting glucose reached 98 mg/dL on 7 hours of sleep.' },
            { day: 'Thursday', insight: 'Post-meal walking coincided with 132 mg/dL peak.' },
            { day: 'Friday', insight: 'No log recorded.' },
          ],
        };

      case 'weekly_rough_week':
      default:
        return {
          userId: userId,
          streakCount: 1,
          loggedDaysCount: 2,
          bestDay: 'Tuesday (108 mg/dL Fasting)',
          dailyInsightsHistory: [
            { day: 'Tuesday', insight: 'Logged fasting glucose of 108 mg/dL.' },
            { day: 'Friday', insight: 'Logged sandwich lunch meal.' },
          ],
        };
    }
  }

  _resolveScenarioFromUserId(userId) {
    if (!userId) return 'default';
    if (userId.startsWith('scenario_')) return userId.replace('scenario_', '');
    return 'default';
  }
}

module.exports = new MockRepository();
