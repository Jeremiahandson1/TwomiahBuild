/**
 * Ad Reporting Service
 *
 * - Monthly performance report (fires on 1st of each month)
 * - Cost-per-lead alert emails
 * - Multi-client admin dashboard aggregation
 * - Revenue attribution (links ad leads to CRM jobs)
 */

import { prisma } from '../../config/prisma.js';
import email from '../email.js';

const APP_URL  = process.env.FRONTEND_URL || 'https://app.buildpro.io';
const FROM     = process.env.FROM_EMAIL   || 'reports@buildpro.io';
const FROM_NAME = 'BuildPro Reports';

// ─── Monthly report ───────────────────────────────────────────────────────────

/**
 * Generate and email monthly report for a company.
 * Called by cron on 1st of each month, or manually triggered.
 */
export async function generateMonthlyReport(companyId, periodStart, periodEnd) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, email: true, settings: true },
  });
  if (!company) throw new Error('Company not found');

  // Pull all active campaigns with metrics
  const campaigns = await prisma.adCampaign.findMany({
    where: {
      companyId,
      createdAt: { lte: periodEnd },
    },
    include: { adAccount: { select: { platform: true, accountName: true } } },
  });

  // Aggregate metrics
  const totals = campaigns.reduce((acc, c) => ({
    spend:       acc.spend       + Number(c.totalSpend || 0),
    leads:       acc.leads       + (c.leads || 0),
    clicks:      acc.clicks      + (c.clicks || 0),
    impressions: acc.impressions + (c.impressions || 0),
  }), { spend: 0, leads: 0, clicks: 0, impressions: 0 });

  totals.costPerLead = totals.leads > 0 ? totals.spend / totals.leads : 0;
  totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100) : 0;

  // Revenue attribution — count jobs created from leads in this period
  const attribution = await attributeRevenue(companyId, periodStart, periodEnd);
  totals.revenueAttributed = attribution.revenue;
  totals.jobsAttributed    = attribution.jobs;
  totals.roi = totals.spend > 0 ? ((totals.revenueAttributed - totals.spend) / totals.spend * 100) : 0;

  // Create report record
  const report = await prisma.adReport.create({
    data: {
      companyId,
      reportType: 'monthly',
      periodStart,
      periodEnd,
      totalSpend:        totals.spend,
      totalLeads:        totals.leads,
      totalClicks:       totals.clicks,
      costPerLead:       totals.costPerLead,
      conversionRate:    totals.leads > 0 ? totals.leads / totals.clicks : 0,
      revenueAttributed: totals.revenueAttributed,
      jobsAttributed:    totals.jobsAttributed,
      rawData:           { campaigns: campaigns.map(c => ({ id: c.id, name: c.name, platform: c.platform, spend: c.totalSpend, leads: c.leads, clicks: c.clicks })) },
      emailStatus:       'pending',
    },
  });

  // Email the report
  const recipientEmail = company.settings?.reportEmail || company.email;
  if (recipientEmail) {
    try {
      await sendMonthlyReportEmail(recipientEmail, company.name, report, totals, campaigns, periodStart, periodEnd);
      await prisma.adReport.update({
        where: { id: report.id },
        data: { sentAt: new Date(), sentTo: recipientEmail, emailStatus: 'sent' },
      });
    } catch (err) {
      await prisma.adReport.update({ where: { id: report.id }, data: { emailStatus: 'failed' } });
      throw err;
    }
  }

  return { report, totals };
}

/**
 * Process monthly reports for ALL active companies with ad campaigns.
 * Called by cron on the 1st of each month.
 */
export async function processMonthlyReports() {
  const now = new Date();
  const periodEnd   = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of this month = end of last month
  const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1); // 1st of last month

  // Find companies with active campaigns
  const companies = await prisma.adCampaign.groupBy({
    by: ['companyId'],
    where: { status: { in: ['active', 'paused'] } },
  });

  const results = [];
  for (const { companyId } of companies) {
    try {
      const result = await generateMonthlyReport(companyId, periodStart, periodEnd);
      results.push({ companyId, success: true, report: result.report.id });
    } catch (err) {
      results.push({ companyId, success: false, error: err.message });
      console.error(`[Reporting] Monthly report failed for ${companyId}:`, err.message);
    }
  }

  return results;
}

// ─── CPL Alert ────────────────────────────────────────────────────────────────

/**
 * Send cost-per-lead alert email.
 * Called when a campaign's CPL exceeds its threshold.
 */
export async function sendCPLAlert(campaign, currentCPL) {
  const company = await prisma.company.findUnique({
    where: { id: campaign.companyId },
    select: { name: true, email: true, settings: true },
  });
  if (!company) return;

  const recipientEmail = company.settings?.alertEmail || company.email;
  if (!recipientEmail) return;

  const subject = `⚠️ Ad Alert: Cost-per-lead exceeds threshold — ${campaign.name}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
      <div style="background: #dc2626; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">⚠️ Cost-Per-Lead Alert</h2>
        <p style="margin: 4px 0 0; opacity: .85;">${company.name}</p>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="color: #374151;">Your campaign <strong>${campaign.name}</strong> has exceeded its cost-per-lead threshold.</p>
        <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
          <tr style="background: #fef2f2;">
            <td style="padding: 10px 16px; color: #6b7280;">Current CPL</td>
            <td style="padding: 10px 16px; font-weight: 700; color: #dc2626; font-size: 20px;">$${currentCPL.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 10px 16px; color: #6b7280;">Alert Threshold</td>
            <td style="padding: 10px 16px; font-weight: 600;">$${Number(campaign.cplAlertThreshold).toFixed(2)}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 10px 16px; color: #6b7280;">Platform</td>
            <td style="padding: 10px 16px;">${campaign.platform === 'google' ? 'Google Ads' : 'Facebook/Instagram'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 16px; color: #6b7280;">Total Leads</td>
            <td style="padding: 10px 16px;">${campaign.leads}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 10px 16px; color: #6b7280;">Total Spend</td>
            <td style="padding: 10px 16px;">$${Number(campaign.totalSpend).toFixed(2)}</td>
          </tr>
        </table>
        <div style="margin-top: 16px; text-align: center;">
          <a href="${APP_URL}/marketing" style="display: inline-block; background: #f97316; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Review Campaign →</a>
        </div>
      </div>
    </div>
  `;

  await email.sendTransactionalEmail({ to: recipientEmail, subject, html, fromName: FROM_NAME });
}

// ─── Admin dashboard aggregation ─────────────────────────────────────────────

/**
 * Get all companies' campaign data for the BuildPro admin dashboard.
 * Shows every contractor's campaigns, spend, and leads at a glance.
 */
export async function getAdminDashboard() {
  const campaigns = await prisma.adCampaign.findMany({
    where: { status: { in: ['active', 'paused', 'draft'] } },
    include: {
      company: { select: { id: true, name: true, email: true } },
      adAccount: { select: { platform: true, status: true } },
    },
    orderBy: { totalSpend: 'desc' },
  });

  const byCompany = {};
  for (const c of campaigns) {
    if (!byCompany[c.companyId]) {
      byCompany[c.companyId] = {
        company: c.company,
        campaigns: [],
        totals: { spend: 0, leads: 0, clicks: 0 },
      };
    }
    byCompany[c.companyId].campaigns.push(c);
    byCompany[c.companyId].totals.spend  += Number(c.totalSpend || 0);
    byCompany[c.companyId].totals.leads  += c.leads || 0;
    byCompany[c.companyId].totals.clicks += c.clicks || 0;
  }

  const clients = Object.values(byCompany).map(client => ({
    ...client,
    totals: {
      ...client.totals,
      costPerLead: client.totals.leads > 0 ? client.totals.spend / client.totals.leads : 0,
      activeCampaigns: client.campaigns.filter(c => c.status === 'active').length,
    },
  }));

  const platformTotals = campaigns.reduce((acc, c) => {
    const p = c.platform;
    if (!acc[p]) acc[p] = { spend: 0, leads: 0, campaigns: 0 };
    acc[p].spend    += Number(c.totalSpend || 0);
    acc[p].leads    += c.leads || 0;
    acc[p].campaigns++;
    return acc;
  }, {});

  return {
    clients,
    platformTotals,
    summary: {
      totalClients:   clients.length,
      totalSpend:     clients.reduce((s, c) => s + c.totals.spend, 0),
      totalLeads:     clients.reduce((s, c) => s + c.totals.leads, 0),
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
    },
  };
}

/**
 * Get a single company's full ad performance view.
 */
export async function getCompanyAdPerformance(companyId) {
  const [campaigns, reports] = await Promise.all([
    prisma.adCampaign.findMany({
      where: { companyId },
      include: { adAccount: { select: { platform: true, status: true, accountName: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.adReport.findMany({
      where: { companyId, reportType: 'monthly' },
      orderBy: { periodStart: 'desc' },
      take: 12,
    }),
  ]);

  const totals = campaigns.reduce((acc, c) => ({
    spend:  acc.spend  + Number(c.totalSpend || 0),
    leads:  acc.leads  + (c.leads || 0),
    clicks: acc.clicks + (c.clicks || 0),
  }), { spend: 0, leads: 0, clicks: 0 });

  totals.costPerLead = totals.leads > 0 ? totals.spend / totals.leads : 0;

  return { campaigns, reports, totals };
}

// ─── Revenue attribution ──────────────────────────────────────────────────────

/**
 * Attribute revenue by counting contacts created from ad sources
 * that converted to jobs in the reporting period.
 * Source 'google_ads' or 'facebook' on contact indicates paid lead.
 */
async function attributeRevenue(companyId, periodStart, periodEnd) {
  const adSources = ['google_ads', 'facebook', 'instagram', 'meta', 'paid_ad', 'paid_search'];

  const jobs = await prisma.job.findMany({
    where: {
      companyId,
      status: 'completed',
      completedAt: { gte: periodStart, lte: periodEnd },
      contact: {
        source: { in: adSources },
        createdAt: { gte: new Date(periodStart.getTime() - 90 * 24 * 60 * 60 * 1000) }, // lead within 90 days before
      },
    },
    include: {
      invoices: { select: { total: true } },
    },
  });

  const revenue = jobs.reduce((sum, job) => {
    const jobRevenue = job.invoices.reduce((s, inv) => s + Number(inv.total || 0), 0);
    return sum + jobRevenue;
  }, 0);

  return { revenue, jobs: jobs.length };
}

// ─── Email template ───────────────────────────────────────────────────────────

async function sendMonthlyReportEmail(to, companyName, report, totals, campaigns, periodStart, periodEnd) {
  const month = periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const fmtDollars = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtNum    = (n) => Number(n).toLocaleString();

  const campaignRows = campaigns.filter(c => c.status !== 'draft').map(c => `
    <tr>
      <td style="padding: 10px 16px;">${c.name}</td>
      <td style="padding: 10px 16px; text-align: center;"><span style="padding: 2px 8px; border-radius: 4px; font-size: 12px; background: ${c.platform==='google'?'#dbeafe':'#ede9fe'}; color: ${c.platform==='google'?'#1d4ed8':'#7c3aed'};">${c.platform}</span></td>
      <td style="padding: 10px 16px; text-align: right;">${fmtDollars(c.totalSpend)}</td>
      <td style="padding: 10px 16px; text-align: right;">${fmtNum(c.leads)}</td>
      <td style="padding: 10px 16px; text-align: right;">${c.leads>0 ? fmtDollars(Number(c.totalSpend)/c.leads) : '—'}</td>
    </tr>
  `).join('');

  const subject = `📊 ${companyName} Ad Report — ${month}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
      <div style="background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Monthly Ad Report</h1>
        <p style="margin: 6px 0 0; opacity: .85; font-size: 15px;">${companyName} · ${month}</p>
      </div>

      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px 32px; background: #fafafa;">
        <p style="margin: 0; color: #6b7280; font-size: 14px;">Here's how your ad campaigns performed last month.</p>
      </div>

      <!-- Summary stats -->
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px 32px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            ${[
              ['Total Spend', fmtDollars(totals.spend), '#f97316'],
              ['Total Leads', fmtNum(totals.leads), '#2563eb'],
              ['Cost / Lead', fmtDollars(totals.costPerLead), '#7c3aed'],
              ['Jobs Won', fmtNum(totals.jobsAttributed), '#059669'],
            ].map(([label, value, color]) => `
              <td style="padding: 16px; text-align: center; background: #f9fafb; border-radius: 8px; margin: 4px;">
                <p style="margin: 0; font-size: 26px; font-weight: 800; color: ${color};">${value}</p>
                <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">${label}</p>
              </td>
            `).join('')}
          </tr>
        </table>

        ${totals.revenueAttributed > 0 ? `
        <div style="margin-top: 16px; padding: 16px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
          <p style="margin: 0; font-size: 14px; color: #15803d;">
            💰 <strong>Revenue attributed to paid ads this month: ${fmtDollars(totals.revenueAttributed)}</strong>
            ${totals.roi > 0 ? ` (${totals.roi.toFixed(0)}% ROI)` : ''}
          </p>
        </div>
        ` : ''}
      </div>

      <!-- Campaign breakdown -->
      ${campaignRows ? `
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px 32px;">
        <h3 style="margin: 0 0 12px; font-size: 15px; color: #374151;">Campaign Breakdown</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: #f9fafb; color: #6b7280; font-size: 12px; text-transform: uppercase;">
              <th style="padding: 8px 16px; text-align: left;">Campaign</th>
              <th style="padding: 8px 16px;">Platform</th>
              <th style="padding: 8px 16px; text-align: right;">Spend</th>
              <th style="padding: 8px 16px; text-align: right;">Leads</th>
              <th style="padding: 8px 16px; text-align: right;">CPL</th>
            </tr>
          </thead>
          <tbody style="border-top: 1px solid #e5e7eb;">${campaignRows}</tbody>
        </table>
      </div>
      ` : ''}

      <!-- CTA -->
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px 32px; text-align: center; background: #fafafa; border-radius: 0 0 12px 12px;">
        <a href="${APP_URL}/marketing" style="display: inline-block; background: #f97316; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
          View Full Dashboard →
        </a>
        <p style="margin: 12px 0 0; font-size: 12px; color: #9ca3af;">Sent by BuildPro · You receive this because you have active ad campaigns.</p>
      </div>
    </div>
  `;

  await email.sendTransactionalEmail({ to, subject, html, fromName: FROM_NAME });
}

export default {
  generateMonthlyReport,
  processMonthlyReports,
  sendCPLAlert,
  getAdminDashboard,
  getCompanyAdPerformance,
};
