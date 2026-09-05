import { updateOnboardingProfile } from "../services/profileService.js";

/**
 * Controller to handle user onboarding profile updates
 * PUT /api/profile/onboarding
 */
export const updateOnboarding = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const onboardingData = req.body || {};

    const updatedProfile = await updateOnboardingProfile(userId, onboardingData);

    res.status(200).json({
      success: true,
      message: "Onboarding profile updated successfully",
      data: updatedProfile,
    });
  } catch (error) {
    next(error);
  }
};
