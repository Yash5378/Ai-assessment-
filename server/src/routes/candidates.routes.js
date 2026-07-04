const { Router } = require('express');
const candidatesController = require('../controllers/candidates.controller');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { candidateSearchSchema } = require('../validation/schemas');

const router = Router();

router.get(
  '/',
  requireAuth,
  requireRole('HR'),
  validate(candidateSearchSchema, 'query'),
  candidatesController.search
);

module.exports = router;
