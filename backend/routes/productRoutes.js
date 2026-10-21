import express from 'express';
import {
  getProducts, getProductById, createProduct, updateProduct,
  deleteProduct, searchProducts, getProductByBarcode,
  getCategories, createCategory, updateCategory, deleteCategory,
  getVehicleTypes, createVehicleType, updateVehicleType, deleteVehicleType,
  getAllVehicleModels, createVehicleModel, updateVehicleModel, deleteVehicleModel,
  setProductsPublicStatus
} from '../controllers/productController.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, getProducts);
router.get('/search', verifyToken, searchProducts);
router.get('/barcode/:barcode', verifyToken, getProductByBarcode);

router.get('/categories', verifyToken, getCategories);
router.post('/categories', verifyToken, isAdmin, createCategory);
router.put('/categories/:id', verifyToken, isAdmin, updateCategory);
router.delete('/categories/:id', verifyToken, isAdmin, deleteCategory);

// Vehicle Types
router.get('/vehicle-types', verifyToken, getVehicleTypes);
router.post('/vehicle-types', verifyToken, isAdmin, createVehicleType);
router.put('/vehicle-types/:id', verifyToken, isAdmin, updateVehicleType);
router.delete('/vehicle-types/:id', verifyToken, isAdmin, deleteVehicleType);

// Vehicle Models
router.get('/vehicle-models', verifyToken, getAllVehicleModels);
router.post('/vehicle-models', verifyToken, isAdmin, createVehicleModel);
router.put('/vehicle-models/:id', verifyToken, isAdmin, updateVehicleModel);
router.delete('/vehicle-models/:id', verifyToken, isAdmin, deleteVehicleModel);

router.put('/publish', verifyToken, setProductsPublicStatus);

router.get('/:id', verifyToken, getProductById);
router.post('/', verifyToken, isAdmin, createProduct);
router.put('/:id', verifyToken, isAdmin, updateProduct);
router.delete('/:id', verifyToken, isAdmin, deleteProduct);

export default router;
