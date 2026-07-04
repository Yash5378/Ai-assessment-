const profileService = require('../services/profile.service');
const asyncHandler = require('../utils/asyncHandler');

const getMine = asyncHandler(async (req, res) => {
  const profile = await profileService.getMyProfile(req.user.id);
  res.json({ profile });
});

const upsertMine = asyncHandler(async (req, res) => {
  const profile = await profileService.upsertMyProfile(req.user.id, req.body);
  res.json({ profile });
});

module.exports = { getMine, upsertMine };
