import { CustomerModel } from '../models/customerModel.js';

export const getCustomerHistory = async (req, res) => {
  if (!/^[1-9]\d*$/.test(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid customer.' });
  try {
    const customer = await CustomerModel.getById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });
    const sales = await CustomerModel.getHistory(req.params.id);
    const cents = field => sales.reduce((sum, sale) => sum + Math.round(Number(sale[field] || 0) * 100), 0) / 100;
    res.json({ success: true, customer, sales, totals: { purchases: cents('total_amount'), paid_at_sale: cents('paid_amount'), recorded_bill_credit: cents('balance_amount'), bill_count: sales.length } });
  } catch (error) {
    console.error('Customer history error:', error);
    res.status(500).json({ success: false, message: 'Could not load customer history.' });
  }
};

export const getCustomers = async (req, res) => {
  try {
    const customers = await CustomerModel.getAll();
    return res.json({ success: true, customers });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error listing customers.' });
  }
};

export const getCustomerById = async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await CustomerModel.getById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }
    return res.json({ success: true, customer });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving customer.' });
  }
};

export const createCustomer = async (req, res) => {
  const { name, phone, address, pending_balance, sms_enabled } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Name and Phone number are required.' });
  }

  try {
    const existing = await CustomerModel.getByPhone(phone);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Phone number already registered.' });
    }

    const customer = await CustomerModel.create(req.body);
    return res.status(201).json({ success: true, message: 'Customer profile registered successfully.', customer });
  } catch (error) {
    console.error('Error creating customer:', error);
    return res.status(500).json({ success: false, message: 'Server error registering customer.' });
  }
};

export const updateCustomer = async (req, res) => {
  const { id } = req.params;
  const { name, phone, address, pending_balance, sms_enabled } = req.body;
  
  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Name and Phone number are required.' });
  }

  try {
    const existing = await CustomerModel.getByPhone(phone);
    if (existing && existing.id !== parseInt(id)) {
      return res.status(400).json({ success: false, message: 'Phone number is in use by another customer.' });
    }

    const customer = await CustomerModel.update(id, req.body);
    return res.json({ success: true, message: 'Customer profile updated successfully.', customer });
  } catch (error) {
    console.error('Error updating customer:', error);
    return res.status(500).json({ success: false, message: 'Server error updating customer.' });
  }
};

export const deleteCustomer = async (req, res) => {
  const { id } = req.params;
  
  // Prevent deleting walk-in customer
  if (parseInt(id) === 1) {
    return res.status(400).json({ success: false, message: 'Cannot delete the default Walk-in Customer profile.' });
  }

  try {
    await CustomerModel.delete(id);
    return res.json({ success: true, message: 'Customer profile deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error deleting customer.' });
  }
};
