/**
 * Shared Prisma Client
 *
 * Extracted from index.js to break circular import chains.
 * All services and routes should import prisma from here.
 */
import { PrismaClient } from '@prisma/client';

// Models that support soft deletes (have deletedAt column)
const SOFT_DELETE_MODELS = new Set([
  'Contact', 'Project', 'Job', 'Quote', 'Invoice',
  'Expense', 'Document', 'Equipment', 'Vehicle',
]);

const client = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

/**
 * Soft Delete Middleware
 *
 * - findMany / findFirst / findUnique / count: excludes deleted records automatically
 *   UNLESS the caller explicitly sets where.deletedAt (e.g. Recycle Bin queries)
 * - delete: converts to a soft delete (sets deletedAt = now)
 * - deleteMany: same
 */
client.$use(async (params, next) => {
  if (!SOFT_DELETE_MODELS.has(params.model)) return next(params);

  // READ: filter out deleted records unless caller is explicitly querying them
  if (['findMany', 'findFirst', 'findUnique', 'count', 'aggregate'].includes(params.action)) {
    if (params.args?.where?.deletedAt === undefined) {
      params.args = params.args || {};
      params.args.where = { ...params.args.where, deletedAt: null };
    }
  }

  // DELETE: convert to soft delete
  if (params.action === 'delete') {
    params.action = 'update';
    params.args.data = { deletedAt: new Date() };
  }

  if (params.action === 'deleteMany') {
    params.action = 'updateMany';
    params.args.data = { ...(params.args.data || {}), deletedAt: new Date() };
  }

  return next(params);
});

export const prisma = client;
export default prisma;
