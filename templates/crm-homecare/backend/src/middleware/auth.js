import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true, firstName: true, lastName: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = { userId: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName };
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

export const requireAdmin = requireRole('admin', 'billing');
export const adminOnly = requireRole('admin');

// Log auth events (HIPAA requirement)
export const logAuthEvent = async (prisma, { email, userId, success, ipAddress, userAgent, failReason }) => {
  try {
    await prisma.loginActivity.create({
      data: { email, userId, success, ipAddress, userAgent, failReason },
    });
  } catch (_) { /* non-blocking */ }
};
