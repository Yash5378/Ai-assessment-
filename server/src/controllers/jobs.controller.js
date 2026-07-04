const jobsService = require('../services/jobs.service');
const applicationsService = require('../services/applications.service');
const asyncHandler = require('../utils/asyncHandler');

const listJobs = asyncHandler(async (req, res) => {
  const jobs = await jobsService.listJobs(req.user, req.query);
  res.json({ jobs });
});

const getJob = asyncHandler(async (req, res) => {
  const job = await jobsService.getJobById(req.user, req.params.id);
  res.json({ job });
});

const createJob = asyncHandler(async (req, res) => {
  const job = await jobsService.createJob(req.user, req.body);
  res.status(201).json({ job });
});

const updateJob = asyncHandler(async (req, res) => {
  const job = await jobsService.updateJob(req.user, req.params.id, req.body);
  res.json({ job });
});

const listJobApplications = asyncHandler(async (req, res) => {
  const applications = await applicationsService.listApplicationsForJob(req.user, req.params.id);
  res.json({ applications });
});

const applyToJob = asyncHandler(async (req, res) => {
  const application = await applicationsService.applyToJob(
    req.user,
    req.params.id,
    req.body.coverLetter
  );
  res.status(201).json({ application });
});

module.exports = { listJobs, getJob, createJob, updateJob, listJobApplications, applyToJob };
