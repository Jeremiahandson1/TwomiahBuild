/**
 * Shared Stripe Client
 * 
 * Single instance used across all services — billing, stripe webhooks, factory.
 * Import this instead of creating new Stripe() in each file.
 */
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY not set — Stripe features disabled');
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20' })
  : null;

export default stripe;
