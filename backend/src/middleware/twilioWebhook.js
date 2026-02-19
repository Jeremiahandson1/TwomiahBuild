/**
 * Twilio Webhook Signature Verification
 * 
 * Validates that incoming webhook requests actually come from Twilio.
 * Uses HMAC-SHA1 signature verification per Twilio's security docs.
 * 
 * Docs: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
import twilio from 'twilio';
import logger from '../services/logger.js';

export function validateTwilioWebhook(req, res, next) {
  // Skip validation if Twilio not configured (dev/test)
  if (!process.env.TWILIO_AUTH_TOKEN) {
    logger.warn('Twilio webhook received but TWILIO_AUTH_TOKEN not set — skipping validation');
    return next();
  }

  const signature = req.headers['x-twilio-signature'];
  if (!signature) {
    logger.warn('Twilio webhook rejected — missing X-Twilio-Signature header', { url: req.originalUrl });
    return res.status(403).json({ error: 'Missing Twilio signature' });
  }

  // Build the full URL Twilio signed
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const url = `${protocol}://${host}${req.originalUrl}`;

  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    signature,
    url,
    req.body
  );

  if (!isValid) {
    logger.warn('Twilio webhook rejected — invalid signature', { url: req.originalUrl });
    return res.status(403).json({ error: 'Invalid Twilio signature' });
  }

  next();
}
