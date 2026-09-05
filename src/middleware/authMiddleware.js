import jwt from "jsonwebtoken";

/**
 * JWT Authentication Middleware
 * Verifies JWT from Authorization header (Bearer token) and attaches userId to req.user
 */
export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check if Authorization header exists
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // Validate Bearer header format
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // Extract the token portion
  const token = authHeader.split(" ")[1];

  if (!token || !token.trim()) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    // Verify token using JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Validate payload contains userId
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // Attach authenticated identity to req.user
    req.user = {
      userId: decoded.userId,
    };

    // Proceed to downstream controllers
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default authMiddleware;
