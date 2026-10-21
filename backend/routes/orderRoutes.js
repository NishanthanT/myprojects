import express from 'express';
import {
  getOrders, getOrderById, createOrder, updateOrder, deleteOrder, getFastMovingProducts
} from '../controllers/orderController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/fast-moving', verifyToken, getFastMovingProducts);
router.get('/', verifyToken, getOrders);
router.get('/:id', verifyToken, getOrderById);
router.post('/', verifyToken, createOrder);
router.put('/:id', verifyToken, updateOrder);
router.delete('/:id', verifyToken, deleteOrder);

export default router;
