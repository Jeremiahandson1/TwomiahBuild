/**
 * Ownership Middleware — IDOR Prevention
 *
 * Ensures that the authenticated user's companyId matches the
 * companyId of the resource being accessed/mutated. Prevents
 * Company A from reading or modifying Company B's data.
 *
 * Usage:
 *   import { verifyOwnership } from '../middleware/ownership.js';
 *
 *   // In a route, before update/delete:
 *   router.put('/:id', authenticate, verifyOwnership(prisma.invoice, 'invoice'), async (req, res) => {
 *     // req.ownedResource is the verified record
 *   });
 *
 *   // Or use the direct helper in route handlers:
 *   const record = await assertOwnership(prisma.invoice, id, companyId, 'Invoice');
 */

import { prisma } from '../config/prisma.js';

/**
 * Middleware factory.
 * @param {object} model  - Prisma model (e.g. prisma.invoice)
 * @param {string} name   - Human-readable resource name for error messages
 * @param {string} idParam - Route param name (default: 'id')
 */
export function verifyOwnership(model, name = 'Resource', idParam = 'id') {
  return async (req, res, next) => {
    try {
      const id = req.params[idParam];
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const record = await model.findFirst({
        where: { id, companyId },
      });

      if (!record) {
        return res.status(404).json({ error: `${name} not found` });
      }

      // Attach to request so the handler doesn't need to re-query
      req.ownedResource = record;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Direct assertion helper for use inside route handlers.
 * Throws 404 if the record doesn't belong to companyId.
 *
 * @returns the record
 */
export async function assertOwnership(model, id, companyId, name = 'Resource') {
  const record = await model.findFirst({ where: { id, companyId } });
  if (!record) {
    const err = new Error(`${name} not found`);
    err.statusCode = 404;
    throw err;
  }
  return record;
}

/**
 * Add companyId to a Prisma update/delete WHERE clause as a belt-and-suspenders
 * guard. Even if ownership was verified by a prior findFirst, adding companyId
 * to the mutation's WHERE ensures that a TOCTOU race or logic bug can't
 * affect another company's record.
 *
 * Usage:
 *   await prisma.invoice.update({
 *     where: withCompany(req.params.id, req.user.companyId),
 *     data: { ... }
 *   });
 */
export function withCompany(id, companyId) {
  return { id, companyId };
}

export default { verifyOwnership, assertOwnership, withCompany };
