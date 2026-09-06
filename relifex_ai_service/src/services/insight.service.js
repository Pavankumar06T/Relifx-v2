const mockRepository = require('./mockRepository');
const geminiService = require('./gemini.service');

class InsightService {
  /**
   * Run daily insight analysis for a user or scenario
   */
  async generateDailyInsight(userId, scenarioId = 'default') {
    const userBaseline = await mockRepository.getUserBaseline(userId, scenarioId);
    const todayLog = await mockRepository.getTodayLog(userId, scenarioId);
    const sevenDayHistory = await mockRepository.getSevenDayHistory(userId, scenarioId);

    const contextData = `
USER PROFILE:
- Diagnosis: ${userBaseline.diabetesType}
- Target Glucose Range: ${userBaseline.targetGlucoseRange.fastingMin}-${userBaseline.targetGlucoseRange.fastingMax} mg/dL (Fasting), <${userBaseline.targetGlucoseRange.postMealMax} mg/dL (Post-Meal)
- Prescribed Medications: ${userBaseline.medicationList.map(m => `${m.name} ${m.dosage}`).join(', ')}
- Goal: ${userBaseline.healthGoal}

TODAY LOG:
- Glucose: ${JSON.stringify(todayLog.glucoseReadings)}
- Meals: ${JSON.stringify(todayLog.mealLogs)}
- Exercise: ${todayLog.activityMinutes} mins (${todayLog.activityType || 'N/A'})
- Sleep: ${todayLog.sleepDurationHours} hrs, Stress Level: ${todayLog.stressLevel}/5

7-DAY LOG HISTORY:
${JSON.stringify(sevenDayHistory, null, 2)}
`;

    const prompt = `
Analyze the user's 7-day metabolic history alongside today's daily log.

STRICT CORRELATIONAL LANGUAGE RULES:
1. Use ONLY correlational language ("coincided with", "was associated with", "logged alongside", "correlated with").
2. DO NOT state unmeasured physiological mechanisms (e.g. "cortisol release", "insulin sensitivity changes", "growth hormone spikes") as established facts. State only observed associations between logged metrics.
3. SCHEMA CONSTRAINT: The "suggestion" field must ONLY reference metrics that exist in the input schema (e.g. total sleep hours, activity minutes, meal carbs/GI rating, stress ratings). DO NOT invent unlogged specifics like "go to bed at 11 PM" or "take a walk at 7:30 PM" since clock times for bed/walk are not in the schema.

CRITICAL TRUTHFULNESS RULE FOR NO-PATTERN / SPARSE DATA:
If the 7-day log history lacks a consistent pattern (erratic data) OR is missing/incomplete (fewer than 3 full days logged):
- State honestly in "insight" that no clear correlation can be established yet from the available data.
- State in "evidence" that logs are either too sparse or show high variability without a clear correlation.
- Suggest in "suggestion" to log meals, glucose, and sleep consistently over the next 3-5 days.

FITNESS & WORKOUT CORRELATION RULES:
- Evaluate how post-meal or daily glucose readings coincided with logged activity minutes (activityMinutes) and workout types (activityType).
- Use strictly correlational language (e.g. "logging 35 minutes of physical activity coincided with post-meal glucose remaining within target range").
- If 0 activity minutes are logged across the week (sedentary), state the observed association neutrally without scolding or assuming unlogged activity.
- If activity logs are sparse or incomplete (fewer than 2 active days logged), state honestly that physical activity data is too sparse to establish an exercise-glucose correlation.

MEDICAL SAFETY:
- Do NOT suggest changing prescription medication dosages or give diagnostic verdicts.

Return ONLY a valid JSON object matching:
{
  "insight": "Correlational statement based strictly on logged metrics OR honest no-pattern statement",
  "evidence": "Observed data points from 7-day logs OR note on data variability/sparsity",
  "suggestion": "Actionable lifestyle micro-action referencing ONLY metrics present in the schema"
}
`;

    const result = await geminiService.generateJSON({
      prompt: prompt,
      context: contextData,
      scenarioId: scenarioId,
      temperature: 0.3,
    });

    return result;
  }

  /**
   * Generate Weekly Recap Insight ({ streakCount, bestDay, notablePattern, oneWin })
   */
  async generateWeeklyRecap(userId, scenarioId = 'default') {
    const recapData = await mockRepository.getWeeklyRecapData(userId, scenarioId);

    const contextData = `
WEEKLY CHECK-IN RECAP DATA:
- Active Habit Streak: ${recapData.streakCount} days
- Total Days Logged This Week: ${recapData.loggedDaysCount} / 7 days
- Best Day Metric: ${recapData.bestDay}

DAILY INSIGHTS HISTORY THIS WEEK:
${JSON.stringify(recapData.dailyInsightsHistory, null, 2)}
`;

    const prompt = `
Generate a weekly recap summary for the user based strictly on their week's daily insights history and check-in count.

STRICT CONSTRAINTS:
1. "notablePattern" must pull from the most consistent or significant daily insight of the week, NOT a full re-analysis.
2. "oneWin" MUST state ONLY what is directly supported by the input data (such as streak count, days logged, or specific glucose/habit readings).
3. "oneWin" MUST NOT invent reasons, excuses, unlogged factors, or external context for gaps in logging (e.g. NEVER write "despite a busy schedule", "despite stress", or assume why days were missed).
4. For rough or low-adherence weeks, "oneWin" must be a true, neutral, and factual positive grounded in the actual logged data (e.g., "You logged 2 days this week, keeping your habit streak active"). Never fabricate unearned praise or assume unlogged causes.
5. Return ONLY a valid JSON object matching:
{
  "streakCount": Number,
  "bestDay": "String",
  "notablePattern": "String",
  "oneWin": "String"
}
`;

    const result = await geminiService.generateWeeklyRecapJSON({
      prompt: prompt,
      context: contextData,
      scenarioId: scenarioId,
      temperature: 0.35,
    });

    return result;
  }
}

module.exports = new InsightService();
