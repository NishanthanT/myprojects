import { SupplierModel } from '../models/supplierModel.js';

export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await SupplierModel.getAll();
    return res.json({ success: true, suppliers });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error listing suppliers.' });
  }
};

export const getSupplierById = async (req, res) => {
  const { id } = req.params;
  try {
    const supplier = await SupplierModel.getById(id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }
    return res.json({ success: true, supplier });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving supplier.' });
  }
};

export const createSupplier = async (req, res) => {
  const { supplier_name, company_name, phone, address } = req.body;
  if (!supplier_name || !company_name || !phone) {
    return res.status(400).json({ success: false, message: 'Supplier Name, Company, and Phone number are required.' });
  }

  try {
    const supplier = await SupplierModel.create(req.body);
    return res.status(201).json({ success: true, message: 'Supplier registered successfully.', supplier });
  } catch (error) {
    console.error('Error creating supplier:', error);
    return res.status(500).json({ success: false, message: 'Server error registering supplier.' });
  }
};

export const updateSupplier = async (req, res) => {
  const { id } = req.params;
  const { supplier_name, company_name, phone, address } = req.body;
  
  if (!supplier_name || !company_name || !phone) {
    return res.status(400).json({ success: false, message: 'Supplier Name, Company, and Phone number are required.' });
  }

  try {
    const supplier = await SupplierModel.update(id, req.body);
    return res.json({ success: true, message: 'Supplier updated successfully.', supplier });
  } catch (error) {
    console.error('Error updating supplier:', error);
    return res.status(500).json({ success: false, message: 'Server error updating supplier.' });
  }
};

export const deleteSupplier = async (req, res) => {
  const { id } = req.params;
  try {
    await SupplierModel.delete(id);
    return res.json({ success: true, message: 'Supplier profile deleted successfully.' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ success: false, message: 'Cannot delete supplier. Products are associated with this supplier.' });
    }
    return res.status(500).json({ success: false, message: 'Server error deleting supplier.' });
  }
};
