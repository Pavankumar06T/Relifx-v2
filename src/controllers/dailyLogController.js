import {
  createDailyLog,
  getDailyLogs,
  getDailyLogByDate,
  updateDailyLogByDate,
  deleteDailyLogByDate,
} from "../services/dailyLogService.js";

/**
 * Controller to create a DailyLog for the authenticated user
 * POST /api/health/daily-log
 */
export const createLog = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const payload = req.body || {};

    const newLog = await createDailyLog(userId, payload);

    res.status(201).json({
      success: true,
      message: "Daily log created successfully",
      data: newLog,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch all DailyLogs for the authenticated user
 * GET /api/health/daily-log
 */
export const listLogs = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const logs = await getDailyLogs(userId);

    res.status(200).json({
      success: true,
      message: "Daily logs retrieved successfully",
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch a single DailyLog for the authenticated user by date
 * GET /api/health/daily-log/:date
 */
export const getLogByDate = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;

    const log = await getDailyLogByDate(userId, date);

    res.status(200).json({
      success: true,
      message: "Daily log retrieved successfully",
      data: log,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to update a DailyLog for the authenticated user by date
 * PUT /api/health/daily-log/:date
 */
export const updateLogByDate = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;
    const payload = req.body || {};

    const updatedLog = await updateDailyLogByDate(userId, date, payload);

    res.status(200).json({
      success: true,
      message: "Daily log updated successfully",
      data: updatedLog,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to delete a DailyLog for the authenticated user by date
 * DELETE /api/health/daily-log/:date
 */
export const deleteLogByDate = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;

    const deletedLog = await deleteDailyLogByDate(userId, date);

    res.status(200).json({
      success: true,
      message: "Daily log deleted successfully",
      data: deletedLog,
    });
  } catch (error) {
    next(error);
  }
};
