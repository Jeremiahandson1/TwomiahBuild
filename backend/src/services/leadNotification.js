/**
 * Lead Notification Service
 *
 * Fires an SMS alert to the contractor within 90 seconds whenever a new
 * lead contact is created. This is the core of the marketing automation
 * value prop — speed-to-lead beats everything.
 *
 * Configuration is stored in company.settings.leadNotifications:
 *   {
 *     enabled: boolean,
 *     notifyPhone: string,   // contractor's cell — defaults to company.phone
 *     notifyEmail: string,   // contractor's email — defaults to company.email
 *     smsEnabled: boolean,
 *     emailEnabled: boolean,
 *   }
 */

import twilio from 'twilio';
import { prisma } from '../config/prisma.js';
import { sendTransactionalEmail } from './email.js';

// ─── Twilio client (shared platform creds, falls back gracefully) ─────────────
let twilioClient = null;
const PLATFORM_SID   = process.env.TWILIO_ACCOUNT_SID;
const PLATFORM_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const PLATFORM_PHONE = process.env.TWILIO_PHONE_NUMBER;

if (PLATFORM_SID && PLATFORM_TOKEN) {
  try {
    twilioClient = twilio(PLATFORM_SID, PLATFORM_TOKEN);
  } catch {
    console.warn('[LeadNotify] Twilio init failed — SMS disabled');
  }
}

// ─── Main entrypoint ──────────────────────────────────────────────────────────

/**
 * Fire lead alert for a newly created lead contact.
 * Called non-blocking (fire-and-forget) from contacts route.
 *
 * @param {string} companyId
 * @param {object} contact  — the newly created contact record
 */
export async function notifyNewLead(companyId, contact) {
  // Only fire for leads
  if (contact.type !== 'lead') return;

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, phone: true, email: true, settings: true },
    });
    if (!company) return;

    const cfg = (company.settings?.leadNotifications) || {};
    if (cfg.enabled === false) return; // explicitly disabled

    const notifyPhone = cfg.notifyPhone || company.phone;
    const notifyEmail = cfg.notifyEmail || company.email;
    const smsEnabled  = cfg.smsEnabled !== false; // on by default
    const emailEnabled = cfg.emailEnabled !== false;

    const leadName  = contact.name  || 'New Lead';
    const leadPhone = contact.phone || contact.mobile || 'No phone';
    const leadEmail = contact.email || 'No email';
    const source    = contact.source ? ` via ${contact.source}` : '';

    const smsBody =
      `🔔 New lead${source}: ${leadName}\n` +
      `📞 ${leadPhone}  ✉️ ${leadEmail}\n` +
      `Reply fast — speed wins jobs. Open BuildPro to respond.`;

    const promises = [];

    // SMS alert
    if (smsEnabled && notifyPhone && twilioClient) {
      promises.push(
        twilioClient.messages
          .create({ to: notifyPhone, from: PLATFORM_PHONE, body: smsBody })
          .catch(err => console.error('[LeadNotify] SMS error:', err.message))
      );
    }

    // Email alert
    if (emailEnabled && notifyEmail) {
      promises.push(
        sendLeadAlertEmail(notifyEmail, company.name, contact, source)
          .catch(err => console.error('[LeadNotify] Email error:', err.message))
      );
    }

    await Promise.allSettled(promises);

    // Log notification
    await prisma.auditLog.create({
      data: {
        companyId,
        action: 'LEAD_NOTIFICATION_SENT',
        entity: 'contact',
        entityId: contact.id,
        entityName: contact.name,
        metadata: { smsEnabled, emailEnabled, notifyPhone: notifyPhone ? '✓' : '✗' },
      },
    }).catch(() => {}); // non-critical

  } catch (err) {
    // Never let notification failure bubble up to the contact creation response
    console.error('[LeadNotify] Unexpected error:', err.message);
  }
}

// ─── Email helper ─────────────────────────────────────────────────────────────

async function sendLeadAlertEmail(to, companyName, contact, source) {
  const subject = `🔔 New lead: ${contact.name || 'Unknown'}${source}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background: #f97316; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">New Lead Alert</h2>
        <p style="margin: 4px 0 0; opacity: .85;">${companyName}</p>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #6b7280; width: 100px;">Name</td>
              <td style="padding: 6px 0; font-weight: 600;">${contact.name || '—'}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Phone</td>
              <td style="padding: 6px 0;">${contact.phone || contact.mobile || '—'}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Email</td>
              <td style="padding: 6px 0;">${contact.email || '—'}</td></tr>
          ${source ? `<tr><td style="padding: 6px 0; color: #6b7280;">Source</td>
              <td style="padding: 6px 0;">${source.replace(' via ', '')}</td></tr>` : ''}
          ${contact.notes ? `<tr><td style="padding: 6px 0; color: #6b7280;">Notes</td>
              <td style="padding: 6px 0;">${contact.notes}</td></tr>` : ''}
        </table>
        <div style="margin-top: 24px; padding: 12px; background: #fef3c7; border-radius: 6px; font-size: 14px; color: #92400e;">
          ⚡ Respond within 5 minutes — leads contacted quickly are 9× more likely to convert.
        </div>
        <div style="margin-top: 16px; text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'https://app.buildpro.io'}/contacts"
             style="display: inline-block; background: #f97316; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Open in BuildPro →
          </a>
        </div>
      </div>
    </div>
  `;

  // Use whatever email service is wired in
  if (typeof sendTransactionalEmail === 'function') {
    return sendTransactionalEmail({ to, subject, html });
  }

  // Fallback: try SendGrid directly if available
  if (process.env.SENDGRID_API_KEY) {
    const { default: sgMail } = await import('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    return sgMail.send({
      to,
      from: process.env.DEFAULT_FROM_EMAIL || 'noreply@buildpro.io',
      subject,
      html,
    });
  }

  console.log('[LeadNotify] No email provider configured — skipping email alert');
}

// ─── Settings helpers (used by API routes) ────────────────────────────────────

export async function getLeadNotificationSettings(companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { phone: true, email: true, settings: true },
  });

  const cfg = company?.settings?.leadNotifications || {};
  return {
    enabled:       cfg.enabled      !== false,
    smsEnabled:    cfg.smsEnabled   !== false,
    emailEnabled:  cfg.emailEnabled !== false,
    notifyPhone:   cfg.notifyPhone  || company?.phone  || '',
    notifyEmail:   cfg.notifyEmail  || company?.email  || '',
  };
}

export async function updateLeadNotificationSettings(companyId, updates) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { settings: true },
  });

  const existing = company?.settings || {};
  return prisma.company.update({
    where: { id: companyId },
    data: {
      settings: {
        ...existing,
        leadNotifications: {
          ...(existing.leadNotifications || {}),
          ...updates,
        },
      },
    },
  });
}

export default { notifyNewLead, getLeadNotificationSettings, updateLeadNotificationSettings };
