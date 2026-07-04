const applicationsService = require('../services/applications.service');
const asyncHandler = require('../utils/asyncHandler');

const listMine = asyncHandler(async (req, res) => {
  const applications = await applicationsService.listMyApplications(req.user);
  res.json({ applications });
});

const updateStatus = asyncHandler(async (req, res) => {
  const application = await applicationsService.updateApplicationStatus(
    req.user,
    req.params.id,
    req.body.status
  );
  res.json({ application });
});

const withdraw = asyncHandler(async (req, res) => {
  await applicationsService.withdrawApplication(req.user, req.params.id);
  res.json({ message: 'Application withdrawn' });
});

module.exports = { listMine, updateStatus, withdraw };
