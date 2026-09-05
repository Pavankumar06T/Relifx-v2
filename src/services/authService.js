import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/;

/**
 * Service to register a new user in ReLifeX
 * @param {Object} userData - { name, email, password }
 * @returns {Object} Safe user object excluding password/hash
 */
export const registerUser = async ({ name, email, password }) => {
  // 1. Validate Input Data
  if (!name || typeof name !== "string" || !name.trim()) {
    const error = new Error("Name is required");
    error.statusCode = 400;
    throw error;
  }

  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 50) {
    const error = new Error("Name must be between 2 and 50 characters");
    error.statusCode = 400;
    throw error;
  }

  if (!email || typeof email !== "string" || !email.trim()) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!emailRegex.test(normalizedEmail)) {
    const error = new Error("Please provide a valid email address");
    error.statusCode = 400;
    throw error;
  }

  if (!password || typeof password !== "string" || !password.trim()) {
    const error = new Error("Password is required");
    error.statusCode = 400;
    throw error;
  }

  if (password.length < 6) {
    const error = new Error("Password must be at least 6 characters long");
    error.statusCode = 400;
    throw error;
  }

  // 2. Check for Duplicate Email
  try {
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const error = new Error("Email is already registered");
      error.statusCode = 409;
      throw error;
    }

    // 3. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create User
    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      password: hashedPassword,
    });

    // 5. Return Safe User Data (never exposing password or hash)
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch (error) {
    // Handle MongoDB duplicate key error code 11000
    if (error.code === 11000) {
      const dupError = new Error("Email is already registered");
      dupError.statusCode = 409;
      throw dupError;
    }
    throw error;
  }
};

/**
 * Service to authenticate user login and generate a JWT
 * @param {Object} credentials - { email, password }
 * @returns {Object} User identity and JWT token
 */
export const loginUser = async ({ email, password }) => {
  // 1. Validate Input Data
  if (!email || typeof email !== "string" || !email.trim()) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    throw error;
  }

  if (!password || typeof password !== "string" || !password.trim()) {
    const error = new Error("Password is required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // 2. Find User by Email
  const user = await User.findOne({ email: normalizedEmail }).select("+password");

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // 3. Compare Password using bcrypt
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // 4. Verify JWT Secret Configuration
  if (!process.env.JWT_SECRET) {
    const error = new Error("JWT secret is not configured on the server");
    error.statusCode = 500;
    throw error;
  }

  // 5. Generate JWT Token
  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  // 6. Return Auth Data (excluding password)
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    token,
  };
};
