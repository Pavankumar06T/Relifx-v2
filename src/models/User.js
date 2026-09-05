import mongoose from "mongoose";

// Regex for basic email format validation
const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      unique: true,
      match: [emailRegex, "Please provide a valid email address"],
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false,
    },

    // Onboarding / Profile Baseline Fields
    diabetesType: {
      type: String,
      trim: true,
    },
    medications: [
      {
        type: String,
        trim: true,
      },
    ],
    lastHbA1c: {
      type: Number,
    },
    sleepSchedule: {
      sleepTime: {
        type: String,
        trim: true,
      },
      wakeTime: {
        type: String,
        trim: true,
      },
    },
    dietPattern: {
      type: String,
      trim: true,
    },
    primaryGoal: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;

