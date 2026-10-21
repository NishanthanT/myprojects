import express from 'express';
import { login, getCurrentUser, getUsers, createUser, updateUser, deleteUser, changePassword } from '../controllers/authController.js';
import { verifyToken, isAdmin, enforceApiAccess } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', verifyToken, getCurrentUser);
router.put('/change-password', verifyToken, changePassword);

// Admin-only endpoints for user account management
router.get('/users', verifyToken, enforceApiAccess, getUsers);
router.post('/users', verifyToken, isAdmin, createUser);
router.put('/users/:id', verifyToken, isAdmin, updateUser);
router.delete('/users/:id', verifyToken, isAdmin, deleteUser);

export default router;
