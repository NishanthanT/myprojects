import express from 'express';
import { 
  getProducts, getProductById, createProduct, updateProduct, 
  deleteProduct, searchProducts, getProductByBarcode, 
  getCategories, createCategory 
} from '../controllers/productController.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, getProducts);
router.get('/search', verifyToken, searchProducts);
router.get('/barcode/:barcode', verifyToken, getProductByBarcode);

router.get('/categories', verifyToken, getCategories);
router.post('/categories', verifyToken, isAdmin, createCategory);

router.get('/:id', verifyToken, getProductById);
router.post('/', verifyToken, isAdmin, createProduct);
router.put('/:id', verifyToken, isAdmin, updateProduct);
router.delete('/:id', verifyToken, isAdmin, deleteProduct);

export default router;
