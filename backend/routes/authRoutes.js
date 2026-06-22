import express from 'express';
import { login, getCurrentUser, getUsers, createUser, updateUser, deleteUser } from '../controllers/authController.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', verifyToken, getCurrentUser);

// Admin-only endpoints for user account management
router.get('/users', verifyToken, isAdmin, getUsers);
router.post('/users', verifyToken, isAdmin, createUser);
router.put('/users/:id', verifyToken, isAdmin, updateUser);
router.delete('/users/:id', verifyToken, isAdmin, deleteUser);

export default router;
