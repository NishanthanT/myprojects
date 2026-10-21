import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import {UserModel} from '../models/userModel.js';
import {canAccessApi} from '../services/apiPermissions.js';
import {authSecret} from '../config/authSecret.js';

dotenv.config();

const JWT_SECRET = authSecret();

// Middleware to verify JWT token
export const verifyToken = async (req, res, next) => {
  if(req.authenticatedUser)return next();
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
    const user=await UserModel.findById(decoded.id);
    if(!user||user.status!=='active')return res.status(401).json({success:false,message:'Account is inactive or no longer exists.'});
    req.user=user;
    req.authenticatedUser=true;
    next();
  } catch (error) {
    if(!['JsonWebTokenError','TokenExpiredError','NotBeforeError'].includes(error.name))return res.status(503).json({success:false,message:'Could not verify account access. Please retry.'});
    return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
};

export const enforceApiAccess=(req,res,next)=>{
  if(canAccessApi(req.user,req.method,req.originalUrl))return next();
  return res.status(403).json({success:false,message:'You do not have permission to access this page.'});
};

// Middleware to check for Admin role
export const isAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' ||
      ((req.method === 'GET' || req.method === 'HEAD') && canAccessApi(req.user,req.method,req.originalUrl)))) {
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
