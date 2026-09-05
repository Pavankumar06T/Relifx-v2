export const getHealthStatus = (req, res) => {
  res.status(200).json({
    success: true,
    message: "ReLifeX API is running"
  });
};
