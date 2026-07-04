const { Router } = require('express');

const router = Router();

// Liveness probe used by the Docker healthcheck and the nginx proxy.
router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

module.exports = router;
