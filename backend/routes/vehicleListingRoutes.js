import express from 'express';
import {
  getVehicleListings, createVehicleListing, updateVehicleListing, deleteVehicleListing
} from '../controllers/vehicleListingController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, getVehicleListings);
router.post('/', verifyToken, createVehicleListing);
router.put('/:id', verifyToken, updateVehicleListing);
router.delete('/:id', verifyToken, deleteVehicleListing);

export default router;
