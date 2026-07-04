const { Router } = require('express');
const authRoutes = require('./auth.routes');

const router = Router();

router.use('/auth', authRoutes);

// Liveness probe used by the Docker healthcheck and the nginx proxy.
router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

module.exports = router;
