import express from 'express';
import { getSmsSettings, updateSmsSettings, getSmsLogs, triggerCustomerSms } from '../controllers/smsController.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/settings', verifyToken, getSmsSettings);
router.put('/settings', verifyToken, isAdmin, updateSmsSettings);
router.get('/logs', verifyToken, getSmsLogs);
router.post('/send', verifyToken, triggerCustomerSms);

export default router;
