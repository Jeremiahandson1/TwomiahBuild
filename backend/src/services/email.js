/**
 * Multi-Provider Email Service
 * 
 * Supports: SendGrid, Mailgun, AWS SES, Resend, Postmark, SMTP
 * 
 * Just set ONE of these env vars:
 *   - SENDGRID_API_KEY
 *   - MAILGUN_API_KEY + MAILGUN_DOMAIN
 *   - AWS_SES_REGION + AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY
 *   - RESEND_API_KEY
 *   - POSTMARK_API_KEY
 *   - SMTP_HOST + SMTP_PORT + SMTP_USER + SMTP_PASS
 */

import nodemailer from 'nodemailer';
import logger from './logger.js';

// Config
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@twomiah-build.app';
const FROM_NAME = process.env.FROM_NAME || 'Twomiah Build';
const APP_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Detect which provider is configured
function getProvider() {
  if (process.env.SENDGRID_API_KEY) return 'sendgrid';
  if (process.env.MAILGUN_API_KEY) return 'mailgun';
  if (process.env.AWS_SES_REGION) return 'ses';
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.POSTMARK_API_KEY) return 'postmark';
  if (process.env.SMTP_HOST) return 'smtp';
  return 'console'; // Dev mode - just log
}

// Create transporter based on provider
function createTransporter() {
  const provider = getProvider();
  
  switch (provider) {
    case 'sendgrid':
      return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      });
    
    case 'mailgun':
      return nodemailer.createTransport({
        host: 'smtp.mailgun.org',
        port: 587,
        auth: {
          user: `postmaster@${process.env.MAILGUN_DOMAIN}`,
          pass: process.env.MAILGUN_API_KEY,
        },
      });
    
    case 'ses':
      return nodemailer.createTransport({
        host: `email-smtp.${process.env.AWS_SES_REGION}.amazonaws.com`,
        port: 587,
        auth: {
          user: process.env.AWS_SES_SMTP_USER || process.env.AWS_ACCESS_KEY_ID,
          pass: process.env.AWS_SES_SMTP_PASS || process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
    
    case 'resend':
      return nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: {
          user: 'resend',
          pass: process.env.RESEND_API_KEY,
        },
      });
    
    case 'postmark':
      return nodemailer.createTransport({
        host: 'smtp.postmarkapp.com',
        port: 587,
        auth: {
          user: process.env.POSTMARK_API_KEY,
          pass: process.env.POSTMARK_API_KEY,
        },
      });
    
    case 'smtp':
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        } : undefined,
      });
    
    default:
      return null; // Console mode
  }
}

const transporter = createTransporter();
const PROVIDER = getProvider();

console.log(`📧 Email provider: ${PROVIDER}`);

// ============================================
// EMAIL TEMPLATES
// ============================================

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: #f97316; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
  .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
  .button { display: inline-block; background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
  .button-secondary { background: #6b7280; }
  .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  .highlight { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
  .amount { font-size: 32px; font-weight: bold; color: #f97316; text-align: center; padding: 20px; }
`;

const templates = {
  // ============ AUTH ============
  passwordReset: (data) => ({
    subject: 'Reset Your Password',
    html: `
      <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
      <body><div class="container">
        <div class="header"><h1 style="margin:0;">Twomiah Build</h1></div>
        <div class="content">
          <h2>Password Reset</h2>
          <p>Hi ${data.firstName},</p>
          <p>Use this code to reset your password:</p>
          <div class="highlight" style="text-align:center;font-size:24px;letter-spacing:4px;font-family:monospace;">${data.resetCode}</div>
          <p style="text-align:center;"><a href="${APP_URL}/reset-password?token=${data.resetToken}" class="button">Reset Password</a></p>
          <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        </div>
        <div class="footer">&copy; ${new Date().getFullYear()} Twomiah Build</div>
      </div></body></html>
    `,
    text: `Hi ${data.firstName}, your password reset code is: ${data.resetCode}\n\nOr visit: ${APP_URL}/reset-password?token=${data.resetToken}\n\nExpires in 1 hour.`,
  }),

  welcome: (data) => ({
    subject: 'Welcome to Twomiah Build!',
    html: `
      <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
      <body><div class="container">
        <div class="header"><h1 style="margin:0;">Welcome to Twomiah Build!</h1></div>
        <div class="content">
          <h2>Hi ${data.firstName},</h2>
          <p>Your account for <strong>${data.companyName}</strong> is ready.</p>
          <p style="text-align:center;"><a href="${APP_URL}/login" class="button">Get Started</a></p>
          <p>Here's what you can do:</p>
          <ul>
            <li>Manage projects and jobs</li>
            <li>Track contacts and clients</li>
            <li>Create quotes and invoices</li>
            <li>Daily logs and inspections</li>
          </ul>
        </div>
        <div class="footer">&copy; ${new Date().getFullYear()} Twomiah Build</div>
      </div></body></html>
    `,
    text: `Welcome ${data.firstName}! Your account for ${data.companyName} is ready. Login: ${APP_URL}/login`,
  }),

  // ============ INVOICES ============
  invoiceSent: (data) => ({
    subject: `Invoice ${data.invoiceNumber} from ${data.companyName}`,
    html: `
      <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
      <body><div class="container">
        <div class="header"><h1 style="margin:0;">${data.companyName}</h1></div>
        <div class="content">
          <h2>Invoice ${data.invoiceNumber}</h2>
          <p>Hi ${data.contactName},</p>
          <div class="amount">$${Number(data.total).toLocaleString()}</div>
          <div class="highlight">
            <p><strong>Invoice #:</strong> ${data.invoiceNumber}</p>
            <p><strong>Due Date:</strong> ${data.dueDate}</p>
            <p><strong>Balance:</strong> $${Number(data.balance).toLocaleString()}</p>
          </div>
          ${data.paymentLink ? `<p style="text-align:center;"><a href="${data.paymentLink}" class="button">Pay Now</a></p>` : ''}
        </div>
        <div class="footer">${data.companyName}<br>${data.companyEmail || ''}</div>
      </div></body></html>
    `,
    text: `Invoice ${data.invoiceNumber} from ${data.companyName}\n\nAmount: $${data.total}\nDue: ${data.dueDate}`,
  }),

  invoiceReminder: (data) => ({
    subject: `Reminder: Invoice ${data.invoiceNumber} due ${data.dueDate}`,
    html: `
      <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
      <body><div class="container">
        <div class="header"><h1 style="margin:0;">${data.companyName}</h1></div>
        <div class="content">
          <h2>Payment Reminder</h2>
          <p>Hi ${data.contactName},</p>
          <p>This is a friendly reminder that invoice ${data.invoiceNumber} is due on <strong>${data.dueDate}</strong>.</p>
          <div class="amount">$${Number(data.balance).toLocaleString()}</div>
          ${data.paymentLink ? `<p style="text-align:center;"><a href="${data.paymentLink}" class="button">Pay Now</a></p>` : ''}
        </div>
        <div class="footer">${data.companyName}</div>
      </div></body></html>
    `,
    text: `Reminder: Invoice ${data.invoiceNumber} for $${data.balance} is due ${data.dueDate}.`,
  }),

  invoiceOverdue: (data) => ({
    subject: `Overdue: Invoice ${data.invoiceNumber} - ${data.daysOverdue} days past due`,
    html: `
      <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
      <body><div class="container">
        <div class="header" style="background:#dc2626;"><h1 style="margin:0;">Payment Overdue</h1></div>
        <div class="content">
          <p>Hi ${data.contactName},</p>
          <p>Invoice ${data.invoiceNumber} is <strong>${data.daysOverdue} days overdue</strong>.</p>
          <div class="amount" style="color:#dc2626;">$${Number(data.balance).toLocaleString()}</div>
          <p>Please remit payment as soon as possible.</p>
          ${data.paymentLink ? `<p style="text-align:center;"><a href="${data.paymentLink}" class="button" style="background:#dc2626;">Pay Now</a></p>` : ''}
        </div>
        <div class="footer">${data.companyName}</div>
      </div></body></html>
    `,
    text: `OVERDUE: Invoice ${data.invoiceNumber} is ${data.daysOverdue} days past due. Balance: $${data.balance}`,
  }),

  paymentReceived: (data) => ({
    subject: `Payment received - Invoice ${data.invoiceNumber}`,
    html: `
      <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
      <body><div class="container">
        <div class="header" style="background:#16a34a;"><h1 style="margin:0;">Payment Received</h1></div>
        <div class="content">
          <p>Hi ${data.contactName},</p>
          <p>Thank you! We received your payment.</p>
          <div class="highlight">
            <p><strong>Amount:</strong> $${Number(data.amount).toLocaleString()}</p>
            <p><strong>Invoice:</strong> ${data.invoiceNumber}</p>
            <p><strong>Remaining Balance:</strong> $${Number(data.remainingBalance).toLocaleString()}</p>
          </div>
        </div>
        <div class="footer">${data.companyName}</div>
      </div></body></html>
    `,
    text: `Payment of $${data.amount} received for invoice ${data.invoiceNumber}. Remaining: $${data.remainingBalance}`,
  }),

  // ============ QUOTES ============
  quoteSent: (data) => ({
    subject: `Quote from ${data.companyName}: ${data.quoteName}`,
    html: `
      <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
      <body><div class="container">
        <div class="header"><h1 style="margin:0;">${data.companyName}</h1></div>
        <div class="content">
          <h2>${data.quoteName}</h2>
          <p>Hi ${data.contactName},</p>
          <p>Thank you for the opportunity to provide this quote.</p>
          <div class="amount">$${Number(data.total).toLocaleString()}</div>
          <p><strong>Valid until:</strong> ${data.expiryDate}</p>
          <p style="text-align:center;">
            ${data.approveLink ? `<a href="${data.approveLink}" class="button">Approve Quote</a>` : ''}
            ${data.viewLink ? `<a href="${data.viewLink}" class="button button-secondary">View Details</a>` : ''}
          </p>
        </div>
        <div class="footer">${data.companyName}</div>
      </div></body></html>
    `,
    text: `Quote from ${data.companyName}: ${data.quoteName}\n\nTotal: $${data.total}\nValid until: ${data.expiryDate}`,
  }),

  quoteApproved: (data) => ({
    subject: `Quote ${data.quoteNumber} has been approved!`,
    html: `
      <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
      <body><div class="container">
        <div class="header" style="background:#16a34a;"><h1 style="margin:0;">Quote Approved!</h1></div>
        <div class="content">
          <p>${data.contactName} has approved quote <strong>${data.quoteNumber}</strong>.</p>
          <div class="highlight">
            <p><strong>Project:</strong> ${data.projectName || 'N/A'}</p>
            <p><strong>Amount:</strong> $${Number(data.total).toLocaleString()}</p>
          </div>
          <p style="text-align:center;"><a href="${APP_URL}/quotes/${data.quoteId}" class="button">View Quote</a></p>
        </div>
        <div class="footer">Twomiah Build</div>
      </div></body></html>
    `,
    text: `Quote ${data.quoteNumber} approved by ${data.contactName}. Amount: $${data.total}`,
  }),

  // ============ JOBS ============
  jobAssigned: (data) => ({
    subject: `New job assigned: ${data.jobTitle}`,
    html: `
      <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
      <body><div class="container">
        <div class="header"><h1 style="margin:0;">Job Assigned</h1></div>
        <div class="content">
          <h2>${data.jobTitle}</h2>
          <p>Hi ${data.assigneeName},</p>
          <p>You've been assigned a new job.</p>
          <div class="highlight">
            <p><strong>Job #:</strong> ${data.jobNumber}</p>
            <p><strong>Scheduled:</strong> ${data.scheduledDate}</p>
            <p><strong>Location:</strong> ${data.address || 'See job details'}</p>
            ${data.description ? `<p><strong>Notes:</strong> ${data.description}</p>` : ''}
          </div>
          <p style="text-align:center;"><a href="${APP_URL}/jobs/${data.jobId}" class="button">View Job</a></p>
        </div>
        <div class="footer">Twomiah Build</div>
      </div></body></html>
    `,
    text: `New job assigned: ${data.jobTitle}\n\nJob #: ${data.jobNumber}\nScheduled: ${data.scheduledDate}\nLocation: ${data.address || 'See details'}`,
  }),

  jobStatusChanged: (data) => ({
    subject: `Job ${data.jobNumber} is now ${data.newStatus}`,
    html: `
      <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
      <body><div class="container">
        <div class="header"><h1 style="margin:0;">Job Update</h1></div>
        <div class="content">
          <h2>${data.jobTitle}</h2>
          <p>Job status has been updated.</p>
          <div class="highlight">
            <p><strong>Status:</strong> ${data.oldStatus} → <strong>${data.newStatus}</strong></p>
            ${data.updatedBy ? `<p><strong>Updated by:</strong> ${data.updatedBy}</p>` : ''}
          </div>
          <p style="text-align:center;"><a href="${APP_URL}/jobs/${data.jobId}" class="button">View Job</a></p>
        </div>
        <div class="footer">Twomiah Build</div>
      </div></body></html>
    `,
    text: `Job ${data.jobNumber} status changed: ${data.oldStatus} → ${data.newStatus}`,
  }),

  // ============ DAILY DIGEST ============
  dailyDigest: (data) => ({
    subject: `Daily Summary - ${data.date}`,
    html: `
      <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
      <body><div class="container">
        <div class="header"><h1 style="margin:0;">Daily Summary</h1></div>
        <div class="content">
          <p>Hi ${data.userName},</p>
          <p>Here's your summary for ${data.date}:</p>
          <div class="highlight">
            <p><strong>Jobs Today:</strong> ${data.jobsToday || 0}</p>
            <p><strong>Overdue Invoices:</strong> ${data.overdueInvoices || 0}</p>
            <p><strong>Pending Quotes:</strong> ${data.pendingQuotes || 0}</p>
            <p><strong>New Leads:</strong> ${data.newLeads || 0}</p>
          </div>
          ${data.upcomingJobs?.length ? `
            <h3>Upcoming Jobs</h3>
            <ul>${data.upcomingJobs.map(j => `<li>${j.title} - ${j.date}</li>`).join('')}</ul>
          ` : ''}
          <p style="text-align:center;"><a href="${APP_URL}" class="button">Open Dashboard</a></p>
        </div>
        <div class="footer">Twomiah Build</div>
      </div></body></html>
    `,
    text: `Daily Summary for ${data.date}\n\nJobs: ${data.jobsToday}\nOverdue Invoices: ${data.overdueInvoices}\nPending Quotes: ${data.pendingQuotes}`,
  }),

  // ============ TEAM ============
  teamInvite: (data) => ({
    subject: `You're invited to join ${data.companyName} on Twomiah Build`,
    html: `
      <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
      <body><div class="container">
        <div class="header"><h1 style="margin:0;">You're Invited!</h1></div>
        <div class="content">
          <p>Hi,</p>
          <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.companyName}</strong> on Twomiah Build.</p>
          <p>Your role: <strong>${data.role}</strong></p>
          <p style="text-align:center;"><a href="${data.inviteLink}" class="button">Accept Invitation</a></p>
          <p>This invitation expires in 7 days.</p>
        </div>
        <div class="footer">Twomiah Build</div>
      </div></body></html>
    `,
    text: `${data.inviterName} invited you to join ${data.companyName} on Twomiah Build.\n\nAccept: ${data.inviteLink}`,
  }),

  // ============ PORTAL ============
  portalInvite: (data) => ({
    subject: `Access your account with ${data.companyName}`,
    html: `
      <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
      <body><div class="container">
        <div class="header"><h1 style="margin:0;">${data.companyName}</h1></div>
        <div class="content">
          <h2>Your Customer Portal</h2>
          <p>Hi ${data.contactName},</p>
          <p>You can now view your projects, quotes, and invoices online.</p>
          <p style="text-align:center;"><a href="${data.portalUrl}" class="button">Access Your Portal</a></p>
          <div class="highlight">
            <p>With your portal you can:</p>
            <ul style="margin:0;padding-left:20px;">
              <li>View project progress</li>
              <li>Review and approve quotes</li>
              <li>View and download invoices</li>
              <li>Track payment history</li>
            </ul>
          </div>
          <p><small>This link is unique to you. Do not share it with others.</small></p>
        </div>
        <div class="footer">${data.companyName}</div>
      </div></body></html>
    `,
    text: `Hi ${data.contactName}, access your customer portal for ${data.companyName}: ${data.portalUrl}`,
  }),

  // ============ BOOKING ============
  bookingConfirmation: (data) => ({
    subject: `Booking Confirmed — ${data.serviceName} on ${data.scheduledDate}`,
    html: `
      <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
      <body><div class="container">
        <div class="header"><h1 style="margin:0;">${data.companyName}</h1></div>
        <div class="content">
          <h2>Your Appointment is Confirmed!</h2>
          <p>Hi ${data.customerName},</p>
          <p>We've received your booking and look forward to seeing you.</p>
          <div class="highlight">
            <p><strong>Service:</strong> ${data.serviceName}</p>
            <p><strong>Date:</strong> ${data.scheduledDate}</p>
            <p><strong>Time:</strong> ${data.scheduledTime}</p>
            <p><strong>Confirmation Code:</strong> <span style="font-family:monospace;font-size:18px;letter-spacing:2px;">${data.confirmationCode}</span></p>
            ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
          </div>
          <p>If you need to reschedule or have questions, please contact us directly and reference your confirmation code.</p>
        </div>
        <div class="footer">${data.companyName}</div>
      </div></body></html>
    `,
    text: `Booking Confirmed!\n\nHi ${data.customerName},\n\nService: ${data.serviceName}\nDate: ${data.scheduledDate}\nTime: ${data.scheduledTime}\nConfirmation Code: ${data.confirmationCode}\n\nContact us to reschedule.`,
  }),

  // ============ INVENTORY ============
  lowStock: (data) => ({
    subject: `⚠️ Low Stock Alert: ${data.itemName}`,
    html: `
      <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
      <body><div class="container">
        <div class="header"><h1 style="margin:0;">${data.companyName}</h1></div>
        <div class="content">
          <h2>⚠️ Low Stock Alert</h2>
          <p>An inventory item has dropped to or below its reorder point.</p>
          <div class="highlight">
            <p><strong>Item:</strong> ${data.itemName}</p>
            ${data.sku ? `<p><strong>SKU:</strong> ${data.sku}</p>` : ''}
            <p><strong>Current Quantity:</strong> <span style="color:#ef4444;font-weight:bold;">${data.currentQuantity} ${data.unit || 'units'}</span></p>
            <p><strong>Reorder Point:</strong> ${data.reorderPoint} ${data.unit || 'units'}</p>
            ${data.reorderQuantity ? `<p><strong>Suggested Reorder Qty:</strong> ${data.reorderQuantity}</p>` : ''}
          </div>
          <p>Please review your inventory and place a reorder as needed.</p>
        </div>
        <div class="footer">${data.companyName}</div>
      </div></body></html>
    `,
    text: `Low Stock Alert: ${data.itemName}\n\nCurrent stock: ${data.currentQuantity} ${data.unit || 'units'}\nReorder point: ${data.reorderPoint}\n\nPlease reorder soon.`,
  }),

  subscriptionPaymentFailed: (data) => ({
    subject: `Action Required: Payment Failed for ${data.companyName}`,
    html: `
      <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
      <body><div class="container">
        <div class="header"><h1 style="margin:0;">Twomiah Build</h1></div>
        <div class="content">
          <h2>⚠️ Payment Failed</h2>
          <p>Hi ${data.firstName || 'there'},</p>
          <p>We were unable to process your Twomiah Build subscription payment.</p>
          <div class="highlight">
            <p><strong>Account:</strong> ${data.companyName}</p>
            ${data.amount ? `<p><strong>Amount:</strong> $${data.amount}</p>` : ''}
            ${data.nextAttempt ? `<p><strong>Next Retry:</strong> ${data.nextAttempt}</p>` : ''}
          </div>
          <p>To keep your account active, please update your payment method or ensure your card has sufficient funds.</p>
          <p><a href="${data.billingUrl || 'https://app.twomiah-build.com/settings/billing'}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">Update Payment Method</a></p>
          <p style="color:#6b7280;font-size:14px;margin-top:16px;">If you need help, reply to this email or contact support.</p>
        </div>
        <div class="footer">Twomiah Build</div>
      </div></body></html>
    `,
    text: `Payment Failed for ${data.companyName}\n\nWe were unable to process your subscription payment. Please update your payment method to keep your account active.\n\nVisit your billing settings: ${data.billingUrl || 'https://app.twomiah-build.com/settings/billing'}`,
  }),
};

// ============================================
// SEND FUNCTION
// ============================================

async function send(to, templateName, data, options = {}) {
  const template = templates[templateName];
  if (!template) {
    throw new Error(`Email template '${templateName}' not found`);
  }

  const { subject, html, text } = template(data);
  
  // Override from if provided (for company-branded emails)
  const from = options.from || { name: FROM_NAME, address: FROM_EMAIL };

  // Console mode (no provider configured)
  if (!transporter) {
    console.log('\n📧 EMAIL (dev mode):');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Template:', templateName);
    console.log('---');
    console.log(text);
    console.log('---\n');
    return { success: true, dev: true };
  }

  try {
    const result = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
      ...options,
    });
    
    logger.info('Email sent', { to, subject, template: templateName, provider: PROVIDER });
    return { success: true, messageId: result.messageId };
  } catch (error) {
    logger.error('Email failed', { to, template: templateName, error: error.message });
    throw error;
  }
}

// ============================================
// CONVENIENCE METHODS
// ============================================

const emailService = {
  send,
  PROVIDER,
  
  // Auth
  sendPasswordReset: (to, data) => send(to, 'passwordReset', data),
  sendWelcome: (to, data) => send(to, 'welcome', data),
  sendTeamInvite: (to, data) => send(to, 'teamInvite', data),
  
  // Invoices
  sendInvoice: (to, data) => send(to, 'invoiceSent', data),
  sendInvoiceReminder: (to, data) => send(to, 'invoiceReminder', data),
  sendInvoiceOverdue: (to, data) => send(to, 'invoiceOverdue', data),
  sendPaymentReceived: (to, data) => send(to, 'paymentReceived', data),
  
  // Quotes
  sendQuote: (to, data) => send(to, 'quoteSent', data),
  sendQuoteApproved: (to, data) => send(to, 'quoteApproved', data),
  
  // Jobs
  sendJobAssigned: (to, data) => send(to, 'jobAssigned', data),
  sendJobStatusChanged: (to, data) => send(to, 'jobStatusChanged', data),
  
  // Billing
  sendSubscriptionPaymentFailed: (to, data) => send(to, 'subscriptionPaymentFailed', data),

  // Digest
  sendDailyDigest: (to, data) => send(to, 'dailyDigest', data),
};

/**
 * sendTransactionalEmail — send a raw HTML email without a named template.
 * Used by lead notifications, ad reports, CPL alerts, and other ad-hoc emails.
 */
export async function sendTransactionalEmail({ to, subject, html, text, fromName }) {
  const transporter = createTransporter();
  const from = fromName
    ? `${fromName} <${FROM_EMAIL}>`
    : `${FROM_NAME} <${FROM_EMAIL}>`;

  await transporter.sendMail({ from, to, subject, html, text: text || '' });
}

export default emailService;
export { emailService, send, templates };
