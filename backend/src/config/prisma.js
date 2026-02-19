/**
 * Shared Prisma Client
 *
 * Extracted from index.js to break circular import chains.
 * All services and routes should import prisma from here,
 * NOT from '../config/prisma.js'.
 */
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
