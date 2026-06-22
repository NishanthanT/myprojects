import express from 'express';
import { getOffers, getOfferById, createOffer, updateOffer, deleteOffer } from '../controllers/offerController.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, getOffers);
router.get('/:id', verifyToken, getOfferById);
router.post('/', verifyToken, isAdmin, createOffer);
router.put('/:id', verifyToken, isAdmin, updateOffer);
router.delete('/:id', verifyToken, isAdmin, deleteOffer);

export default router;
