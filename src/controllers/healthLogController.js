import HealthLog from "../models/HealthLog.js";
import { startOfDay, addDays } from "../services/dateService.js";

const ALLOWED_LOG_FIELDS = ["glucose", "meals", "medications", "activity", "sleep", "stress", "notes"];

function allowedLogFields(body = {}) {
  return Object.fromEntries(
    ALLOWED_LOG_FIELDS.filter((field) => body[field] !== undefined).map((field) => [field, body[field]])
  );
}

/**
 * PUT /api/health/extended-logs/daily
 * Ownership always comes from req.userId (set by requireUser.js from
 * Dhanajayan's req.user.userId) - never from the request body.
 */
export const upsertDailyLog = async (req, res, next) => {
  try {
    const date = startOfDay(req.body.date || new Date());
    const update = allowedLogFields(req.body);

    const log = await HealthLog.findOneAndUpdate(
      { userId: req.userId, date },
      { $set: update, $setOnInsert: { userId: req.userId, date } },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Daily health log saved successfully",
      data: log,
    });
  } catch (error) {
    next(error);
  }
};

export const getDailyLog = async (req, res, next) => {
  try {
    const date = startOfDay(req.params.date);
    const log = await HealthLog.findOne({ userId: req.userId, date });

    if (!log) {
      return res.status(404).json({ success: false, message: "Daily log not found" });
    }

    res.status(200).json({
      success: true,
      message: "Daily log retrieved successfully",
      data: log,
    });
  } catch (error) {
    next(error);
  }
};

export const listLogs = async (req, res, next) => {
  try {
    const to = startOfDay(req.query.to || new Date());
    const from = startOfDay(req.query.from || addDays(to, -29));

    if (from > to) {
      const error = new Error("from must be on or before to");
      error.statusCode = 400;
      throw error;
    }

    const logs = await HealthLog.find({ userId: req.userId, date: { $gte: from, $lte: to } }).sort({ date: -1 });

    res.status(200).json({
      success: true,
      message: "Daily logs retrieved successfully",
      data: logs,
      range: { from, to },
    });
  } catch (error) {
    next(error);
  }
};

export const updateDailyLog = async (req, res, next) => {
  try {
    const date = startOfDay(req.params.date);
    const update = allowedLogFields(req.body);

    const log = await HealthLog.findOneAndUpdate(
      { userId: req.userId, date },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!log) {
      return res.status(404).json({ success: false, message: "Daily log not found" });
    }

    res.status(200).json({
      success: true,
      message: "Daily log updated successfully",
      data: log,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDailyLog = async (req, res, next) => {
  try {
    const date = startOfDay(req.params.date);
    const log = await HealthLog.findOneAndDelete({ userId: req.userId, date });

    if (!log) {
      return res.status(404).json({ success: false, message: "Daily log not found" });
    }

    // Changed from 204 No Content to 200 + envelope to match Dhanajayan's
    // { success, message, data } response contract used everywhere else.
    res.status(200).json({
      success: true,
      message: "Daily log deleted successfully",
      data: log,
    });
  } catch (error) {
    next(error);
  }
};
