import express from 'express';
import { getSales, getSaleById, getTodaySales, getBillNumber, createSale, returnSaleItem, updateSale } from '../controllers/salesController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, getSales);
router.get('/today', verifyToken, getTodaySales);
router.get('/bill-no', verifyToken, getBillNumber);
router.get('/:id', verifyToken, getSaleById);
router.post('/', verifyToken, createSale);
router.put('/:id', verifyToken, updateSale);
router.post('/return-item', verifyToken, returnSaleItem);

export default router;
