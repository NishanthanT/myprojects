import { SalesModel } from '../models/salesModel.js';

export const getSales = async (req, res) => {
  try {
    const sales = await SalesModel.getAll();
    return res.json({ success: true, sales });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error listing sales.' });
  }
};

export const getSaleById = async (req, res) => {
  const { id } = req.params;
  try {
    const sale = await SalesModel.getById(id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale invoice not found.' });
    }
    return res.json({ success: true, sale });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving sale invoice.' });
  }
};

export const getTodaySales = async (req, res) => {
  try {
    let sales;
    // Cashiers can only view their own sales for the day, Admins see all
    if (req.user.role === 'admin') {
      sales = await SalesModel.getTodaySales();
    } else {
      sales = await SalesModel.getTodaySalesByCashier(req.user.id);
    }
    return res.json({ success: true, sales });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving today\'s sales.' });
  }
};

export const getBillNumber = async (req, res) => {
  try {
    const bill_no = await SalesModel.getNextBillNumber();
    return res.json({ success: true, bill_no });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error generating bill number.' });
  }
};

export const createSale = async (req, res) => {
  const {
    customer_id, subtotal, discount, total_amount,
    paid_amount, balance_amount, payment_method, items
  } = req.body;

  if (!items || items.length === 0 || total_amount === undefined || paid_amount === undefined) {
    return res.status(400).json({ success: false, message: 'Missing sale checkout parameters: items, total_amount, paid_amount.' });
  }

  try {
    // Generate fresh bill number sequentially
    const bill_no = await SalesModel.getNextBillNumber();
    const cashier_id = req.user.id;

    const saleId = await SalesModel.createSale({
      bill_no, customer_id, subtotal, discount, total_amount,
      paid_amount, balance_amount, payment_method, cashier_id
    }, items);

    return res.status(201).json({
      success: true,
      message: 'Bill created and stock updated successfully.',
      saleId,
      bill_no
    });
  } catch (error) {
    console.error('Error in createSale controller:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error finalizing checkout transaction.' });
  }
};

export const returnSaleItem = async (req, res) => {
  const { saleItemId, quantityToReturn } = req.body;
  const cashierId = req.user.id;

  if (!saleItemId || quantityToReturn === undefined) {
    return res.status(400).json({ success: false, message: 'Missing parameters: saleItemId, quantityToReturn.' });
  }

  try {
    const result = await SalesModel.returnItem(saleItemId, quantityToReturn, cashierId);
    return res.json({
      success: true,
      message: `Successfully returned ${quantityToReturn} of ${result.product_name} from Bill No ${result.bill_no}.`,
      refundedAmount: result.refunded_amount
    });
  } catch (error) {
    console.error('Error in returnSaleItem controller:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error processing item return.' });
  }
};
