const HealthLog = require("../models/HealthLog");
const { startOfDay, addDays } = require("../services/dateService");

function allowedLogFields(body) {
    const fields = ["glucose", "meals", "medications", "activity", "sleep", "stress", "notes"];
    return Object.fromEntries(fields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));
}

async function upsertDailyLog(req, res, next) {
    try {
        const date = startOfDay(req.body.date || new Date());
        const update = allowedLogFields(req.body);
        const log = await HealthLog.findOneAndUpdate(
            { userId: req.userId, date },
            { $set: update, $setOnInsert: { userId: req.userId, date } },
            { new: true, upsert: true, runValidators: true }
        );
        res.status(200).json({ success: true, data: log });
    } catch (error) { next(error); }
}

async function getDailyLog(req, res, next) {
    try {
        const date = startOfDay(req.params.date);
        const log = await HealthLog.findOne({ userId: req.userId, date });
        if (!log) return res.status(404).json({ success: false, message: "Daily log not found" });
        res.json({ success: true, data: log });
    } catch (error) { next(error); }
}

async function listLogs(req, res, next) {
    try {
        const to = startOfDay(req.query.to || new Date());
        const from = startOfDay(req.query.from || addDays(to, -29));
        if (from > to) throw Object.assign(new Error("from must be on or before to"), { statusCode: 400 });
        const logs = await HealthLog.find({ userId: req.userId, date: { $gte: from, $lte: to } }).sort({ date: -1 });
        res.json({ success: true, data: logs, range: { from, to } });
    } catch (error) { next(error); }
}

async function updateDailyLog(req, res, next) {
    try {
        const date = startOfDay(req.params.date);
        const update = allowedLogFields(req.body);
        const log = await HealthLog.findOneAndUpdate(
            { userId: req.userId, date },
            { $set: update },
            { new: true, runValidators: true }
        );
        if (!log) return res.status(404).json({ success: false, message: "Daily log not found" });
        res.json({ success: true, data: log });
    } catch (error) { next(error); }
}

async function deleteDailyLog(req, res, next) {
    try {
        const date = startOfDay(req.params.date);
        const log = await HealthLog.findOneAndDelete({ userId: req.userId, date });
        if (!log) return res.status(404).json({ success: false, message: "Daily log not found" });
        res.status(204).send();
    } catch (error) { next(error); }
}

module.exports = { upsertDailyLog, getDailyLog, listLogs, updateDailyLog, deleteDailyLog };
