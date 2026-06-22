import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, Download, Calendar, Sparkles, TrendingUp, DollarSign, Users, Package } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import AlertPopup from '../components/AlertPopup.jsx';

const Reports = () => {
  const [reportTab, setReportTab] = useState('daily'); // 'daily', 'monthly', 'best-sellers', 'credits'
  
  // Data states
  const [dailyData, setDailyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [bestSellersPeriod, setBestSellersPeriod] = useState('all');
  const [creditReport, setCreditReport] = useState([]);
  const [profitSummary, setProfitSummary] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, type: 'success', message: '' });

  const triggerAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

      // 1. Daily sales & profit
      const dailyRes = await fetch('/api/reports/daily', { headers });
      const dailyJSON = await dailyRes.json();
      if (dailyJSON.success) setDailyData(dailyJSON.report);

      // 2. Monthly sales & profit
      const monthlyRes = await fetch('/api/reports/monthly', { headers });
      const monthlyJSON = await monthlyRes.json();
      if (monthlyJSON.success) setMonthlyData(monthlyJSON.report);

      // 3. Profit summary overall
      const profitRes = await fetch('/api/reports/profit', { headers });
      const profitJSON = await profitRes.json();
      if (profitJSON.success) setProfitSummary(profitJSON.summary);

      const custRes = await fetch('/api/customers', { headers });
      const custJSON = await custRes.json();
      if (custJSON.success) {
        setCreditReport(custJSON.customers.filter(c => parseFloat(c.pending_balance) > 0));
      }
    } catch (error) {
      triggerAlert('error', 'Failed to compile report summaries.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBestSellers = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      const res = await fetch(`/api/reports/best-sellers?period=${bestSellersPeriod}`, { headers });
      const json = await res.json();
      if (json.success) setBestSellers(json.report);
    } catch (error) {
      triggerAlert('error', 'Failed to fetch best selling items.');
    }
  };

  useEffect(() => {
    fetchBestSellers();
  }, [bestSellersPeriod]);

  useEffect(() => {
    fetchReports();
  }, []);

  // Format Recharts data
  const dailyChart = dailyData.map(d => ({
    name: new Date(d.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    revenue: parseFloat(d.revenue),
    profit: parseFloat(d.profit)
  }));

  const monthlyChart = monthlyData.map(m => {
    // Format YYYY-MM into Month Name
    const [year, month] = m.month.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    return {
      name: date.toLocaleDateString([], { month: 'short', year: '2-digit' }),
      revenue: parseFloat(m.revenue),
      profit: parseFloat(m.profit)
    };
  });

  // PDF report downloader function
  const downloadPdfReport = () => {
    try {
      const doc = new jsPDF();
      const timestamp = new Date().toLocaleString();
      
      // Header branding
      doc.setFontSize(20);
      doc.setTextColor(245, 158, 11); // Amber brand
      doc.text('STN MOTORS', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('Tractor Parts & Oils Shop', 14, 25);
      doc.text('Main Street, Sithankeny', 14, 30);
      
      doc.setFontSize(14);
      doc.setTextColor(30);
      doc.text(`POS AUDIT & SALES REPORT - ${reportTab.toUpperCase()}`, 14, 42);
      
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Generated: ${timestamp}`, 14, 48);
      
      doc.setDrawColor(220);
      doc.line(14, 52, 196, 52);

      // Construct table columns & data dynamically based on active tab
      let tableColumn = [];
      let tableRows = [];

      if (reportTab === 'daily') {
        tableColumn = ["Date", "TransactionsCount", "Subtotal", "Discounts Applied", "Total Revenue", "Net Profit"];
        tableRows = dailyData.map(d => [
          new Date(d.date).toLocaleDateString(),
          d.total_bills,
          `Rs. ${parseFloat(d.subtotal).toFixed(2)}`,
          `-Rs. ${parseFloat(d.total_discount).toFixed(2)}`,
          `Rs. ${parseFloat(d.revenue).toFixed(2)}`,
          `Rs. ${parseFloat(d.profit).toFixed(2)}`
        ]);
      } else if (reportTab === 'monthly') {
        tableColumn = ["Month", "TransactionsCount", "Subtotal", "Discounts Applied", "Total Revenue", "Net Profit"];
        tableRows = monthlyData.map(m => [
          m.month,
          m.total_bills,
          `Rs. ${parseFloat(m.subtotal).toFixed(2)}`,
          `-Rs. ${parseFloat(m.total_discount).toFixed(2)}`,
          `Rs. ${parseFloat(m.revenue).toFixed(2)}`,
          `Rs. ${parseFloat(m.profit).toFixed(2)}`
        ]);
      } else if (reportTab === 'best-sellers') {
        tableColumn = ["Item Code", "Product Name", "Category", "Unit", "Total Qty Sold", "Sales Value", "Estimated Profit"];
        tableRows = bestSellers.map(b => [
          b.product_code,
          b.product_name,
          b.category_name || 'N/A',
          b.unit_type,
          b.total_qty_sold,
          `Rs. ${parseFloat(b.total_sales_val).toFixed(2)}`,
          `Rs. ${parseFloat(b.total_profit).toFixed(2)}`
        ]);
      } else if (reportTab === 'credits') {
        tableColumn = ["Customer Name", "Phone Number", "Address", "Outstanding Credit Balance"];
        tableRows = creditReport.map(c => [
          c.name,
          c.phone,
          c.address || 'N/A',
          `Rs. ${parseFloat(c.pending_balance).toFixed(2)}`
        ]);
      }

      // Draw table using autoTable plugin
      doc.autoTable({
        startY: 56,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] }, // Slate table header
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 8, font: 'helvetica' }
      });

      // Save file name
      doc.save(`stn-motors-report-${reportTab}-${new Date().toISOString().split('T')[0]}.pdf`);
      triggerAlert('success', 'PDF Report downloaded successfully.');
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Error compiling PDF output.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">POS Audit Reports</h1>
          <p className="text-xs text-slate-500 mt-1">Audit daily and monthly shop turnover, customer debts, and sales profit yields.</p>
        </div>

        <button
          onClick={downloadPdfReport}
          className="rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 shrink-0"
        >
          <Download className="h-4.5 w-4.5" />
          <span>Download PDF Report</span>
        </button>
      </div>

      {/* 2. Profit Aggregates KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Today's Profit Yield</span>
            <h3 className="text-2xl font-bold font-mono text-amber-500 mt-1">
              Rs. {parseFloat(profitSummary?.today_profit || 0).toFixed(2)}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Today Revenue: Rs. {parseFloat(profitSummary?.today_revenue || 0).toFixed(2)}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Monthly Profit Yield</span>
            <h3 className="text-2xl font-bold font-mono text-indigo-500 mt-1">
              Rs. {parseFloat(profitSummary?.month_profit || 0).toFixed(2)}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Monthly Revenue: Rs. {parseFloat(profitSummary?.month_revenue || 0).toFixed(2)}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shadow-sm">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Total Cumulative Profits</span>
            <h3 className="text-2xl font-bold font-mono text-emerald-500 mt-1">
              Rs. {parseFloat(profitSummary?.alltime_profit || 0).toFixed(2)}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Cumulative Revenue: Rs. {parseFloat(profitSummary?.alltime_revenue || 0).toFixed(2)}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm">
            <BarChart3 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-850 gap-2">
        {[
          { id: 'daily', label: 'Daily Sales & Profit', icon: Calendar },
          { id: 'monthly', label: 'Monthly Sales & Profit', icon: Calendar },
          { id: 'best-sellers', label: 'Best Selling Items', icon: Package },
          { id: 'credits', label: 'Customer Debts Credits', icon: Users }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setReportTab(tab.id)}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all duration-150 ${
              reportTab === tab.id
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 4. Display Content Panels */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* GRAPH PANEL for Daily / Monthly Sales */}
        {(reportTab === 'daily' || reportTab === 'monthly') && (
          <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-6 capitalize">{reportTab} Turnover vs Profits Breakdown</h3>
            
            <div className="h-80 w-full text-xs font-bold">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={reportTab === 'daily' ? dailyChart : monthlyChart} 
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" className="hidden dark:block" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.95)', 
                      borderRadius: '16px',
                      color: '#fff',
                      border: 'none'
                    }} 
                  />
                  <Legend />
                  {/* Revenue Bar */}
                  <Bar name="Total Revenue" dataKey="revenue" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  {/* Profit Bar */}
                  <Bar name="Net Profit" dataKey="profit" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* DATA TABLES GRID */}
        <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
          {reportTab === 'daily' && (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-center">Bills Count</th>
                  <th className="px-6 py-4 text-right">Subtotal</th>
                  <th className="px-6 py-4 text-right">Applied Discounts</th>
                  <th className="px-6 py-4 text-right">Total Revenue</th>
                  <th className="px-6 py-4 text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-350">
                {dailyData.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-12 text-slate-400">No daily logs registered.</td></tr>
                ) : (
                  dailyData.map((d, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                      <td className="px-6 py-4 font-mono">{new Date(d.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-center font-mono">{d.total_bills}</td>
                      <td className="px-6 py-4 text-right font-mono">Rs. {parseFloat(d.subtotal).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-mono text-rose-500">- Rs. {parseFloat(d.total_discount).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-800 dark:text-white">Rs. {parseFloat(d.revenue).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-emerald-500">Rs. {parseFloat(d.profit).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {reportTab === 'monthly' && (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Month</th>
                  <th className="px-6 py-4 text-center">Bills Count</th>
                  <th className="px-6 py-4 text-right">Subtotal</th>
                  <th className="px-6 py-4 text-right">Applied Discounts</th>
                  <th className="px-6 py-4 text-right">Total Revenue</th>
                  <th className="px-6 py-4 text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-350">
                {monthlyData.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-12 text-slate-400">No monthly logs registered.</td></tr>
                ) : (
                  monthlyData.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                      <td className="px-6 py-4 font-mono font-bold">{m.month}</td>
                      <td className="px-6 py-4 text-center font-mono">{m.total_bills}</td>
                      <td className="px-6 py-4 text-right font-mono">Rs. {parseFloat(m.subtotal).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-mono text-rose-500">- Rs. {parseFloat(m.total_discount).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-800 dark:text-white">Rs. {parseFloat(m.revenue).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-emerald-500">Rs. {parseFloat(m.profit).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {reportTab === 'best-sellers' && (
            <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">Best Selling Items Ranking</h3>
              <select
                value={bestSellersPeriod}
                onChange={(e) => setBestSellersPeriod(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
              >
                <option value="all">All Time</option>
                <option value="day">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
          )}
          {reportTab === 'best-sellers' && (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Item Code</th>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-center">Unit type</th>
                  <th className="px-6 py-4 text-center">Total Qty Sold</th>
                  <th className="px-6 py-4 text-right">Turnover Value</th>
                  <th className="px-6 py-4 text-right">Estimated Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-350">
                {bestSellers.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-12 text-slate-400">No checkout item logs.</td></tr>
                ) : (
                  bestSellers.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                      <td className="px-6 py-4 font-mono font-bold">{b.product_code}</td>
                      <td className="px-6 py-4 text-slate-850 dark:text-white">{b.product_name}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{b.category_name || 'N/A'}</td>
                      <td className="px-6 py-4 text-center">{b.unit_type}</td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-amber-500">{b.total_qty_sold}</td>
                      <td className="px-6 py-4 text-right font-mono">Rs. {parseFloat(b.total_sales_val).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-emerald-500">Rs. {parseFloat(b.total_profit).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {reportTab === 'credits' && (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4">Phone Number</th>
                  <th className="px-6 py-4">Address</th>
                  <th className="px-6 py-4 text-right">Credit Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-350">
                {creditReport.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-12 text-slate-400">All customer credits are cleared.</td></tr>
                ) : (
                  creditReport.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                      <td className="px-6 py-4 font-bold text-slate-850 dark:text-white">{c.name}</td>
                      <td className="px-6 py-4 font-mono">{c.phone}</td>
                      <td className="px-6 py-4 truncate max-w-[200px]">{c.address || 'N/A'}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-rose-500">Rs. {parseFloat(c.pending_balance).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Alerts */}
      <AlertPopup 
        isOpen={alert.show}
        type={alert.type}
        message={alert.message}
        onClose={() => setAlert({ ...alert, show: false })}
      />
    </div>
  );
};

export default Reports;
