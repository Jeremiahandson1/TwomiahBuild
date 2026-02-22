import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    // Also accept ?token= query param for direct browser downloads (e.g. zip files)
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : req.query.token || null;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, companyId: true, email: true, role: true, isActive: true, agencyId: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = { userId: user.id, companyId: user.companyId, email: user.email, role: user.role, agencyId: user.agencyId };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};

export const requireAdmin = requireRole('admin');
export const requireManager = requireRole('admin', 'manager');
