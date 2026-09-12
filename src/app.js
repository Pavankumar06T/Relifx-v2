import express from "express";
import authMiddleware from "./middleware/authMiddleware.js";
import healthLogRoutes from "./routes/healthLogRoutes.js";
import healthRecordRoutes from "./routes/healthRecordRoutes.js";
import workoutRoutes from "./routes/workoutRoutes.js";
import cors from "cors";
import healthRoutes from "./routes/healthRoutes.js";
import habitRoutes from "./routes/habitRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import dailyLogRoutes from "./routes/dailyLogRoutes.js";
import fitnessRoutes from "./routes/fitnessRoutes.js";
import fitnessCoachingRoutes from "./routes/fitnessCoachingRoutes.js";
import medicineDoseRoutes from "./routes/medicineDoseRoutes.js";
import medicineRoutes from "./routes/medicineRoutes.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", healthRoutes);
app.use("/api/health/habits", authMiddleware, habitRoutes);
app.use("/api/health", fitnessRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/health", dailyLogRoutes);
app.use("/api/health", fitnessRoutes);
app.use("/api/health/extended-logs", authMiddleware, healthLogRoutes);
app.use("/api/health/records", authMiddleware, healthRecordRoutes);
app.use("/api/health/workouts-extended", authMiddleware, workoutRoutes);
// Mounted separately (still under /api/health/fitness) so the AI coaching
// endpoint and its dedicated rate limiter stay isolated from the existing
// fitness aggregation routes above. Path is distinct ("/coaching" vs
// "/fitness/summary"), so there is no routing conflict or ordering issue.
app.use("/api/health/fitness", fitnessCoachingRoutes);
// medicineDoseRoutes is mounted before medicineRoutes: both share the
// "/api/medicine" prefix, and medicineDoseRoutes owns the literal "/doses"
// path, which must be matched before medicineRoutes' "/:medicineId" param
// route would otherwise capture it.
app.use("/api/medicine", medicineDoseRoutes);
app.use("/api/medicine", medicineRoutes);

// 404 Route Not Found Handler
app.use(notFound);

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
