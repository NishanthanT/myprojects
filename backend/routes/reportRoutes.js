import express from 'express';
import { getDailyReport, getMonthlyReport, getProfitReport, getLowStockReport, getDashboardStats, getBestSellersReport } from '../controllers/reportController.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/daily', verifyToken, isAdmin, getDailyReport);
router.get('/monthly', verifyToken, isAdmin, getMonthlyReport);
router.get('/profit', verifyToken, isAdmin, getProfitReport);
router.get('/low-stock', verifyToken, getLowStockReport); // Cashier needs access for popup alerts
router.get('/dashboard-stats', verifyToken, getDashboardStats);
router.get('/best-sellers', verifyToken, isAdmin, getBestSellersReport);

export default router;
