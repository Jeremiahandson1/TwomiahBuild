/**
 * Smart Pricebook Service
 * 
 * AI-assisted pricing powered by Claude:
 * 1. Smart Start  — auto-generate a full trade pricebook from scratch
 * 2. Price Check  — flag underpriced items vs. market rates
 * 3. Upsell Recs  — suggest related services during quoting
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../config/prisma.js';
import * as pricebook from './pricebook.js';
import logger from './logger.js';

const client = new Anthropic();

// ─── Supported trades ────────────────────────────────────────────────────────

export const SUPPORTED_TRADES = [
  { id: 'hvac',          label: 'HVAC' },
  { id: 'plumbing',      label: 'Plumbing' },
  { id: 'electrical',    label: 'Electrical' },
  { id: 'roofing',       label: 'Roofing' },
  { id: 'general',       label: 'General Contractor' },
  { id: 'remodeling',    label: 'Remodeling' },
  { id: 'landscaping',   label: 'Landscaping' },
  { id: 'cleaning',      label: 'Cleaning' },
  { id: 'painting',      label: 'Painting' },
  { id: 'flooring',      label: 'Flooring' },
  { id: 'pest_control',  label: 'Pest Control' },
  { id: 'garage_door',   label: 'Garage Door' },
  { id: 'appliance',     label: 'Appliance Repair' },
  { id: 'pool',          label: 'Pool & Spa' },
  { id: 'home_care',     label: 'Home Care' },
];

// ─── 1. Smart Start ───────────────────────────────────────────────────────────

/**
 * Generate a full pricebook for a trade + region.
 * Creates categories + items in the database.
 * Returns { categoriesCreated, itemsCreated }
 */
export async function smartStart(companyId, { trade, state, targetMargin = 45 }) {
  logger.info(`[SmartPricebook] Smart Start — trade: ${trade}, state: ${state}, margin: ${targetMargin}%`);

  const prompt = buildSmartStartPrompt(trade, state, targetMargin);

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].text;
  const parsed = extractJSON(raw);

  if (!parsed?.categories) {
    throw new Error('AI returned unexpected format for Smart Start');
  }

  let categoriesCreated = 0;
  let itemsCreated = 0;

  for (const cat of parsed.categories) {
    // Create category
    const category = await pricebook.createCategory(companyId, {
      name: cat.name,
      description: cat.description || null,
    });
    categoriesCreated++;

    // Create items in this category
    for (const item of (cat.items || [])) {
      await pricebook.createItem(companyId, {
        name: item.name,
        description: item.description || null,
        price: item.price,
        cost: item.cost || Math.round(item.price * (1 - targetMargin / 100) * 100) / 100,
        unit: item.unit || 'each',
        taxable: true,
        categoryId: category.id,
        laborHours: item.laborHours || null,
      });
      itemsCreated++;
    }
  }

  // Save trade + margin to company for future recommendations
  await prisma.company.update({
    where: { id: companyId },
    data: {
      industry: trade,
    },
  });

  logger.info(`[SmartPricebook] Smart Start complete — ${categoriesCreated} categories, ${itemsCreated} items`);
  return { categoriesCreated, itemsCreated };
}

function buildSmartStartPrompt(trade, state, targetMargin) {
  const tradeLabel = SUPPORTED_TRADES.find(t => t.id === trade)?.label || trade;

  return `You are a ${tradeLabel} business pricing expert. Generate a complete flat-rate pricebook for a ${tradeLabel} contractor in ${state}.

The contractor wants a ${targetMargin}% gross margin. Calculate cost as: cost = price * (1 - ${targetMargin}/100).

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "categories": [
    {
      "name": "Category Name",
      "description": "Brief description",
      "items": [
        {
          "name": "Service name",
          "description": "What's included in this service",
          "price": 150.00,
          "cost": 82.50,
          "unit": "each",
          "laborHours": 1.5
        }
      ]
    }
  ]
}

Requirements:
- Generate 6-10 categories relevant to ${tradeLabel}
- Generate 8-15 items per category (60-100 items total)
- Prices should reflect current ${state} market rates (not national averages)
- Include diagnostic/service call fees, common repairs, installations, and maintenance
- Use realistic labor hours
- Descriptions should be customer-facing (explain what they get)
- Unit should be "each", "hour", "sq ft", "linear ft", or "per visit" as appropriate

Generate the pricebook now:`;
}

// ─── 2. Price Check ───────────────────────────────────────────────────────────

/**
 * Analyze existing pricebook items and flag potentially underpriced ones.
 * Returns array of { itemId, name, currentPrice, suggestedPrice, marketLow, marketHigh, confidence, reason }
 */
export async function priceCheck(companyId) {
  // Get company info for context
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { industry: true, state: true, city: true },
  });

  // Get all active items
  const items = await prisma.pricebookItem.findMany({
    where: { companyId, active: true },
    include: { category: { select: { name: true } } },
    orderBy: { category: { name: 'asc' } },
  });

  if (items.length === 0) return [];

  // Batch into groups of 30 to avoid token limits
  const batches = chunkArray(items, 30);
  const allResults = [];

  for (const batch of batches) {
    const prompt = buildPriceCheckPrompt(batch, company);

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].text;
    const parsed = extractJSON(raw);

    if (parsed?.items) {
      allResults.push(...parsed.items);
    }
  }

  // Only return items flagged as potentially underpriced
  return allResults.filter(r => r.flag === true);
}

function buildPriceCheckPrompt(items, company) {
  const trade = company?.industry || 'general contractor';
  const location = [company?.city, company?.state].filter(Boolean).join(', ') || 'US';

  const itemList = items.map(i => ({
    id: i.id,
    name: i.name,
    category: i.category?.name,
    currentPrice: parseFloat(i.price),
  }));

  return `You are a pricing expert for ${trade} businesses. Analyze these pricebook items for a contractor in ${location} and identify any that appear underpriced relative to current market rates.

Items to analyze:
${JSON.stringify(itemList, null, 2)}

Return ONLY valid JSON (no markdown):
{
  "items": [
    {
      "id": "item_id",
      "name": "item name",
      "currentPrice": 100,
      "marketLow": 120,
      "marketHigh": 180,
      "suggestedPrice": 150,
      "confidence": "high",
      "reason": "Brief explanation of why this seems underpriced",
      "flag": true
    }
  ]
}

Rules:
- Only include items where flag is true (genuinely underpriced)
- confidence: "high" (very sure), "medium" (likely), "low" (uncertain)
- If an item price seems reasonable or you're not sure, set flag to false and omit from results
- Focus on items where the contractor is clearly leaving money on the table
- Be conservative — only flag items you're confident about`;
}

// ─── 3. Upsell Recommendations ────────────────────────────────────────────────

// ─── 3. Upsell Cache — build once, query fast ────────────────────────────────

/**
 * Build the upsell relationship cache for a company.
 * Called once after Smart Start, or when pricebook changes significantly.
 * Runs ONE AI call, stores all pairs in PricebookRelation table.
 */
export async function buildUpsellCache(companyId) {
  logger.info(`[SmartPricebook] Building upsell cache for company ${companyId}`);

  const items = await prisma.pricebookItem.findMany({
    where: { companyId, active: true },
    include: { category: { select: { name: true } } },
    orderBy: { category: { name: 'asc' } },
  });

  if (items.length < 2) return { pairsCreated: 0 };

  const prompt = buildUpsellCachePrompt(items);

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].text;
  const parsed = extractJSON(raw);

  if (!parsed?.pairs || !Array.isArray(parsed.pairs)) {
    throw new Error('AI returned unexpected format for upsell cache');
  }

  // Validate all IDs exist in our item set
  const itemIdSet = new Set(items.map(i => i.id));
  const validPairs = parsed.pairs.filter(
    p => itemIdSet.has(p.sourceId) && itemIdSet.has(p.targetId) && p.sourceId !== p.targetId
  );

  // Clear existing relations and rebuild
  await prisma.pricebookRelation.deleteMany({ where: { companyId } });

  if (validPairs.length > 0) {
    await prisma.pricebookRelation.createMany({
      data: validPairs.map(p => ({
        companyId,
        sourceItemId: p.sourceId,
        targetItemId: p.targetId,
        strength: Math.min(100, Math.max(1, p.strength || 50)),
        reason: p.reason || null,
      })),
      skipDuplicates: true,
    });
  }

  logger.info(`[SmartPricebook] Upsell cache built — ${validPairs.length} pairs stored`);
  return { pairsCreated: validPairs.length };
}

/**
 * Get upsell suggestions from the cache — pure DB lookup, no API call.
 * Returns array of { id, name, price, category, reason, strength }
 */
export async function getUpsellRecommendations(companyId, quoteItemIds) {
  if (!quoteItemIds?.length) return [];

  // Look up all target items paired with any source item on the quote
  const relations = await prisma.pricebookRelation.findMany({
    where: {
      companyId,
      sourceItemId: { in: quoteItemIds },
      targetItemId: { notIn: quoteItemIds }, // don't suggest what's already on quote
    },
    include: {
      targetItem: {
        include: { category: { select: { name: true } } },
      },
    },
    orderBy: { strength: 'desc' },
  });

  if (relations.length === 0) return [];

  // Deduplicate targets — if item Y is suggested by multiple sources, keep highest strength
  const seen = new Map();
  for (const rel of relations) {
    const tid = rel.targetItemId;
    if (!seen.has(tid) || rel.strength > seen.get(tid).strength) {
      seen.set(tid, rel);
    }
  }

  return Array.from(seen.values())
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5)
    .map(rel => ({
      id: rel.targetItem.id,
      name: rel.targetItem.name,
      price: parseFloat(rel.targetItem.price),
      category: rel.targetItem.category?.name,
      reason: rel.reason || 'Commonly added with these services',
      strength: rel.strength,
    }));
}

/**
 * Check if the upsell cache needs rebuilding.
 * Returns true if cache is empty or older than 30 days.
 */
export async function upsellCacheStale(companyId) {
  const latest = await prisma.pricebookRelation.findFirst({
    where: { companyId },
    orderBy: { builtAt: 'desc' },
    select: { builtAt: true },
  });

  if (!latest) return true;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return latest.builtAt < thirtyDaysAgo;
}

function buildUpsellCachePrompt(items) {
  const itemList = items.map(i => ({
    id: i.id,
    name: i.name,
    category: i.category?.name,
  }));

  return `You are a field service expert. Analyze this contractor's complete service catalog and identify which services are commonly needed together or naturally lead to additional work.

Service catalog:
${JSON.stringify(itemList, null, 2)}

Return ONLY valid JSON (no markdown):
{
  "pairs": [
    {
      "sourceId": "item_id_that_triggers_suggestion",
      "targetId": "item_id_to_suggest",
      "strength": 85,
      "reason": "One sentence explaining the pairing for the technician"
    }
  ]
}

Rules:
- sourceId: the item already on the quote that triggers the suggestion
- targetId: the item to recommend adding
- strength: 1-100 (how strongly these pair together — be selective, only high-confidence pairs)
- Only create pairs you're genuinely confident about
- Each source item can have multiple targets, each target can have multiple sources
- Aim for 3-8 targets per source item maximum
- Reason should help the tech understand why to suggest it, e.g. "Capacitors commonly fail alongside motors"
- Use the exact IDs provided above`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractJSON(text) {
  try {
    // Try direct parse first
    return JSON.parse(text.trim());
  } catch {
    // Strip markdown fences
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try { return JSON.parse(match[1].trim()); } catch {}
    }
    // Find first { ... }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      try { return JSON.parse(text.slice(start, end + 1)); } catch {}
    }
    return null;
  }
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
