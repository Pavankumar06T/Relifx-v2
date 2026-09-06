import { generateFitnessCoaching } from "../services/fitnessCoachingService.js";

/**
 * Controller to generate AI-powered fitness coaching for the authenticated
 * user via Gemini.
 * POST /api/health/fitness/coaching
 */
export const getFitnessCoaching = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const payload = req.body || {};

    const coaching = await generateFitnessCoaching(userId, payload);

    res.status(200).json({
      success: true,
      message: "Fitness coaching generated successfully",
      data: coaching,
    });
  } catch (error) {
    next(error);
  }
};
