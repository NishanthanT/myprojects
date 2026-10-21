import { OrderModel } from '../models/orderModel.js';
import { ReportModel } from '../models/reportModel.js';
import { validateOrderItems } from '../services/orderValidation.js';

export const updateOrder = async (req, res) => {
  if (!/^[1-9]\d*$/.test(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid order.' });
  let items;
  try { items = validateOrderItems(req.body.items); }
  catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  try {
    const order = await OrderModel.update(req.params.id, items);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    return res.json({ success: true, message: 'Order updated successfully.', order });
  } catch (error) {
    console.error('Error updating order:', error);
    return res.status(500).json({ success: false, message: 'Could not update order. Changes were not saved.' });
  }
};

export const getOrders = async (req, res) => {
  try {
    const orders = await OrderModel.getAll();
    return res.json({ success: true, orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching orders.' });
  }
};

export const getOrderById = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await OrderModel.getById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    return res.json({ success: true, order });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching order.' });
  }
};

export const createOrder = async (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one product is required to create an order.' });
  }
  try {
    const order = await OrderModel.create({
      created_by: req.user.id,
      created_by_name: req.user.name,
      items
    });
    return res.status(201).json({ success: true, message: 'Order saved successfully.', order });
  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({ success: false, message: 'Server error creating order.' });
  }
};

export const deleteOrder = async (req, res) => {
  const { id } = req.params;
  try {
    await OrderModel.delete(id);
    return res.json({ success: true, message: 'Order deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error deleting order.' });
  }
};

// Fast-moving products, accessible to both admin and cashier for order building
export const getFastMovingProducts = async (req, res) => {
  const { period = 'month' } = req.query;
  try {
    const products = await ReportModel.getBestSellingProducts(period);
    return res.json({ success: true, products });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching fast-moving products.' });
  }
};
