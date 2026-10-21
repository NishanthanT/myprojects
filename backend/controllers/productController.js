import { ProductModel } from '../models/productModel.js';

// part_group ties the same physical part across brands together. Normalise it so
// "oil-filter mf241" and "OIL-FILTER MF241" land in the same group.
const normalisePartGroup = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\s+/g, ' ').toUpperCase();
  return trimmed === '' ? null : trimmed;
};

export const getProducts = async (req, res) => {
  try {
    const products = await ProductModel.getAll();
    return res.json({ success: true, products });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching products.' });
  }
};

export const setProductsPublicStatus = async (req, res) => {
  const { product_ids, is_public } = req.body;
  if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
    return res.status(400).json({ success: false, message: 'Select at least one product.' });
  }
  try {
    await ProductModel.setPublicStatus(product_ids, !!is_public);
    return res.json({ success: true, message: `${product_ids.length} product(s) ${is_public ? 'published to' : 'removed from'} the public website.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error updating publish status.' });
  }
};

export const getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await ProductModel.getById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    const images = await ProductModel.getProductImages(id);
    product.images = images.map(img => img.image_data);
    product.group_siblings = product.part_group
      ? await ProductModel.getGroupSiblings(product.part_group, product.id)
      : [];
    return res.json({ success: true, product });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching product.' });
  }
};

export const createProduct = async (req, res) => {
  const {
    product_name, product_code, barcode, category_id, brand,
    unit_type, buying_price, selling_price, stock_qty, low_stock_limit,
    supplier_id, image, status, vehicle_type_id, vehicle_model_ids, images
  } = req.body;

  if (!product_name || !product_code || !brand || !unit_type || buying_price === undefined || selling_price === undefined) {
    return res.status(400).json({ success: false, message: 'Mandatory fields: Name, Code, Brand, Unit Type, Buying Price, and Selling Price.' });
  }

  try {
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

    const product = await ProductModel.create({ ...req.body, part_group: normalisePartGroup(req.body.part_group) });

    // Save vehicle model associations
    if (vehicle_model_ids && vehicle_model_ids.length > 0) {
      await ProductModel.setProductModels(product.id, vehicle_model_ids);
    }

    // Save product photos
    if (images && images.length > 0) {
      await ProductModel.setProductImages(product.id, images);
    }

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
    supplier_id, image, status, vehicle_type_id, vehicle_model_ids, images
  } = req.body;

  if (!product_name || !product_code || !brand || !unit_type || buying_price === undefined || selling_price === undefined) {
    return res.status(400).json({ success: false, message: 'Mandatory fields: Name, Code, Brand, Unit Type, Buying Price, and Selling Price.' });
  }

  try {
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

    const product = await ProductModel.update(id, { ...req.body, part_group: normalisePartGroup(req.body.part_group) });

    // Save vehicle model associations (always overwrite)
    await ProductModel.setProductModels(id, vehicle_model_ids || []);

    // Save product photos (always overwrite)
    await ProductModel.setProductImages(id, images || []);

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
      try {
        await ProductModel.softDelete(id);
        return res.json({ success: true, message: 'Product removed from active inventory (soft deleted).' });
      } catch (softErr) {
        return res.status(500).json({ success: false, message: 'Server error during soft delete.' });
      }
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

// ─── Category handlers ───────────────────────────────────────────────────────
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

export const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { category_name } = req.body;
  if (!category_name) {
    return res.status(400).json({ success: false, message: 'Category name is required.' });
  }
  try {
    const updatedCategory = await ProductModel.updateCategory(id, category_name);
    return res.json({ success: true, message: 'Category updated successfully.', category: updatedCategory });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Category name already exists.' });
    }
    return res.status(500).json({ success: false, message: 'Server error updating category.' });
  }
};

export const deleteCategory = async (req, res) => {
  const { id } = req.params;
  try {
    await ProductModel.deleteCategory(id);
    return res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ success: false, message: 'Cannot delete this category because it has products assigned to it.' });
    }
    return res.status(500).json({ success: false, message: 'Server error deleting category.' });
  }
};

// ─── Vehicle Type handlers ───────────────────────────────────────────────────
export const getVehicleTypes = async (req, res) => {
  try {
    const types = await ProductModel.getVehicleTypes();
    return res.json({ success: true, types });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching vehicle types.' });
  }
};

export const createVehicleType = async (req, res) => {
  const { type_name } = req.body;
  if (!type_name) {
    return res.status(400).json({ success: false, message: 'Vehicle type name is required.' });
  }
  try {
    const newType = await ProductModel.createVehicleType(type_name.trim());
    return res.status(201).json({ success: true, message: 'Vehicle type added successfully.', type: newType });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Vehicle type already exists.' });
    }
    return res.status(500).json({ success: false, message: 'Server error creating vehicle type.' });
  }
};

export const updateVehicleType = async (req, res) => {
  const { id } = req.params;
  const { type_name } = req.body;
  if (!type_name) {
    return res.status(400).json({ success: false, message: 'Vehicle type name is required.' });
  }
  try {
    const updated = await ProductModel.updateVehicleType(id, type_name.trim());
    return res.json({ success: true, message: 'Vehicle type updated successfully.', type: updated });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Vehicle type name already exists.' });
    }
    return res.status(500).json({ success: false, message: 'Server error updating vehicle type.' });
  }
};

export const deleteVehicleType = async (req, res) => {
  const { id } = req.params;
  try {
    await ProductModel.deleteVehicleType(id);
    return res.json({ success: true, message: 'Vehicle type deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error deleting vehicle type.' });
  }
};

// ─── Vehicle Model handlers ──────────────────────────────────────────────────
export const getAllVehicleModels = async (req, res) => {
  try {
    const models = await ProductModel.getAllVehicleModels();
    return res.json({ success: true, models });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching vehicle models.' });
  }
};

export const createVehicleModel = async (req, res) => {
  const { model_name, vehicle_type_id } = req.body;
  if (!model_name || !vehicle_type_id) {
    return res.status(400).json({ success: false, message: 'Model name and vehicle type are required.' });
  }
  try {
    const newModel = await ProductModel.createVehicleModel(model_name.trim(), vehicle_type_id);
    return res.status(201).json({ success: true, message: 'Vehicle model added successfully.', model: newModel });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error creating vehicle model.' });
  }
};

export const updateVehicleModel = async (req, res) => {
  const { id } = req.params;
  const { model_name, vehicle_type_id } = req.body;
  if (!model_name || !vehicle_type_id) {
    return res.status(400).json({ success: false, message: 'Model name and vehicle type are required.' });
  }
  try {
    const updated = await ProductModel.updateVehicleModel(id, model_name.trim(), vehicle_type_id);
    return res.json({ success: true, message: 'Vehicle model updated successfully.', model: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error updating vehicle model.' });
  }
};

export const deleteVehicleModel = async (req, res) => {
  const { id } = req.params;
  try {
    await ProductModel.deleteVehicleModel(id);
    return res.json({ success: true, message: 'Vehicle model deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error deleting vehicle model.' });
  }
};
