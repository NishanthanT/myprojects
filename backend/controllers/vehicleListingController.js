import { VehicleListingModel } from '../models/vehicleListingModel.js';

export const getVehicleListings = async (req, res) => {
  try {
    const listings = await VehicleListingModel.getAll();
    return res.json({ success: true, listings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching vehicle listings.' });
  }
};

export const createVehicleListing = async (req, res) => {
  const { vehicle_name, images } = req.body;
  if (!vehicle_name) {
    return res.status(400).json({ success: false, message: 'Vehicle name is required.' });
  }
  try {
    const listing = await VehicleListingModel.create({ ...req.body, created_by: req.user.id });
    if (images && images.length > 0) {
      await VehicleListingModel.setImages(listing.id, images);
    }
    return res.status(201).json({ success: true, message: 'Vehicle listing added successfully.', listing: await VehicleListingModel.getById(listing.id) });
  } catch (error) {
    console.error('Error creating vehicle listing:', error);
    return res.status(500).json({ success: false, message: 'Server error creating vehicle listing.' });
  }
};

export const updateVehicleListing = async (req, res) => {
  const { id } = req.params;
  const { vehicle_name, images } = req.body;
  if (!vehicle_name) {
    return res.status(400).json({ success: false, message: 'Vehicle name is required.' });
  }
  try {
    await VehicleListingModel.update(id, req.body);
    await VehicleListingModel.setImages(id, images || []);
    return res.json({ success: true, message: 'Vehicle listing updated successfully.', listing: await VehicleListingModel.getById(id) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error updating vehicle listing.' });
  }
};

export const deleteVehicleListing = async (req, res) => {
  const { id } = req.params;
  try {
    await VehicleListingModel.delete(id);
    return res.json({ success: true, message: 'Vehicle listing deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error deleting vehicle listing.' });
  }
};
