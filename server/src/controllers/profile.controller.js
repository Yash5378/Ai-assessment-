const fs = require('fs');
const profileService = require('../services/profile.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { resolveUploadPath } = require('../middleware/upload');

const getMine = asyncHandler(async (req, res) => {
  const profile = await profileService.getMyProfile(req.user.id);
  res.json({ profile });
});

// A replaced resume's old file has no DB reference anymore — remove it from
// disk so the uploads volume doesn't accumulate orphans. Best-effort.
const removeReplacedResume = async (previousResume, newFilename) => {
  if (previousResume && previousResume !== newFilename) {
    await fs.promises.unlink(resolveUploadPath(previousResume)).catch(() => {});
  }
};

const onboard = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('A resume file is required to complete onboarding');
  }
  const { profile, previousResume } = await profileService.completeOnboarding(
    req.user.id,
    req.body,
    req.file
  );
  await removeReplacedResume(previousResume, req.file.filename);
  res.status(201).json({ profile });
});

const upsertMine = asyncHandler(async (req, res) => {
  const profile = await profileService.upsertMyProfile(req.user.id, req.body);
  res.json({ profile });
});

const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('A resume file is required');
  }
  const { resume, previousResume } = await profileService.setResume(req.user.id, req.file);
  await removeReplacedResume(previousResume, req.file.filename);
  res.json({ resume });
});

/**
 * Streams a candidate's resume file to the response. Shared by the
 * candidate (own) and HR (any candidate) download routes; `candidateId`
 * is resolved by the caller.
 */
const streamResume = asyncHandler(async (req, res) => {
  const meta = await profileService.getResumeMeta(req.candidateId);
  const filePath = resolveUploadPath(meta.filename);

  if (!fs.existsSync(filePath)) {
    throw ApiError.notFound('Resume file is missing');
  }
  res.download(filePath, meta.originalName);
});

// Resolves whose resume to serve, then delegates to streamResume.
const downloadMyResume = [
  (req, res, next) => {
    req.candidateId = req.user.id;
    next();
  },
  streamResume,
];

const downloadCandidateResume = [
  (req, res, next) => {
    req.candidateId = req.params.id;
    next();
  },
  streamResume,
];

module.exports = {
  getMine,
  onboard,
  upsertMine,
  uploadResume,
  downloadMyResume,
  downloadCandidateResume,
};
