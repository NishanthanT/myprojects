import express from 'express';
import {mechanicalHandler} from '../controllers/mechanicalServiceController.js';
import {
  getPublicSettings, getPublicProducts, getPublicOffers, getPublicFilters, getPublicVehicleListings
} from '../controllers/publicController.js';

const router = express.Router();

// No auth — this is the public-facing marketing website's data feed
router.get('/settings', getPublicSettings);
router.get('/products', getPublicProducts);
router.get('/offers', getPublicOffers);
router.get('/vehicle-listings', getPublicVehicleListings);
router.get('/filters', getPublicFilters);
router.get('/mechanical-services', mechanicalHandler('directory'));

export default router;
