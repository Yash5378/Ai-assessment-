const { Router } = require('express');
const notificationsController = require('../controllers/notifications.controller');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// Any authenticated user has a notification feed (HR's is simply empty
// until something notifies them).
router.use(requireAuth);

router.get('/', notificationsController.listMine);
router.post('/read', notificationsController.markAllRead);

module.exports = router;
