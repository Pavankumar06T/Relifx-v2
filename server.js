import dotenv from "dotenv";
import app from "./src/app.js";
import connectDB from "./src/config/database.js";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Start application
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 ReLifeX server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
};

startServer();
