import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    req.userRole = payload.role;
    req.userLocation = payload.location || null;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireSuperAdmin(req, res, next) {
  if (req.userRole !== 'super_admin') {
    return res.status(403).json({ message: 'Super admin access required' });
  }
  next();
}

export function requireAdminOrSuper(req, res, next) {
  if (req.userRole !== 'super_admin' && req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

/** Attach full user doc for location checks */
export async function loadUser(req, res, next) {
  try {
    const user = await User.findById(req.userId).select('role location isActive email name');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Account inactive or not found' });
    }
    req.authUser = user;
    next();
  } catch (e) {
    next(e);
  }
}
