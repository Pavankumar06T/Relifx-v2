/**
 * Adapter middleware — NOT a second authentication system.
 *
 * Integration contract with Dhanajayan's authMiddleware.js:
 *   - His middleware verifies the JWT and sets req.user.userId.
 *   - This adapter simply copies that value onto req.userId so the rest
 *     of this module's controllers (which were already written against
 *     req.userId) don't need to change.
 *
 * Mount order in the shared app.js must be:
 *   app.use("/api/health/...", authMiddleware, someRouterFromThisModule);
 * i.e. Dhanajayan's authMiddleware runs first and populates req.user.userId
 * before any router in this file is reached.
 *
 * The X-User-Id header fallback is retained ONLY for local development
 * before the routers below are wired behind the shared authMiddleware,
 * and is hard-disabled in production. Once these routes are mounted
 * behind authMiddleware in the real app.js, this fallback will simply
 * never trigger (req.user.userId will already be set) and can be
 * deleted entirely in a follow-up cleanup.
 */
export function requireUser(req, res, next) {
  const developmentUserId =
    process.env.NODE_ENV !== "production" ? req.header("x-user-id") : null;

  // req.user.userId is the ONLY production identity source — matches
  // Dhanajayan's authMiddleware.js contract exactly. Do not read
  // req.body.userId or any client-supplied identity here.
  const userId = req.user?.userId || developmentUserId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  req.userId = String(userId);
  next();
}

export default requireUser;
