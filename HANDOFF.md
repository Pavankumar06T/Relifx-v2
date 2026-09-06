# ReLifeX Teammate Schema Integration & Handoff Contract

**Document Version:** 1.0.0  
**Target Audience:** Teammate #1 (Auth / User Profile / Baseline) & Teammate #2 (Health Tracking / Habits / Log Engine)  
**Owned Scope:** AI Service (`relifex_ai_service`) + Flutter Mobile Frontend (`relifex_app`)

---

## 1. Executive Summary & Integration Architecture

The AI Service backend (`relifex_ai_service`) consumes user health baseline data, daily logs, and habit records to generate personalized AI Daily Insights, run RAG Chat responses, and process vision meal parsing.

To decouple AI development from ongoing database schema design, all data access in `relifex_ai_service` is isolated inside a single file:
👉 [mockRepository.js](file:///e:/ReLifeX%20-%20V2/relifex_ai_service/src/services/mockRepository.js)

**When your real Mongoose models / MongoDB collections are finalized, swapping in live data queries requires editing ONLY `mockRepository.js`.**

---

## 2. Expected Data Contracts (Schemas)

### A. User Baseline Schema (Teammate #1 Scope)
Used by `mockRepository.getUserBaseline(userId)`.

```javascript
{
  userId: String,               // Required - unique user identifier (e.g. "user_123")
  diabetesType: String,         // Required - 'Type 2 Diabetes', 'Type 1 Diabetes', 'Pre-diabetes', 'Gestational Diabetes'
  medicationList: [             // Required - array of prescription medications
    {
      name: String,             // e.g. "Metformin"
      dosage: String,           // e.g. "500mg"
      frequency: String         // e.g. "Twice daily with meals"
    }
  ],
  sleepScheduleTarget: String,  // e.g. "7-8 hours (11 PM - 7 AM)"
  dietPattern: String,          // e.g. "Moderate Carb & Mediterranean", "Low-GI"
  targetGlucoseRange: {         // Required - target range boundaries for AI evidence matching
    fastingMin: Number,         // e.g. 80
    fastingMax: Number,         // e.g. 110
    postMealMax: Number         // e.g. 140
  },
  healthGoal: String            // Primary 66-day target goal description
}
```

---

### B. DailyLog Schema (Teammate #2 Scope)
Used by `mockRepository.getTodayLog(userId)` and `mockRepository.getSevenDayHistory(userId)`.

```javascript
{
  logId: String,                // Unique log entry identifier
  userId: String,               // Foreign key matching UserBaseline.userId
  date: String,                 // Required ISO Date String format: 'YYYY-MM-DD'
  glucoseReadings: [            // Array of glucose entries
    {
      value: Number,            // Blood glucose value in mg/dL (e.g. 108)
      tag: String,              // Context tag: 'Fasting', 'Post-Breakfast', 'Post-Lunch', 'Post-Dinner', 'Pre-Bed', 'Random'
      timestamp: Date           // Date object
    }
  ],
  mealLogs: [                   // Array of logged meals
    {
      mealType: String,         // 'Breakfast', 'Lunch', 'Dinner', 'Snack'
      dishName: String,         // e.g. "Quinoa Bowl with Chicken"
      estimatedCarbsGrams: Number, // Estimated carbs in grams
      glycemicIndexTag: String, // 'Low', 'Medium', 'High'
      photoUrl: String          // Optional photo URL
    }
  ],
  medicationChecks: [           // Check-off records
    {
      medicationName: String,   // e.g. "Metformin 500mg"
      takenAt: Date,
      checked: Boolean
    }
  ],
  activityMinutes: Number,      // Physical activity duration in minutes (e.g. 25)
  activityType: String,         // e.g. "Brisk Walk", "Cycling", "None"
  sleepDurationHours: Number,   // Total sleep duration in hours (e.g. 7.5)
  stressLevel: Number           // Subjective rating from 1 (Calm) to 5 (High Stress)
}
```

---

### C. Habit & 66-Day Journey Schema (Teammate #2 Scope)
Used by `journeyProvider` in the Flutter mobile app.

```javascript
{
  userId: String,               // Foreign key
  habitName: String,            // "66-Day Metabolic Habit Transformation"
  targetDays: Number,           // 66
  currentStreak: Number,        // Number of consecutive active logging days (e.g. 14)
  completionHistory: [          // 66-element boolean array or status object array
    {
      dayNumber: Number,        // 1 to 66
      date: String,             // 'YYYY-MM-DD'
      completed: Boolean        // True if daily checklist threshold met
    }
  ]
}
```

---

## 3. How to Swap from Mock to Live MongoDB Models

When your Mongoose models (`UserModel`, `DailyLogModel`, `HabitModel`) are exported and ready:

1. Open `e:/ReLifeX - V2/relifex_ai_service/src/services/mockRepository.js`.
2. Import your Mongoose models at the top of the file:
   ```javascript
   const UserModel = require('../models/User.model');
   const DailyLogModel = require('../models/DailyLog.model');
   ```
3. Replace the mock return objects inside the three functions:
   - `getUserBaseline(userId)` -> `return await UserModel.findOne({ userId });`
   - `getTodayLog(userId)` -> `return await DailyLogModel.findOne({ userId, date: todayDateStr });`
   - `getSevenDayHistory(userId)` -> `return await DailyLogModel.find({ userId }).sort({ date: -1 }).limit(7);`

---

## 5. RAG Vector Search Distance Threshold & Guardrails

The RAG pipeline in `rag.service.js` enforces an explicit vector distance threshold on all ChromaDB queries:
- **Enforced Threshold**: `distanceScore <= 0.80` (Cosine / L2 distance).
- **Behavior**:
  - `distanceScore <= 0.80` -> Accepted as live vector match (`groundedMode: "live_chromadb"`).
  - `distanceScore > 0.80` -> Rejected as a weak/irrelevant match, returning `grounded: false` and `groundedMode: "ungrounded"`.

### Distance Scores Reference:
- **Covered Domain Query** (e.g. GLUT4 post-meal walk): `0.6626` (Accepted ✅)
- **Adjacent Uncovered Query** (e.g. SGLT2 renal mechanism): `1.4283` (Rejected ❌)
- **Out of Scope Query** (e.g. Capital / World Cup): `1.9512` (Rejected ❌)

---

## 6. Strict Contract Rules (What NOT to Change)

> [!CAUTION]
> **DO NOT modify the following integration contracts:**
> 1. **Endpoint Paths & HTTP Methods**:
>    - `POST /ai/insights/daily` (Daily Insights & Fitness/Exercise Correlations)
>    - `POST /ai/insights/weekly-recap` (Weekly Recap Summaries)
>    - `POST /ai/chat` (RAG Knowledge Base Assistant)
>    - `POST /ai/meal-parse` (Gemini Vision Meal Analyzer)
>    - `GET /health` (Service Health Check)
> 2. **JSON Response Shapes**:
>    - `/ai/insights/daily` MUST return `{ insight, evidence, suggestion }`.
>    - `/ai/insights/weekly-recap` MUST return `{ streakCount, bestDay, notablePattern, oneWin }`.
>    - `/ai/chat` MUST return `{ reply, grounded, groundedMode, retrievedChunks, sources }`.
>    - `/ai/meal-parse` MUST return `{ parseSuccess, dishName, estimatedCarbsGrams, glycemicIndex, glycemicLoad, confidenceScore, nutritionTip }`.
> 3. **Fitness & Activity Logging Contract**:
>    - `activityMinutes` (Number) and `activityType` (String) in `DailyLog` drive both `/ai/insights/daily` fitness correlations and `/ai/insights/weekly-recap`.
> 4. **RAG Threshold**: Maintain `distanceScore <= 0.80` in `rag.service.js` to prevent hallucinated citations on weakly-related queries.

Following this contract guarantees zero breaking changes on both the AI service backend and the Flutter mobile frontend.
