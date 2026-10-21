import express from 'express';
import { getSiteSettings, updateSiteSettings, updatePublicNavigation } from '../controllers/siteSettingsController.js';
import { verifyToken,isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, getSiteSettings);
router.put('/navigation',verifyToken,isAdmin,updatePublicNavigation);
router.put('/', verifyToken,isAdmin, updateSiteSettings);

export default router;
