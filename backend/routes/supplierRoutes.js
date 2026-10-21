import express from 'express';
import { getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier } from '../controllers/supplierController.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';
import supplierAccountRoutes from './supplierAccountRoutes.js';

const router = express.Router();
router.use('/:id/account', supplierAccountRoutes);

router.get('/', verifyToken, isAdmin, getSuppliers);
router.get('/:id', verifyToken, isAdmin, getSupplierById);
router.post('/', verifyToken, isAdmin, createSupplier);
router.put('/:id', verifyToken, isAdmin, updateSupplier);
router.delete('/:id', verifyToken, isAdmin, deleteSupplier);

export default router;
