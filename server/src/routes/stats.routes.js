const { Router } = require('express');
const statsController = require('../controllers/stats.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = Router();

router.get('/', requireAuth, requireRole('HR'), statsController.getHrStats);

module.exports = router;
