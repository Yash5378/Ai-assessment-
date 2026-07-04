const { Router } = require('express');
const profileController = require('../controllers/profile.controller');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { profileSchema } = require('../validation/schemas');

const router = Router();

// Profiles belong to candidates; HR discovers them via /api/candidates.
router.use(requireAuth, requireRole('CANDIDATE'));

router.get('/me', profileController.getMine);
router.put('/me', validate(profileSchema), profileController.upsertMine);

module.exports = router;
