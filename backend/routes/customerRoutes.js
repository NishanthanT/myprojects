import express from 'express';
import { getCustomers, getCustomerById, getCustomerHistory, createCustomer, updateCustomer, deleteCustomer } from '../controllers/customerController.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, getCustomers);
router.get('/:id/history', verifyToken, getCustomerHistory);
router.get('/:id', verifyToken, getCustomerById);
router.post('/', verifyToken, createCustomer);
router.put('/:id', verifyToken, updateCustomer);
router.delete('/:id', verifyToken, isAdmin, deleteCustomer);

export default router;
