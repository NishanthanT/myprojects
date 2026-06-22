import { query } from '../config/db.js';

export const ReportModel = {
  // 1. Daily Sales and Profits (last 30 days)
  getDailySalesReport: async () => {
    const sql = `
      SELECT 
        DATE(s.sale_date) as date,
        COUNT(s.id) as total_bills,
        SUM(s.subtotal) as subtotal,
        SUM(s.discount) as total_discount,
        SUM(s.total_amount) as revenue,
        -- Profit = Sum((unit_price - buying_price) * quantity) - discount
        SUM(item_profits.profit) - SUM(s.discount) as profit
      FROM sales s
      JOIN (
        SELECT sale_id, SUM((unit_price - buying_price) * (quantity - returned_quantity)) as profit
        FROM sale_items
        GROUP BY sale_id
      ) item_profits ON s.id = item_profits.sale_id
      WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(s.sale_date)
      ORDER BY DATE(s.sale_date) ASC
    `;
    return await query(sql);
  },

  // 2. Monthly Sales and Profits (last 12 months)
  getMonthlySalesReport: async () => {
    const sql = `
      SELECT 
        DATE_FORMAT(s.sale_date, '%Y-%m') as month,
        COUNT(s.id) as total_bills,
        SUM(s.subtotal) as subtotal,
        SUM(s.discount) as total_discount,
        SUM(s.total_amount) as revenue,
        SUM(item_profits.profit) - SUM(s.discount) as profit
      FROM sales s
      JOIN (
        SELECT sale_id, SUM((unit_price - buying_price) * (quantity - returned_quantity)) as profit
        FROM sale_items
        GROUP BY sale_id
      ) item_profits ON s.id = item_profits.sale_id
      WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(s.sale_date, '%Y-%m')
      ORDER BY DATE_FORMAT(s.sale_date, '%Y-%m') ASC
    `;
    return await query(sql);
  },

  // 3. Profit Report Summary (KPI blocks)
  getProfitSummary: async () => {
    const sql = `
      SELECT 
        -- Today
        SUM(CASE WHEN DATE(s.sale_date) = CURDATE() THEN s.total_amount ELSE 0 END) as today_revenue,
        SUM(CASE WHEN DATE(s.sale_date) = CURDATE() THEN item_profits.profit - s.discount ELSE 0 END) as today_profit,
        
        -- This Month
        SUM(CASE WHEN DATE_FORMAT(s.sale_date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m') THEN s.total_amount ELSE 0 END) as month_revenue,
        SUM(CASE WHEN DATE_FORMAT(s.sale_date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m') THEN item_profits.profit - s.discount ELSE 0 END) as month_profit,
        
        -- All time
        SUM(s.total_amount) as alltime_revenue,
        SUM(item_profits.profit - s.discount) as alltime_profit
      FROM sales s
      JOIN (
        SELECT sale_id, SUM((unit_price - buying_price) * (quantity - returned_quantity)) as profit
        FROM sale_items
        GROUP BY sale_id
      ) item_profits ON s.id = item_profits.sale_id
    `;
    const rows = await query(sql);
    return rows[0];
  },

  // 4. Best Selling Products
  getBestSellingProducts: async (period = 'all') => {
    let dateFilter = '';
    if (period === 'day') {
      dateFilter = 'WHERE DATE(s.sale_date) = CURDATE()';
    } else if (period === 'week') {
      dateFilter = 'WHERE YEARWEEK(s.sale_date, 1) = YEARWEEK(CURDATE(), 1)';
    } else if (period === 'month') {
      dateFilter = 'WHERE DATE_FORMAT(s.sale_date, "%Y-%m") = DATE_FORMAT(CURDATE(), "%Y-%m")';
    } else if (period === 'year') {
      dateFilter = 'WHERE YEAR(s.sale_date) = YEAR(CURDATE())';
    }

    const sql = `
      SELECT 
        p.id,
        p.product_name,
        p.product_code,
        p.unit_type,
        c.category_name,
        SUM(si.quantity - si.returned_quantity) as total_qty_sold,
        SUM(si.total_price - (si.unit_price * si.returned_quantity)) as total_sales_val,
        SUM((si.unit_price - si.buying_price) * (si.quantity - si.returned_quantity)) as total_profit
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      JOIN sales s ON si.sale_id = s.id
      ${dateFilter}
      GROUP BY p.id, p.product_name, p.product_code, p.unit_type, c.category_name
      ORDER BY total_qty_sold DESC
      LIMIT 50
    `;
    return await query(sql);
  },

  // 5. Customer Credit Report (Pending balance list)
  getCustomerCreditReport: async () => {
    const sql = `
      SELECT id, name, phone, pending_balance 
      FROM customers 
      WHERE pending_balance > 0 
      ORDER BY pending_balance DESC
    `;
    return await query(sql);
  },

  // 6. Supplier Purchase Report
  getSupplierPurchaseReport: async () => {
    const sql = `
      SELECT 
        s.id as supplier_id,
        s.supplier_name,
        s.company_name,
        COUNT(p.id) as total_products,
        SUM(p.stock_qty * p.buying_price) as inventory_value
      FROM suppliers s
      LEFT JOIN products p ON s.id = p.supplier_id
      GROUP BY s.id, s.supplier_name, s.company_name
      ORDER BY inventory_value DESC
    `;
    return await query(sql);
  }
};
