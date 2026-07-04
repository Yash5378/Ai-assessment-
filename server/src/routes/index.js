const { Router } = require('express');
const swaggerUi = require('swagger-ui-express');
const openapi = require('../docs/openapi');
const authRoutes = require('./auth.routes');
const jobsRoutes = require('./jobs.routes');
const applicationsRoutes = require('./applications.routes');
const statsRoutes = require('./stats.routes');
const profileRoutes = require('./profile.routes');
const candidatesRoutes = require('./candidates.routes');
const notificationsRoutes = require('./notifications.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/jobs', jobsRoutes);
router.use('/applications', applicationsRoutes);
router.use('/stats', statsRoutes);
router.use('/profile', profileRoutes);
router.use('/candidates', candidatesRoutes);
router.use('/notifications', notificationsRoutes);

// Liveness probe used by the Docker healthcheck and the nginx proxy.
router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Interactive API documentation (public). Swagger UI needs inline scripts,
// so the strict global CSP from helmet is relaxed for these routes only.
const docsCsp = (req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
  );
  next();
};
router.get('/docs.json', (req, res) => res.json(openapi));
router.use(
  '/docs',
  docsCsp,
  swaggerUi.serve,
  swaggerUi.setup(openapi, { customSiteTitle: 'Recruitment Portal API' })
);

module.exports = router;
