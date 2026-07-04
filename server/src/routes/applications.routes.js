const { Router } = require('express');
const applicationsController = require('../controllers/applications.controller');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { updateApplicationStatusSchema, idParamSchema } = require('../validation/schemas');

const router = Router();

router.use(requireAuth);

router.get('/mine', requireRole('CANDIDATE'), applicationsController.listMine);
router.delete(
  '/:id',
  requireRole('CANDIDATE'),
  validate(idParamSchema, 'params'),
  applicationsController.withdraw
);
router.patch(
  '/:id/status',
  requireRole('HR'),
  validate(idParamSchema, 'params'),
  validate(updateApplicationStatusSchema),
  applicationsController.updateStatus
);

module.exports = router;
