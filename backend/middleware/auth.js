import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'stn_motors_super_secret_token_key_2026';

// Middleware to verify JWT token
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1]; // Format: "Bearer <token>"
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. Token malformed.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Contains id, email, role, name
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// Middleware to check for Admin role
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Access denied. Admin role required.' });
  }
};

// Middleware to check if user is Cashier or Admin (both have basic sales access)
export const isCashier = (req, res, next) => {
  if (req.user && (req.user.role === 'cashier' || req.user.role === 'admin')) {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Access denied. Cashier or Admin role required.' });
  }
};
