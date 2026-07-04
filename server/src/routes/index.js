const { Router } = require('express');
const authRoutes = require('./auth.routes');
const jobsRoutes = require('./jobs.routes');
const applicationsRoutes = require('./applications.routes');
const statsRoutes = require('./stats.routes');
const profileRoutes = require('./profile.routes');
const candidatesRoutes = require('./candidates.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/jobs', jobsRoutes);
router.use('/applications', applicationsRoutes);
router.use('/stats', statsRoutes);
router.use('/profile', profileRoutes);
router.use('/candidates', candidatesRoutes);

// Liveness probe used by the Docker healthcheck and the nginx proxy.
router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

module.exports = router;
