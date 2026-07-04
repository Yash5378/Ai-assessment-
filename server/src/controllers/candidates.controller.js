const candidatesService = require('../services/candidates.service');
const asyncHandler = require('../utils/asyncHandler');

const search = asyncHandler(async (req, res) => {
  const candidates = await candidatesService.searchCandidates(req.query);
  res.json({ candidates });
});

module.exports = { search };
