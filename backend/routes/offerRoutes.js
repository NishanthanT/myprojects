import express from 'express';
import { getOffers, getOfferById, createOffer, updateOffer, deleteOffer } from '../controllers/offerController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, getOffers);
router.get('/:id', verifyToken, getOfferById);
router.post('/', verifyToken, createOffer);
router.put('/:id', verifyToken, updateOffer);
router.delete('/:id', verifyToken, deleteOffer);

export default router;
