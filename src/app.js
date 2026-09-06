const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const healthLogRoutes = require("./routes/healthLogRoutes");
const habitRoutes = require("./routes/habitRoutes");
const healthRecordRoutes = require("./routes/healthRecordRoutes");
const workoutRoutes = require("./routes/workoutRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "ReLifeX Health Service is running"
    });
});

app.use("/api/logs", healthLogRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/health-records", healthRecordRoutes);
app.use("/api/workouts", workoutRoutes);

app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Unexpected server error"
    });
});

module.exports = app;
