import pool, { query } from '../config/db.js';

export const SalesModel = {
  getAll: async () => {
    const sql = `
      SELECT s.*, c.name as customer_name, u.name as cashier_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.cashier_id = u.id
      ORDER BY s.id DESC
    `;
    return await query(sql);
  },

  getById: async (id) => {
    const sqlSale = `
      SELECT s.*, c.name as customer_name, c.phone as customer_phone, u.name as cashier_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.cashier_id = u.id
      WHERE s.id = ?
    `;
    const sales = await query(sqlSale, [id]);
    if (sales.length === 0) return null;
    
    const sqlItems = `
      SELECT si.*, p.product_name, p.product_code, p.unit_type
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `;
    const items = await query(sqlItems, [id]);
    
    return {
      ...sales[0],
      items
    };
  },

  getTodaySales: async () => {
    const sql = `
      SELECT s.*, c.name as customer_name, u.name as cashier_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.cashier_id = u.id
      WHERE DATE(s.sale_date) = CURDATE()
      ORDER BY s.id DESC
    `;
    return await query(sql);
  },

  getTodaySalesByCashier: async (cashierId) => {
    const sql = `
      SELECT s.*, c.name as customer_name, u.name as cashier_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.cashier_id = u.id
      WHERE DATE(s.sale_date) = CURDATE() AND s.cashier_id = ?
      ORDER BY s.id DESC
    `;
    return await query(sql, [cashierId]);
  },

  getNextBillNumber: async () => {
    const sql = 'SELECT MAX(id) as max_id FROM sales';
    const rows = await query(sql);
    const nextId = (rows[0].max_id || 0) + 1;
    // Format: BILL-0001, BILL-0002 etc.
    return `BILL-${String(nextId).padStart(4, '0')}`;
  },

  createSale: async (saleData, itemsList) => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      const {
        bill_no, customer_id, subtotal, discount, total_amount,
        paid_amount, balance_amount, payment_method, cashier_id
      } = saleData;

      // Ensure no undefined values are sent to query bindings
      const safeCustomerId = customer_id !== undefined ? customer_id : null;
      const safeSubtotal = subtotal !== undefined ? subtotal : 0;
      const safeDiscount = discount !== undefined ? discount : 0;
      const safeTotalAmount = total_amount !== undefined ? total_amount : 0;
      const safePaidAmount = paid_amount !== undefined ? paid_amount : 0;
      const safeBalanceAmount = balance_amount !== undefined ? balance_amount : 0;
      const safePaymentMethod = payment_method !== undefined ? payment_method : 'Cash';
      const safeCashierId = cashier_id !== undefined ? cashier_id : null;

      // 1. Insert sale record
      const sqlSale = `
        INSERT INTO sales (
          bill_no, customer_id, subtotal, discount, total_amount,
          paid_amount, balance_amount, payment_method, cashier_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const [saleResult] = await connection.execute(sqlSale, [
        bill_no, safeCustomerId, safeSubtotal, safeDiscount, safeTotalAmount,
        safePaidAmount, safeBalanceAmount, safePaymentMethod, safeCashierId
      ]);
      const saleId = saleResult.insertId;

      // 2. Loop and insert items, decrease stock, log stock history
      for (const item of itemsList) {
        // Map frontend product ID and price keys if they differ
        const product_id = item.product_id !== undefined ? item.product_id : item.id;
        const unit_price = item.unit_price !== undefined ? item.unit_price : item.selling_price;
        const { quantity, buying_price, total_price } = item;

        const safeProductId = product_id !== undefined ? product_id : null;
        const safeQuantity = quantity !== undefined ? quantity : 0;
        const safeUnitPrice = unit_price !== undefined ? unit_price : 0;
        const safeBuyingPrice = buying_price !== undefined ? buying_price : 0;
        const safeTotalPrice = total_price !== undefined ? total_price : 0;
        
        // Check current product stock/price
        const [prodRows] = await connection.execute(
          'SELECT stock_qty, product_name FROM products WHERE id = ?', 
          [safeProductId]
        );
        if (prodRows.length === 0) {
          throw new Error(`Product with ID ${safeProductId} not found.`);
        }
        
        // Insert into sale_items
        const sqlItem = `
          INSERT INTO sale_items (
            sale_id, product_id, quantity, unit_price, buying_price, total_price
          ) VALUES (?, ?, ?, ?, ?, ?)
        `;
        await connection.execute(sqlItem, [
          saleId, safeProductId, safeQuantity, safeUnitPrice, safeBuyingPrice, safeTotalPrice
        ]);

        // Reduce stock in products table
        const sqlReduceStock = 'UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?';
        await connection.execute(sqlReduceStock, [safeQuantity, safeProductId]);

        // Log in stock_history
        const sqlStockHistory = `
          INSERT INTO stock_history (
            product_id, type, quantity, note, created_by
          ) VALUES (?, 'sale', ?, ?, ?)
        `;
        const note = `Sold in Bill No: ${bill_no}`;
        await connection.execute(sqlStockHistory, [
          safeProductId, -safeQuantity, note, safeCashierId
        ]);
      }

      // 3. If credit mode and customer exists, add to pending balance
      if (payment_method === 'Credit' && customer_id) {
        const sqlCustBalance = 'UPDATE customers SET pending_balance = pending_balance + ? WHERE id = ?';
        // The credit amount is total_amount - paid_amount (what remains unpaid)
        const creditAmount = total_amount - paid_amount;
        if (creditAmount > 0) {
          await connection.execute(sqlCustBalance, [creditAmount, customer_id]);
        }
      }

      await connection.commit();
      return saleId;
    } catch (error) {
      await connection.rollback();
      console.error('Transaction Failed. Rolled back.', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  returnItem: async (saleItemId, quantityToReturn, cashierId) => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Fetch sale item and related sale info
      const [itemRows] = await connection.execute(
        `SELECT si.*, p.product_name, s.bill_no, s.payment_method, s.customer_id 
         FROM sale_items si
         JOIN sales s ON si.sale_id = s.id
         JOIN products p ON si.product_id = p.id
         WHERE si.id = ?`,
        [saleItemId]
      );

      if (itemRows.length === 0) {
        throw new Error('Sale item not found.');
      }

      const item = itemRows[0];
      const {
        sale_id,
        product_id,
        quantity,
        returned_quantity,
        unit_price,
        bill_no,
        payment_method,
        customer_id,
        product_name
      } = item;

      // 2. Validate return quantity
      const currentReturned = parseFloat(returned_quantity || 0);
      const originalQty = parseFloat(quantity);
      const returnQty = parseFloat(quantityToReturn);

      if (returnQty <= 0) {
        throw new Error('Return quantity must be greater than zero.');
      }

      if (currentReturned + returnQty > originalQty) {
        throw new Error(`Cannot return more items than purchased. Original: ${originalQty}, Returned: ${currentReturned}, Requested: ${returnQty}`);
      }

      // 3. Update returned_quantity in sale_items
      await connection.execute(
        'UPDATE sale_items SET returned_quantity = returned_quantity + ? WHERE id = ?',
        [returnQty, saleItemId]
      );

      // 4. Increase stock_qty in products
      await connection.execute(
        'UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?',
        [returnQty, product_id]
      );

      // 5. Log in stock_history
      const sqlStockHistory = `
        INSERT INTO stock_history (
          product_id, type, quantity, note, created_by
        ) VALUES (?, 'addition', ?, ?, ?)
      `;
      const note = `Returned ${returnQty} from Bill No: ${bill_no}`;
      await connection.execute(sqlStockHistory, [
        product_id, returnQty, note, cashierId
      ]);

      // 6. Calculate total refund value
      const refundValue = returnQty * parseFloat(unit_price);

      // 7. Update sales totals
      await connection.execute(
        'UPDATE sales SET subtotal = subtotal - ?, total_amount = total_amount - ? WHERE id = ?',
        [refundValue, refundValue, sale_id]
      );

      // 8. Adjust customer credit or payment values
      if (payment_method === 'Credit' && customer_id) {
        await connection.execute(
          'UPDATE sales SET balance_amount = GREATEST(0, balance_amount - ?) WHERE id = ?',
          [refundValue, sale_id]
        );

        await connection.execute(
          'UPDATE customers SET pending_balance = GREATEST(0, pending_balance - ?) WHERE id = ?',
          [refundValue, customer_id]
        );
      } else {
        await connection.execute(
          'UPDATE sales SET paid_amount = GREATEST(0, paid_amount - ?) WHERE id = ?',
          [refundValue, sale_id]
        );
      }

      await connection.commit();
      return { success: true, bill_no, product_name, refunded_amount: refundValue };
    } catch (error) {
      await connection.rollback();
      console.error('Return item transaction failed:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
};
