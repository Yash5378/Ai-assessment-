const { Router } = require('express');
const candidatesController = require('../controllers/candidates.controller');
const profileController = require('../controllers/profile.controller');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { candidateSearchSchema, idParamSchema } = require('../validation/schemas');

const router = Router();

// Talent search and resume access are HR-only.
router.use(requireAuth, requireRole('HR'));

router.get('/', validate(candidateSearchSchema, 'query'), candidatesController.search);
router.get(
  '/:id/resume',
  validate(idParamSchema, 'params'),
  profileController.downloadCandidateResume
);

module.exports = router;
