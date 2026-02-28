import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import prismaClient from './config/prisma.js';


import logger from './services/logger.js';
import { initializeSocket } from './services/socket.js';
import { applySecurity } from './middleware/security.js';
import { errorHandler, notFoundHandler, handleUncaughtExceptions } from './utils/errors.js';

// Routes
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import clientsRoutes from './routes/clients.js';
import referralSourcesRoutes from './routes/referralSources.js';
import careTypesRoutes from './routes/careTypes.js';
import caregiversRoutes from './routes/caregivers.js';
import schedulingRoutes from './routes/scheduling.js';
import timeTrackingRoutes from './routes/timeTracking.js';
import billingRoutes from './routes/billing.js';
import complianceRoutes from './routes/compliance.js';
import communicationRoutes from './routes/communication.js';
import documentsRoutes from './routes/documents.js';
import notificationsRoutes from './routes/notifications.js';
import pushRoutes from './routes/push.js';
import smsRoutes from './routes/sms.js';
import portalRoutes from './routes/portal.js';
import reportsRoutes from './routes/reports.js';
import formsRoutes from './routes/forms.js';
import authorizationsRoutes from './routes/authorizations.js';
import serviceCodesRoutes from './routes/serviceCodes.js';
import payersRoutes from './routes/payers.js';
import auditRoutes from './routes/audit.js';
import companyRoutes from './routes/company.js';
import stripeRoutes from './routes/stripe.js';
import optimizerRoutes from './routes/optimizer.js';
import usersRoutes from './routes/users.js';
import noShowRoutes from './routes/noShow.js';
import applicationsRoutes from './routes/applications.js';
import carePlansRoutes from './routes/carePlans.js';
import incidentsRoutes from './routes/incidents.js';
import performanceReviewsRoutes from './routes/performanceReviews.js';
import prospectsRoutes from './routes/prospects.js';

dotenv.config();

handleUncaughtExceptions();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

const io = initializeSocket(server);

const prisma = prismaClient;

export { prisma, io };

// Retry DB connection on startup
const connectWithRetry = async (retries = 10, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      logger.info('Database connected');
      return;
    } catch (err) {
      logger.warn(`DB connection attempt ${i + 1}/${retries} failed: ${err.message}`);
      if (i < retries - 1) await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Could not connect to database after multiple attempts');
};

await connectWithRetry();

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    const allowed = [
      process.env.FRONTEND_URL,
      process.env.ALLOWED_ORIGINS,
      'http://localhost:5173',
      'http://localhost:3000',
      'capacitor://localhost',
      'https://localhost',
    ].filter(Boolean);
    // Also allow any onrender.com subdomain for this account
    if (allowed.includes(origin) || origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

applySecurity(app);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 200 : 1000,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts' },
});
app.use('/api/auth/login', authLimiter);

const uploadsDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir));

app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/referral-sources', referralSourcesRoutes);
app.use('/api/care-types', careTypesRoutes);
app.use('/api/caregivers', caregiversRoutes);
app.use('/api/scheduling', schedulingRoutes);
app.use('/api/time-tracking', timeTrackingRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/authorizations', authorizationsRoutes);
app.use('/api/service-codes', serviceCodesRoutes);
app.use('/api/payers', payersRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/optimizer', optimizerRoutes);

// Aliases for frontend compatibility
app.use("/api/users", usersRoutes);
app.use("/api/notification-settings", notificationsRoutes);
app.use("/api/remittance/payers", payersRoutes);
app.get("/api/failsafe/issues", (req, res) => res.json([]));
app.get("/api/edi/service-codes", (req, res) => res.json([]));
app.get("/api/sandata/status", (req, res) => res.json({ connected: false }));



// ============ PROPER PRISMA ROUTES ============
app.use('/api/no-show', noShowRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/care-plans', carePlansRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/performance-reviews', performanceReviewsRoutes);
app.use('/api/prospects', prospectsRoutes);

// ============ STUB ROUTES FOR UNIMPLEMENTED FEATURES ============
// Schedules all
app.get('/api/schedules-all', (req, res) => res.json([]));

// Emergency
app.get('/api/emergency/miss-reports', (req, res) => res.json([]));

// Billing sub-routes
app.get('/api/billing/referral-source-rates', (req, res) => res.json([]));
app.get('/api/billing/invoice-payments', (req, res) => res.json([]));
app.post('/api/payroll/calculate', (req, res) => res.json({ caregivers: [], total: 0 }));

// Claims
app.get('/api/claims', (req, res) => res.json([]));
app.post('/api/claims', (req, res) => res.json({ id: Date.now(), ...req.body }));
app.get('/api/claims/reports/summary', (req, res) => res.json({ total: 0, paid: 0, pending: 0, denied: 0 }));

// Reports
app.post('/api/reports/overview', (req, res) => res.json({ metrics: [], charts: [] }));

// Expenses
app.get('/api/expenses', (req, res) => res.json([]));
app.post('/api/expenses', (req, res) => res.json({ id: Date.now(), ...req.body }));

// Forecast
app.get('/api/forecast/revenue', (req, res) => res.json({ months: [], total: 0 }));
app.get('/api/forecast/caregiver-utilization', (req, res) => res.json([]));

// Background checks
app.get('/api/background-checks', (req, res) => res.json([]));
app.post('/api/background-checks', (req, res) => res.json({ id: Date.now(), ...req.body }));

// Documents
app.get('/api/documents', (req, res) => res.json([]));

// Audit logs
app.get('/api/audit-logs', (req, res) => res.json([]));

// Auth sub-routes
app.get('/api/auth/login-activity', (req, res) => res.json({ activities: [], total: 0 }));

// Communication log sub-routes
app.get('/api/communication-log/follow-ups/pending', (req, res) => res.json([]));
app.get('/api/communication-log/:type/:id', (req, res) => res.json({ logs: [], total: 0 }));

// SMS
app.get('/api/sms/messages', (req, res) => res.json([]));
app.get('/api/sms/templates', (req, res) => res.json([]));

// Family portal
app.get('/api/family-portal/admin/members', (req, res) => res.json([]));

// Alerts
app.get('/api/alerts', (req, res) => res.json([]));

// Messages
app.get('/api/messages/inbox', (req, res) => res.json([]));
app.get('/api/messages/users', (req, res) => res.json([]));

// Integrations
app.get('/api/gusto/config', (req, res) => res.json({ connected: false }));
app.get('/api/sandata/config', (req, res) => res.json({ connected: false }));

// Authorizations sub-routes
app.get('/api/authorizations/summary', (req, res) => res.json({ total: 0, active: 0, expiring: 0 }));

// Remittance sub-routes
app.get('/api/remittance/payer-summary', (req, res) => res.json([]));



// Route Optimizer & Matching stubs
app.get('/api/route-optimizer/config-status', (req, res) => res.json({ configured: false }));
app.get('/api/matching/capabilities', (req, res) => res.json({ features: [] }));

app.use(notFoundHandler);
app.use(errorHandler);

const shutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  logger.info(`{{COMPANY_NAME}} Care API running on port ${PORT}`, {
    env: process.env.NODE_ENV || 'development',
    port: PORT,
  });
});

export default app;
