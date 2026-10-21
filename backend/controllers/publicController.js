import { SiteSettingsModel } from '../models/siteSettingsModel.js';
import { ProductModel } from '../models/productModel.js';
import { OfferModel } from '../models/offerModel.js';
import { VehicleListingModel } from '../models/vehicleListingModel.js';

// Category / vehicle type are always exposed — the public catalog's browsing filters depend on them.
// price / stock / brand are gated behind the admin's visible_fields choice.
const PUBLIC_SAFE_FIELDS = ['id', 'product_name', 'product_code', 'unit_type', 'category_id', 'category_name', 'vehicle_type_id', 'vehicle_type_name', 'vehicle_model_names'];

export const getPublicSettings = async (req, res) => {
  try {
    const settings = await SiteSettingsModel.get();
    return res.json({ success: true, settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching site settings.' });
  }
};

export const getPublicProducts = async (req, res) => {
  try {
    const settings = await SiteSettingsModel.get();
    const visibleFields = (settings?.visible_fields || '').split(',').map(f => f.trim()).filter(Boolean);
    const products = await ProductModel.getPublicProducts();
    const images = await ProductModel.getPublicProductImages(products.map(p => p.id));

    const shaped = products.map(p => {
      const out = {};
      PUBLIC_SAFE_FIELDS.forEach(f => { out[f] = p[f]; });
      out.brand = p.brand;
      out.images = images.filter(img => img.product_id === p.id).map(img => img.image_data);
      if (visibleFields.includes('price')) out.selling_price = p.selling_price;
      if (visibleFields.includes('stock')) out.stock_qty = p.stock_qty;
      return out;
    });

    return res.json({ success: true, products: shaped, visibleFields });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching products.' });
  }
};

export const getPublicOffers = async (req, res) => {
  try {
    const offers = await OfferModel.getActiveOffers();
    return res.json({ success: true, offers });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching offers.' });
  }
};

export const getPublicVehicleListings = async (req, res) => {
  try {
    const listings = await VehicleListingModel.getPublicAll();
    return res.json({ success: true, listings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching vehicle listings.' });
  }
};

export const getPublicFilters = async (req, res) => {
  try {
    const categories = await ProductModel.getCategories();
    const vehicleTypes = await ProductModel.getVehicleTypes();
    return res.json({ success: true, categories, vehicleTypes });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching filters.' });
  }
};
