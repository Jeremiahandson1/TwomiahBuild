require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Routes
const servicesRoutes = require('./routes/services');
const adminRoutes = require('./routes/admin');
const { startSchedule: startBackups } = require('./services/autoBackup');
const { rebuildMiddleware } = require('./rebuild-middleware');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const appPaths = require('./config/paths');
const uploadsDir = appPaths.uploads;
const BASE_URL = process.env.BASE_URL || 'https://buildpro-demo-site.onrender.com';

// Check if we have a build directory
const buildDir = path.join(__dirname, 'build');
const hasBuild = fs.existsSync(buildDir);

// ===========================================
// MIDDLEWARE
// ===========================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Rate limiting for contact form
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many submissions. Please try again in 15 minutes.'
  }
});

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// Admin rate limiting
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
});

// ===========================================
// API ROUTES
// ===========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/services', apiLimiter, servicesRoutes);
app.use('/api/admin', adminLimiter, rebuildMiddleware, adminRoutes);

// Apply stricter rate limit to admin lead submission
app.post('/api/admin/leads', contactLimiter);

// ===========================================
// STATIC FILES
// ===========================================

// EJS setup for rendering pages
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Helper to load JSON data
function loadData(filename) {
  try {
    const filePath = path.join(appPaths.data, filename);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) { /* ignore */ }
  return {};
}

// Common template data
function getCommonData() {
  const settings = loadData('settings.json');
  const navConfig = loadData('nav-config.json');
  const services = loadData('services.json');
  return { settings, navConfig, services, BASE_URL };
}

// Render a page inside base.ejs
const ejs = require('ejs');
function renderPage(res, template, data) {
  const viewsDir = path.join(__dirname, 'views');
  const templatePath = path.join(viewsDir, `${template}.ejs`);
  
  // Render the inner page
  ejs.renderFile(templatePath, data, (err, bodyHtml) => {
    if (err) {
      console.error(`Error rendering ${template}:`, err.message);
      return res.status(500).send('Rendering error');
    }
    // Render base.ejs with the body injected
    ejs.renderFile(path.join(viewsDir, 'base.ejs'), { ...data, body: bodyHtml }, (err2, fullHtml) => {
      if (err2) {
        console.error('Error rendering base:', err2.message);
        return res.status(500).send('Rendering error');
      }
      res.send(fullHtml);
    });
  });
}

// Serve static assets from build/
app.use(express.static(buildDir));

// Admin panel (React SPA)
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use('/admin', express.static(frontendDist));
  
  app.get('/admin*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// ========== PAGE ROUTES ==========

// Homepage
app.get('/', (req, res) => {
  const common = getCommonData();
  const homepage = loadData('homepage.json');
  const testimonials = loadData('testimonials.json');
  const gallery = loadData('gallery.json');
  renderPage(res, 'home', {
    ...common,
    homepage,
    testimonials,
    gallery,
    title: `${common.settings.companyName || 'BuildPro Demo Co'} - ${common.settings.tagline || 'Quality Work, Every Time'}`,
    description: common.settings.metaDescription || 'Professional contracting services.',
    canonicalUrl: BASE_URL,
  });
});

// Services page
app.get('/services', (req, res) => {
  const common = getCommonData();
  renderPage(res, 'service', {
    ...common,
    title: `Our Services | ${common.settings.companyName || 'BuildPro Demo Co'}`,
    description: 'View our full range of professional services.',
    canonicalUrl: `${BASE_URL}/services`,
    service: null,
  });
});

// Individual service
app.get('/services/:slug', (req, res) => {
  const common = getCommonData();
  const services = Array.isArray(common.services) ? common.services : [];
  const service = services.find(s => s.slug === req.params.slug || s.id === req.params.slug);
  if (!service) res.status(404); return renderPage(res, '404', { ...common, title: 'Not Found', description: '', canonicalUrl: BASE_URL });
  renderPage(res, 'service', {
    ...common,
    service,
    title: `${service.name} | ${common.settings.companyName || 'BuildPro Demo Co'}`,
    description: service.description || '',
    canonicalUrl: `${BASE_URL}/services/${service.slug || service.id}`,
  });
});

// Sub-service
app.get('/services/:slug/:sub', (req, res) => {
  const common = getCommonData();
  const services = Array.isArray(common.services) ? common.services : [];
  const service = services.find(s => s.slug === req.params.slug || s.id === req.params.slug);
  const sub = service && service.subServices ? service.subServices.find(s => s.slug === req.params.sub || s.id === req.params.sub) : null;
  renderPage(res, 'subservice', {
    ...common,
    service: service || {},
    subservice: sub || {},
    title: `${sub ? sub.name : 'Service'} | ${common.settings.companyName || 'BuildPro Demo Co'}`,
    description: sub ? sub.description || '' : '',
    canonicalUrl: `${BASE_URL}/services/${req.params.slug}/${req.params.sub}`,
  });
});

// Gallery
app.get('/gallery', (req, res) => {
  const common = getCommonData();
  const gallery = loadData('gallery.json');
  renderPage(res, 'gallery', {
    ...common,
    gallery,
    title: `Gallery | ${common.settings.companyName || 'BuildPro Demo Co'}`,
    description: 'Browse our project gallery.',
    canonicalUrl: `${BASE_URL}/gallery`,
  });
});

// Blog
app.get('/blog', (req, res) => {
  const common = getCommonData();
  const posts = loadData('posts.json');
  renderPage(res, 'blog', {
    ...common,
    posts: Array.isArray(posts) ? posts.filter(p => p.published) : [],
    title: `Blog | ${common.settings.companyName || 'BuildPro Demo Co'}`,
    description: 'Read our latest posts.',
    canonicalUrl: `${BASE_URL}/blog`,
  });
});

// Blog post
app.get('/blog/:slug', (req, res) => {
  const common = getCommonData();
  const posts = loadData('posts.json');
  const post = Array.isArray(posts) ? posts.find(p => p.slug === req.params.slug) : null;
  if (!post) res.status(404); return renderPage(res, '404', { ...common, title: 'Not Found', description: '', canonicalUrl: BASE_URL });
  renderPage(res, 'blog-post', {
    ...common,
    post,
    title: `${post.title} | ${common.settings.companyName || 'BuildPro Demo Co'}`,
    description: post.excerpt || '',
    canonicalUrl: `${BASE_URL}/blog/${post.slug}`,
  });
});

// Contact
app.get('/contact', (req, res) => {
  const common = getCommonData();
  renderPage(res, 'contact', {
    ...common,
    title: `Contact Us | ${common.settings.companyName || 'BuildPro Demo Co'}`,
    description: 'Get in touch with us today.',
    canonicalUrl: `${BASE_URL}/contact`,
  });
});

// Visualize (static HTML)
app.get('/visualize', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'visualize.html'));
});

// Custom pages
app.get('/:slug', (req, res, next) => {
  // Skip API and admin routes
  if (req.params.slug === 'api' || req.params.slug === 'admin' || req.params.slug === 'uploads') return next();
  
  const common = getCommonData();
  const pages = loadData('pages.json');
  const page = Array.isArray(pages) ? pages.find(p => p.slug === req.params.slug && p.published) : null;
  
  if (!page) {
    res.status(404); return renderPage(res, '404', { ...common, title: 'Not Found', description: '', canonicalUrl: BASE_URL });
  }
  
  renderPage(res, 'custom-page', {
    ...common,
    page,
    title: `${page.title} | ${common.settings.companyName || 'BuildPro Demo Co'}`,
    description: page.description || '',
    canonicalUrl: `${BASE_URL}/${page.slug}`,
  });
});

// 404 fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const common = getCommonData();
  res.status(404); renderPage(res, '404', { ...common, title: 'Not Found', description: '', canonicalUrl: BASE_URL });
});

// ===========================================
// ERROR HANDLING
// ===========================================

// API 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
  res.status(500).send('Something went wrong. Please try again.');
});

// ===========================================
// START SERVER
// ===========================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🏠 BuildPro Demo Co                                  ║
║                                                            ║
║   Server running on port ${PORT}                             ║
║   Environment: ${process.env.NODE_ENV || 'development'}                            ║
║   Uploads: ${uploadsDir}
║   Mode: ${hasBuild && process.env.NODE_ENV === 'production' ? 'Static Site (SSG)' : 'Development (SPA)'}              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);

  startBackups();
});

module.exports = app;
