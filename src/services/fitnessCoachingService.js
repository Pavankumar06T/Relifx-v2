import { GoogleGenAI } from "@google/genai";
import User from "../models/User.js";
import DailyLog from "../models/DailyLog.js";
import { getFitnessSummary } from "./fitnessService.js";

// Default Gemini model. Overridable via GEMINI_MODEL so it can be tuned
// without a code change (e.g. to point at a newer/cheaper Gemini model).
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// How far back "recent" fitness/health context looks for coaching purposes.
const COACHING_WINDOW_DAYS = 7;

// Upper bound on how long we'll wait on Gemini before failing the request
// rather than hanging the HTTP connection open indefinitely.
const GEMINI_TIMEOUT_MS = 20000;

// Explicit allow-list for the optional request body. Nothing outside this
// list is ever forwarded to Gemini or stored - this is what stops a client
// from smuggling arbitrary free-text prompt content through the API.
const MAX_FIELD_LENGTH = 200;

let geminiClient = null;

/**
 * Lazily construct the Gemini client. Deferred (rather than constructed at
 * module load) so a missing GEMINI_API_KEY doesn't crash server startup -
 * it only surfaces as a controlled error the first time coaching is
 * actually requested.
 */
const getGeminiClient = () => {
  if (geminiClient) return geminiClient;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = new Error("AI coaching service is not configured");
    error.statusCode = 503;
    throw error;
  }

  geminiClient = new GoogleGenAI({ apiKey });
  return geminiClient;
};

/**
 * Validate and normalize the optional coaching request body into an
 * explicit allow-listed set of fields. Anything not listed here is
 * silently dropped, and no raw/arbitrary prompt text is ever accepted -
 * this mirrors the allow-list validation pattern already used throughout
 * the project (see medicineService.js, dailyLogService.js, etc.).
 */
const buildAllowedRequestFields = (body = {}) => {
  const { goal, focus } = body;
  const fields = {};

  if (goal !== undefined && goal !== null) {
    if (typeof goal !== "string") {
      const error = new Error("goal must be a string");
      error.statusCode = 400;
      throw error;
    }
    const trimmed = goal.trim();
    if (trimmed.length > MAX_FIELD_LENGTH) {
      const error = new Error(`goal cannot exceed ${MAX_FIELD_LENGTH} characters`);
      error.statusCode = 400;
      throw error;
    }
    if (trimmed) fields.goal = trimmed;
  }

  if (focus !== undefined && focus !== null) {
    if (typeof focus !== "string") {
      const error = new Error("focus must be a string");
      error.statusCode = 400;
      throw error;
    }
    const trimmed = focus.trim();
    if (trimmed.length > MAX_FIELD_LENGTH) {
      const error = new Error(`focus cannot exceed ${MAX_FIELD_LENGTH} characters`);
      error.statusCode = 400;
      throw error;
    }
    if (trimmed) fields.focus = trimmed;
  }

  return fields;
};

/**
 * Format a Date as a UTC "YYYY-MM-DD" string, matching the date-string
 * convention already used by fitnessService/dailyLogService.
 */
const toDateParam = (date) => date.toISOString().slice(0, 10);

/**
 * Retrieve only the onboarding fields relevant to fitness coaching.
 * Never selects/returns password or any authentication-related field.
 */
const getUserCoachingContext = async (userId) => {
  const user = await User.findById(userId)
    .select("primaryGoal diabetesType sleepSchedule dietPattern")
    .lean();

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    primaryGoal: user.primaryGoal || null,
    diabetesType: user.diabetesType || null,
    sleepSchedule: user.sleepSchedule || null,
    dietPattern: user.dietPattern || null,
  };
};

/**
 * Retrieve a minimal, aggregated slice of recent DailyLog data useful for
 * coaching (stress, sleep duration). Deliberately aggregated rather than
 * raw, and deliberately excludes glucose readings, meal descriptions, and
 * medication adherence details - none of that is necessary for fitness
 * coaching, and it should not be sent to a third-party AI provider.
 */
const getRecentHealthContext = async (userId, fromDate, toDate) => {
  const logs = await DailyLog.find({
    userId,
    date: { $gte: fromDate, $lte: toDate },
  })
    .select("stress sleep.durationMinutes")
    .lean();

  const stressValues = logs
    .map((log) => log.stress)
    .filter((value) => typeof value === "number" && !Number.isNaN(value));

  const sleepValues = logs
    .map((log) => log.sleep?.durationMinutes)
    .filter((value) => typeof value === "number" && !Number.isNaN(value));

  const average = (values) =>
    values.length > 0 ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100 : null;

  return {
    loggedDays: logs.length,
    averageStress: average(stressValues),
    averageSleepMinutes: average(sleepValues),
  };
};

/**
 * Build the structured prompt sent to Gemini. Kept as plain text (rather
 * than a role-based message array) so the safety rules, user context, and
 * task instructions are all unambiguously part of one clearly-labeled
 * document the model reasons over.
 */
const buildPrompt = ({ userContext, fitnessSummary, healthContext, requestFields }) => {
  const activityTypes = Object.entries(fitnessSummary.activityTypeCounts || {});

  const lines = [
    "SYSTEM ROLE:",
    "You are ReLifeX's fitness coaching assistant. You are not a doctor, nurse, or medical professional, and you must never present yourself as one.",
    "",
    "SAFETY RULES (follow strictly, no exceptions):",
    "- Do not diagnose any medical condition.",
    "- Do not prescribe, recommend, or suggest changes to any medication or its dosage.",
    "- Do not give unsafe or extreme physical activity instructions.",
    "- Do not invent, assume, or guess any user data beyond what is explicitly provided below.",
    "- If the provided information is insufficient for a specific recommendation, say so clearly instead of guessing.",
    "- When health context is limited or uncertain, default to conservative, low-risk fitness guidance.",
    "- If anything below looks medically concerning, recommend the user consult an appropriate healthcare professional rather than interpreting it yourself.",
    "",
    "USER CONTEXT:",
    `- Primary goal: ${requestFields.goal || userContext.primaryGoal || "Not specified"}`,
  ];

  if (requestFields.focus) {
    lines.push(`- Requested focus for this session: ${requestFields.focus}`);
  }

  lines.push(`- Diabetes type: ${userContext.diabetesType || "Not specified"}`);

  if (userContext.sleepSchedule && (userContext.sleepSchedule.sleepTime || userContext.sleepSchedule.wakeTime)) {
    lines.push(
      `- Usual sleep schedule: sleep around ${userContext.sleepSchedule.sleepTime || "unknown"}, wake around ${userContext.sleepSchedule.wakeTime || "unknown"}`
    );
  } else {
    lines.push("- Usual sleep schedule: Not specified");
  }

  lines.push(`- Diet pattern: ${userContext.dietPattern || "Not specified"}`);
  lines.push("");
  lines.push(`RECENT FITNESS SUMMARY (last ${COACHING_WINDOW_DAYS} days):`);
  lines.push(`- Total workout sessions: ${fitnessSummary.totalSessions}`);
  lines.push(`- Total workout duration: ${fitnessSummary.totalDurationMinutes} minutes`);
  lines.push(`- Average session duration: ${fitnessSummary.averageDurationMinutes} minutes`);
  lines.push(
    `- Calories burned (tracked sessions only): ${
      fitnessSummary.totalCaloriesBurned !== null && fitnessSummary.totalCaloriesBurned !== undefined
        ? fitnessSummary.totalCaloriesBurned
        : "Not tracked"
    }`
  );
  lines.push(
    `- Activity types: ${activityTypes.length ? activityTypes.map(([type, count]) => `${type} (${count})`).join(", ") : "None logged"}`
  );
  lines.push("");
  lines.push(`RECENT HEALTH CONTEXT (last ${COACHING_WINDOW_DAYS} days, aggregated only):`);
  lines.push(`- Average self-reported stress level: ${healthContext.averageStress ?? "Not logged"}`);
  lines.push(
    `- Average sleep duration: ${healthContext.averageSleepMinutes !== null ? `${healthContext.averageSleepMinutes} minutes` : "Not logged"}`
  );
  lines.push(`- Number of daily logs in this window: ${healthContext.loggedDays}`);
  lines.push("");
  lines.push("TASK:");
  lines.push(
    "Using ONLY the information provided above, generate practical, personalized fitness coaching. Where relevant, cover:"
  );
  lines.push("1. Recommended activity");
  lines.push("2. Workout frequency");
  lines.push("3. Workout duration");
  lines.push("4. Intensity guidance");
  lines.push("5. Progress observations");
  lines.push("6. Recovery/rest");
  lines.push("7. Practical next steps");
  lines.push("Keep the response concise, encouraging, and easy to understand for a non-expert.");

  return lines.join("\n");
};

/**
 * Race a promise against a timeout so a slow/hanging Gemini call can never
 * hold the HTTP request open indefinitely.
 */
const withTimeout = (promise, ms) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error("AI coaching request timed out");
      error.statusCode = 504;
      reject(error);
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
};

/**
 * Call Gemini with the built prompt and return the plain-text response.
 * All Gemini SDK errors are caught and normalized into a generic 502 so
 * internal provider details never reach the client.
 */
const callGemini = async (prompt) => {
  const ai = getGeminiClient();

  let interaction;
  try {
    interaction = await withTimeout(
      ai.interactions.create({
        model: DEFAULT_MODEL,
        input: prompt,
      }),
      GEMINI_TIMEOUT_MS
    );
  } catch (error) {
    // Never leak SDK/provider error internals (which may include request
    // metadata) to the client. Rethrow a controlled, generic error instead.
    if (error.statusCode) throw error; // already our timeout error
    const wrapped = new Error("Failed to generate AI coaching response");
    wrapped.statusCode = 502;
    throw wrapped;
  }

  const text = interaction?.output_text;
  if (!text || typeof text !== "string" || !text.trim()) {
    const error = new Error("AI coaching response was empty");
    error.statusCode = 502;
    throw error;
  }

  return text.trim();
};

/**
 * Generate personalized AI fitness coaching for the authenticated user.
 * userId always comes from the authenticated JWT identity (req.user.userId)
 * in the controller - never from the request body.
 */
export const generateFitnessCoaching = async (userId, rawBody = {}) => {
  const requestFields = buildAllowedRequestFields(rawBody);

  const userContext = await getUserCoachingContext(userId);

  const today = new Date();
  const windowStart = new Date(today);
  windowStart.setUTCDate(today.getUTCDate() - (COACHING_WINDOW_DAYS - 1));

  const fromParam = toDateParam(windowStart);
  const toParam = toDateParam(today);

  // Reuse the existing fitness aggregation rather than re-querying workouts.
  const fitnessSummary = await getFitnessSummary(userId, fromParam, toParam);

  // normalizeDate() in fitnessService treats fromParam/toParam as UTC-midnight
  // calendar days; mirror that here so the DailyLog health-context window
  // lines up with the fitness summary window.
  const healthContext = await getRecentHealthContext(
    userId,
    new Date(Date.UTC(windowStart.getUTCFullYear(), windowStart.getUTCMonth(), windowStart.getUTCDate())),
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  );

  const prompt = buildPrompt({ userContext, fitnessSummary, healthContext, requestFields });

  const coaching = await callGemini(prompt);

  return {
    coaching,
    generatedAt: new Date().toISOString(),
  };
};
