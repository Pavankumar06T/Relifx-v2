import express from "express";
import cors from "cors";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import dailyLogRoutes from "./routes/dailyLogRoutes.js";
import fitnessRoutes from "./routes/fitnessRoutes.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/health", dailyLogRoutes);
app.use("/api/health", fitnessRoutes);

// 404 Route Not Found Handler
app.use(notFound);

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
