/**
 * Document Number Generation — Race-Condition Safe
 *
 * Uses a database transaction with a dedicated sequence table to
 * generate unique, sequential document numbers (INV-00001, JOB-00001, etc.)
 *
 * Why not count()? Two concurrent creates both read count=41,
 * both write INV-00042. This uses SELECT FOR UPDATE semantics via
 * Prisma's $transaction to serialize the read + increment.
 */
import { prisma } from '../index.js';

/**
 * Get next document number for a given prefix + company.
 * Atomic: uses a transaction to prevent duplicates under concurrency.
 *
 * @param {'INV'|'JOB'|'QTE'|'REC'} prefix
 * @param {string} companyId
 * @returns {Promise<string>} e.g. "INV-00042"
 */
export async function nextDocumentNumber(prefix, companyId) {
  const key = `${prefix}:${companyId}`;

  const result = await prisma.$transaction(async (tx) => {
    // Upsert the sequence counter — createOrUpdate with increment
    const seq = await tx.documentSequence.upsert({
      where: { key },
      create: { key, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    return seq.lastNumber;
  });

  return `${prefix}-${String(result).padStart(5, '0')}`;
}
