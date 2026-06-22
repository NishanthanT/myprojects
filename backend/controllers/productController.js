import { ProductModel } from '../models/productModel.js';

export const getProducts = async (req, res) => {
  try {
    const products = await ProductModel.getAll();
    return res.json({ success: true, products });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching products.' });
  }
};

export const getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await ProductModel.getById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    return res.json({ success: true, product });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching product.' });
  }
};

export const createProduct = async (req, res) => {
  const { 
    product_name, product_code, barcode, category_id, brand, 
    unit_type, buying_price, selling_price, stock_qty, low_stock_limit, 
    supplier_id, image, status 
  } = req.body;

  if (!product_name || !product_code || !brand || !unit_type || buying_price === undefined || selling_price === undefined) {
    return res.status(400).json({ success: false, message: 'Mandatory fields: Name, Code, Brand, Unit Type, Buying Price, and Selling Price.' });
  }

  try {
    // Check code duplication
    const existing = await ProductModel.getByProductCode(product_code);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Product code already exists.' });
    }

    if (barcode) {
      const existingBarcode = await ProductModel.getByBarcode(barcode);
      if (existingBarcode) {
        return res.status(400).json({ success: false, message: 'Barcode number already exists.' });
      }
    }

    const product = await ProductModel.create(req.body);
    return res.status(201).json({ success: true, message: 'Product added successfully.', product });
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({ success: false, message: 'Server error creating product.' });
  }
};

export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { 
    product_name, product_code, barcode, category_id, brand, 
    unit_type, buying_price, selling_price, stock_qty, low_stock_limit, 
    supplier_id, image, status 
  } = req.body;

  if (!product_name || !product_code || !brand || !unit_type || buying_price === undefined || selling_price === undefined) {
    return res.status(400).json({ success: false, message: 'Mandatory fields: Name, Code, Brand, Unit Type, Buying Price, and Selling Price.' });
  }

  try {
    // Check code duplication excluding self
    const existing = await ProductModel.getByProductCode(product_code);
    if (existing && existing.id !== parseInt(id)) {
      return res.status(400).json({ success: false, message: 'Product code already in use by another product.' });
    }

    if (barcode) {
      const existingBarcode = await ProductModel.getByBarcode(barcode);
      if (existingBarcode && existingBarcode.id !== parseInt(id)) {
        return res.status(400).json({ success: false, message: 'Barcode already in use by another product.' });
      }
    }

    const product = await ProductModel.update(id, req.body);
    return res.json({ success: true, message: 'Product updated successfully.', product });
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({ success: false, message: 'Server error updating product.' });
  }
};

export const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    await ProductModel.delete(id);
    return res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ success: false, message: 'Cannot delete this product. It is referenced in existing sales orders.' });
    }
    return res.status(500).json({ success: false, message: 'Server error deleting product.' });
  }
};

export const searchProducts = async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.json({ success: true, products: [] });
  }
  try {
    const products = await ProductModel.search(query);
    return res.json({ success: true, products });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error searching products.' });
  }
};

export const getProductByBarcode = async (req, res) => {
  const { barcode } = req.params;
  try {
    const product = await ProductModel.getByBarcode(barcode);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found with this barcode.' });
    }
    return res.json({ success: true, product });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error searching barcode.' });
  }
};

// Category handlers
export const getCategories = async (req, res) => {
  try {
    const categories = await ProductModel.getCategories();
    return res.json({ success: true, categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching categories.' });
  }
};

export const createCategory = async (req, res) => {
  const { category_name } = req.body;
  if (!category_name) {
    return res.status(400).json({ success: false, message: 'Category name is required.' });
  }
  try {
    const newCategory = await ProductModel.createCategory(category_name);
    return res.status(201).json({ success: true, message: 'Category added successfully.', category: newCategory });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Category name already exists.' });
    }
    return res.status(500).json({ success: false, message: 'Server error creating category.' });
  }
};
