const { Router } = require('express');
const profileController = require('../controllers/profile.controller');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { resumeUpload } = require('../middleware/upload');
const { onboardingSchema, profileSchema } = require('../validation/schemas');

const router = Router();

// Profiles belong to candidates; HR discovers them via /api/candidates.
router.use(requireAuth, requireRole('CANDIDATE'));

router.get('/me', profileController.getMine);
router.put('/me', validate(profileSchema), profileController.upsertMine);

// Onboarding and resume upload are multipart: multer runs first (populating
// req.body text fields + req.file), then zod validates the text fields.
router.post('/onboarding', resumeUpload, validate(onboardingSchema), profileController.onboard);
router.post('/resume', resumeUpload, profileController.uploadResume);
router.get('/resume', profileController.downloadMyResume);

module.exports = router;
