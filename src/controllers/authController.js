import { registerUser, loginUser } from "../services/authService.js";

/**
 * Controller to handle user registration
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    const newUser = await registerUser({ name, email, password });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: newUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle user login
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    const result = await loginUser({ email, password });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle temporary protected test endpoint
 * GET /api/auth/protected-test
 */
export const protectedTest = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authentication successful",
    data: {
      userId: req.user.userId,
    },
  });
};


