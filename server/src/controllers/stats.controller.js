const statsService = require('../services/stats.service');
const asyncHandler = require('../utils/asyncHandler');

const getHrStats = asyncHandler(async (req, res) => {
  const stats = await statsService.getHrStats(req.user);
  res.json({ stats });
});

module.exports = { getHrStats };
