import mongoose from "mongoose";

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.warn("⚠️  [Database Warning] MONGODB_URI is not defined in environment variables. Database connection skipped.");
    console.warn("👉  To connect to MongoDB, please set MONGODB_URI in your .env file.");
    return;
  }

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`✅ [Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ [Database Error] Failed to connect to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
