import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { prisma } from './config/prisma.js';
import { authenticate } from './middleware/auth.js';

// Services
import logger from './services/logger.js';
import { initializeSocket } from './services/socket.js';

// Middleware
import { applySecurity } from './middleware/security.js';
import { errorHandler, notFoundHandler, handleUncaughtExceptions } from './utils/errors.js';

// Routes
import authRoutes from './routes/auth.js';
import contactsRoutes from './routes/contacts.js';
import projectsRoutes from './routes/projects.js';
import jobsRoutes from './routes/jobs.js';
import quotesRoutes from './routes/quotes.js';
import invoicesRoutes from './routes/invoices.js';
import timeRoutes from './routes/time.js';
import expensesRoutes from './routes/expenses.js';
import rfisRoutes from './routes/rfis.js';
import changeOrdersRoutes from './routes/changeOrders.js';
import punchListsRoutes from './routes/punchLists.js';
import dailyLogsRoutes from './routes/dailyLogs.js';
import inspectionsRoutes from './routes/inspections.js';
import bidsRoutes from './routes/bids.js';
import teamRoutes from './routes/team.js';
import companyRoutes from './routes/company.js';
import dashboardRoutes from './routes/dashboard.js';
import documentsRoutes from './routes/documents.js';
import billingRoutes from './routes/billing.js';
import integrationsRoutes from './routes/integrations.js';
import factoryRoutes from './routes/factory.js';

// Auto-wired feature routes
import agencyAdminRoutes from './routes/agencyAdmin.js';
import agreementsRoutes from './routes/agreements.js';
import auditRoutes from './routes/audit.js';
import bookingRoutes from './routes/booking.js';
import bulkRoutes from './routes/bulk.js';
import calltrackingRoutes from './routes/calltracking.js';
import commentsRoutes from './routes/comments.js';
import equipmentRoutes from './routes/equipment.js';
import exportRoutes from './routes/export.js';
import fleetRoutes from './routes/fleet.js';
import geofencingRoutes from './routes/geofencing.js';
import importRoutes from './routes/import.js';
import inventoryRoutes from './routes/inventory.js';
import mapsRoutes from './routes/maps.js';
import marketingRoutes from './routes/marketing.js';
import adsRoutes from './routes/ads.js';
import photosRoutes from './routes/photos.js';
import portalRoutes from './routes/portal.js';
import portalSelectionsRoutes from './routes/portal-selections.js';
import pricebookRoutes from './routes/pricebook.js';
import pushRoutes from './routes/push.js';
import quickbooksRoutes from './routes/quickbooks.js';
import recurringRoutes from './routes/recurring.js';
import reportingRoutes from './routes/reporting.js';
import reviewsRoutes from './routes/reviews.js';
import routingRoutes from './routes/routing.js';
import schedulingRoutes from './routes/scheduling.js';
import searchRoutes from './routes/search.js';
import selectionsRoutes from './routes/selections.js';
import smsRoutes from './routes/sms.js';
import stripeRoutes from './routes/stripe.js';
import takeoffsRoutes from './routes/takeoffs.js';
import tasksRoutes from './routes/tasks.js';
import timeTrackingRoutes from './routes/timeTracking.js';
import warrantiesRoutes from './routes/warranties.js';
import weatherRoutes from './routes/weather.js';
import wisetackRoutes from './routes/wisetack.js';
import { bookingRoutes as gapBookingRoutes, jobCostingRoutes, customFormsRoutes, lienWaiverRoutes, drawScheduleRoutes } from './routes/gapFeatures.js';

dotenv.config();

// Handle uncaught exceptions
handleUncaughtExceptions();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Initialize WebSocket
const io = initializeSocket(server);

export { prisma, io };

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS — supports multiple frontend origins via comma-separated FRONTEND_URL env var
// e.g. FRONTEND_URL=https://app.twomiah-build.io,https://staging.twomiah-build.io
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-ID'],
}));

// Body parsing
app.use(express.json({ 
  limit: '10mb',
  // Preserve raw body for Stripe webhook signature verification
  verify: (req, res, buf) => {
    if (req.originalUrl.includes('/stripe/webhook') || req.originalUrl.includes('/billing/webhook')) {
      req.rawBody = buf;
    }
  },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Apply security middleware
applySecurity(app);

// Rate limiting — keyed per authenticated user (falls back to IP for unauthenticated)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  // Per-user limiting: one aggressive account can't degrade everyone else
  keyGenerator: (req) => req.user?.userId ?? req.ip,
});
app.use('/api/v1/', limiter);

// API version routing — /api/v1/ is canonical, /api/ redirects for backward compat
app.use('/api/', (req, res, next) => {
  // If already hitting /api/v1/, pass through (shouldn't happen but safe)
  if (req.path.startsWith('/v1/')) return next();
  // Rewrite /api/foo → /api/v1/foo for legacy clients
  req.url = '/v1' + req.url;
  next('router');
});


// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts, please try again later' },
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/forgot-password', authLimiter);
app.use('/api/v1/auth/signup', authLimiter);

// Static files (uploads) — auth-gated so document paths aren't publicly guessable
const uploadsDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
app.use('/uploads', authenticate, express.static(uploadsDir));

// Make prisma available to routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/contacts', contactsRoutes);
app.use('/api/v1/projects', projectsRoutes);
app.use('/api/v1/jobs', jobsRoutes);
app.use('/api/v1/quotes', quotesRoutes);
app.use('/api/v1/invoices', invoicesRoutes);
app.use('/api/v1/time', timeRoutes);
app.use('/api/v1/expenses', expensesRoutes);
app.use('/api/v1/rfis', rfisRoutes);
app.use('/api/v1/change-orders', changeOrdersRoutes);
app.use('/api/v1/punch-lists', punchListsRoutes);
app.use('/api/v1/daily-logs', dailyLogsRoutes);
app.use('/api/v1/inspections', inspectionsRoutes);
app.use('/api/v1/bids', bidsRoutes);
app.use('/api/v1/team', teamRoutes);
app.use('/api/v1/company', companyRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/documents', documentsRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/integrations', integrationsRoutes);
app.use('/api/v1/factory', factoryRoutes);

// Feature routes
app.use('/api/v1/agency', agencyAdminRoutes);
app.use('/api/v1/agreements', agreementsRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/booking', bookingRoutes);
app.use('/api/v1/bulk', bulkRoutes);
app.use('/api/v1/call-tracking', calltrackingRoutes);
app.use('/api/v1/comments', commentsRoutes);
app.use('/api/v1/equipment', equipmentRoutes);
app.use('/api/v1/export', exportRoutes);
app.use('/api/v1/fleet', fleetRoutes);
app.use('/api/v1/geofencing', geofencingRoutes);
app.use('/api/v1/import', importRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/maps', mapsRoutes);
app.use('/api/v1/marketing', marketingRoutes);
app.use('/api/v1/ads', adsRoutes);
app.use('/api/v1/photos', photosRoutes);
app.use('/api/v1/portal', portalRoutes);
app.use('/api/v1/portal/selections', portalSelectionsRoutes);
app.use('/api/v1/pricebook', pricebookRoutes);
app.use('/api/v1/push', pushRoutes);
app.use('/api/v1/quickbooks', quickbooksRoutes);
app.use('/api/v1/recurring', recurringRoutes);
app.use('/api/v1/reports', reportingRoutes);
app.use('/api/v1/reviews', reviewsRoutes);
app.use('/api/v1/routing', routingRoutes);
app.use('/api/v1/scheduling', schedulingRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/selections', selectionsRoutes);
app.use('/api/v1/sms', smsRoutes);
app.use('/api/v1/stripe', stripeRoutes);
app.use('/api/v1/takeoffs', takeoffsRoutes);
app.use('/api/v1/tasks', tasksRoutes);
app.use('/api/v1/time-tracking', timeTrackingRoutes);
app.use('/api/v1/warranties', warrantiesRoutes);
app.use('/api/v1/weather', weatherRoutes);
app.use('/api/v1/wisetack', wisetackRoutes);

// Gap features — construction-specific routes now live
app.use('/api/v1/booking-gap', gapBookingRoutes);
app.use('/api/v1/job-costing', jobCostingRoutes);
app.use('/api/v1/custom-forms', customFormsRoutes);
app.use('/api/v1/lien-waivers', lienWaiverRoutes);
app.use('/api/v1/draw-schedules', drawScheduleRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ── Startup validation ─────────────────────────────────────────────────────
function runStartupChecks() {
  // #1 — File storage
  const useS3 = process.env.STORAGE_BACKEND === 's3';
  if (!useS3 && process.env.NODE_ENV === 'production') {
    logger.error('CRITICAL: STORAGE_BACKEND is not set to "s3". All uploaded files will be lost on the next Render deploy. Set STORAGE_BACKEND=s3 and configure R2_* or S3_* env vars immediately.');
  }

  // #3 — Database backup check
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.DB_BACKUPS_CONFIRMED) {
      logger.warn(
        'DB_BACKUPS_CONFIRMED is not set. Confirm that your Render PostgreSQL instance is on a paid plan with automated backups enabled, then set DB_BACKUPS_CONFIRMED=true in your environment. Free-tier Render Postgres has NO automated backups — a bad migration is unrecoverable.'
      );
    }
  }
}

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`, {
    env: process.env.NODE_ENV || 'development',
    port: PORT,
    websocket: 'enabled',
  });
  try { runStartupChecks(); } catch (e) { /* non-fatal */ }
});

export default app;
