/**
 * DEVELOPMENT ONLY authentication shim.
 * Integration contract for Dhanajayan's auth middleware: it must set
 * req.user.id (or req.user._id). Until it is mounted, X-User-Id is accepted
 * outside production to make local API and sample-data testing possible.
 */
function requireUser(req, res, next) {
    const developmentUserId = process.env.NODE_ENV !== "production" ? req.header("x-user-id") : null;
    const userId = req.user?.id || req.user?._id || developmentUserId;
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "Authentication required. Expected req.user.id; X-User-Id is available only for development testing."
        });
    }

    req.userId = String(userId);
    next();
}

module.exports = { requireUser };
