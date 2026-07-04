const { Router } = require('express');
const jobsController = require('../controllers/jobs.controller');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  createJobSchema,
  updateJobSchema,
  createApplicationSchema,
  idParamSchema,
} = require('../validation/schemas');

const router = Router();

// Everything under /jobs requires a session.
router.use(requireAuth);

router.get('/', jobsController.listJobs);
router.post('/', requireRole('HR'), validate(createJobSchema), jobsController.createJob);

router.get('/:id', validate(idParamSchema, 'params'), jobsController.getJob);
router.patch(
  '/:id',
  requireRole('HR'),
  validate(idParamSchema, 'params'),
  validate(updateJobSchema),
  jobsController.updateJob
);

router.get(
  '/:id/applications',
  requireRole('HR'),
  validate(idParamSchema, 'params'),
  jobsController.listJobApplications
);
router.post(
  '/:id/applications',
  requireRole('CANDIDATE'),
  validate(idParamSchema, 'params'),
  validate(createApplicationSchema),
  jobsController.applyToJob
);

module.exports = router;
