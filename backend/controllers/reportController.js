import { ReportModel } from '../models/reportModel.js';
import { ProductModel } from '../models/productModel.js';
import { OfferModel } from '../models/offerModel.js';

export const getDailyReport = async (req, res) => {
  try {
    const report = await ReportModel.getDailySalesReport();
    return res.json({ success: true, report });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error generating daily sales report.' });
  }
};

export const getMonthlyReport = async (req, res) => {
  try {
    const report = await ReportModel.getMonthlySalesReport();
    return res.json({ success: true, report });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error generating monthly sales report.' });
  }
};

export const getProfitReport = async (req, res) => {
  try {
    const summary = await ReportModel.getProfitSummary();
    return res.json({ success: true, summary });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error generating profit summary report.' });
  }
};

export const getLowStockReport = async (req, res) => {
  try {
    const report = await ProductModel.getLowStock();
    return res.json({ success: true, report });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching low stock report.' });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    // 1. Get profits summary
    const profitSummary = await ReportModel.getProfitSummary();
    
    // 2. Get count of products in low stock
    const lowStockProducts = await ProductModel.getLowStock();
    const lowStockCount = lowStockProducts.length;
    
    // 3. Get active offers count
    const activeOffers = await OfferModel.getActiveOffers();
    const activeOffersCount = activeOffers.length;
    
    // 4. Get total product types in catalog
    const allProducts = await ProductModel.getAll();
    const totalProducts = allProducts.length;

    return res.json({
      success: true,
      stats: {
        todaySales: profitSummary.today_revenue || 0,
        todayProfit: profitSummary.today_profit || 0,
        monthSales: profitSummary.month_revenue || 0,
        monthProfit: profitSummary.month_profit || 0,
        totalProducts,
        lowStockCount,
        activeOffersCount
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ success: false, message: 'Server error aggregating dashboard data.' });
  }
};

export const getBestSellersReport = async (req, res) => {
  try {
    const period = req.query.period || 'all';
    const report = await ReportModel.getBestSellingProducts(period);
    return res.json({ success: true, report });
  } catch (error) {
    console.error('Error fetching best sellers report:', error);
    return res.status(500).json({ success: false, message: 'Server error generating best sellers report.' });
  }
};
