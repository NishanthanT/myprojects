import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  AlertTriangle, 
  Tag, 
  Activity, 
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [lowStockList, setLowStockList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // 1. Fetch dashboard stats
      const statsRes = await fetch('/api/reports/dashboard-stats', { headers });
      const statsData = await statsRes.json();

      // 2. Fetch daily sales report for graph
      const dailyRes = await fetch('/api/reports/daily', { headers });
      const dailyData = await dailyRes.json();

      // 3. Fetch low stock list
      const stockRes = await fetch('/api/reports/low-stock', { headers });
      const stockData = await stockRes.json();

      if (statsData.success) setStats(statsData.stats);
      if (dailyData.success) {
        // Format dates for charts (e.g. "Jun 03")
        const formattedChart = dailyData.report.slice(-7).map(item => ({
          name: new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          revenue: parseFloat(item.revenue),
          profit: parseFloat(item.profit)
        }));
        setChartData(formattedChart);
      }
      if (stockData.success) setLowStockList(stockData.report.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Cards layout configuration
  const cardConfigs = [
    {
      title: "Today's Revenue",
      value: `Rs. ${parseFloat(stats?.todaySales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      subtitle: "Sales made today",
      color: "brand",
      icon: DollarSign,
      extra: `Profit: Rs. ${parseFloat(stats?.todayProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    },
    {
      title: "Monthly Sales",
      value: `Rs. ${parseFloat(stats?.monthSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      subtitle: "Current billing month",
      color: "indigo",
      icon: TrendingUp,
      extra: `Profit: Rs. ${parseFloat(stats?.monthProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    },
    {
      title: "Total Catalog Items",
      value: stats?.totalProducts || 0,
      subtitle: "Unique spare parts & oils",
      color: "emerald",
      icon: Package,
      extra: "Active product types"
    },
    {
      title: "Low Stock Alerts",
      value: stats?.lowStockCount || 0,
      subtitle: "Items below threshold",
      color: stats?.lowStockCount > 0 ? "rose" : "slate",
      icon: AlertTriangle,
      extra: stats?.lowStockCount > 0 ? "Requires restock action" : "Inventory healthy"
    }
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Admin Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">Real-time summaries of tractor spare parts, sales trends, and profits.</p>
        </div>
        
        <Link 
          to="/pos" 
          className="rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
        >
          <span>Open POS Terminal</span>
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cardConfigs.map((card, idx) => {
          const Icon = card.icon;
          
          const colorStyles = {
            brand: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
            indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
            emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
            rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 animate-pulse',
            slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
          };
          
          return (
            <div 
              key={idx}
              className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">{card.title}</span>
                  <h3 className="text-xl font-bold font-mono text-slate-800 dark:text-white mt-1">{card.value}</h3>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${colorStyles[card.color]}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/60 pt-3">
                <span className="block text-[10px] text-slate-400 font-medium">{card.subtitle}</span>
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">{card.extra}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Graph & Low Stock Summary Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sales vs Profits Chart */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60 mb-6">
            <h3 className="font-bold text-slate-850 dark:text-slate-200 text-sm">Weekly Sales & Profits Trend</h3>
            <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/20 px-3 py-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              <Activity className="h-3 w-3" />
              <span>Last 7 Days</span>
            </span>
          </div>

          <div className="h-72 w-full text-xs font-semibold">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">No sales transactions available to graph.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" className="hidden dark:block" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                      borderRadius: '16px',
                      color: '#fff',
                      border: 'none'
                    }} 
                  />
                  <Legend verticalAlign="top" height={36}/>
                  <Area type="monotone" name="Total Revenue" dataKey="revenue" stroke="#6366f1" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                  <Area type="monotone" name="Net Profit" dataKey="profit" stroke="#f59e0b" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Low Stock Watchlist */}
        <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60 mb-4">
              <h3 className="font-bold text-slate-850 dark:text-slate-200 text-sm">Stock Alert Watchlist</h3>
              <span className="rounded-full bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 text-[10px] font-bold text-rose-500">
                Action Required
              </span>
            </div>

            <div className="space-y-3">
              {lowStockList.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-10 w-10 text-emerald-500 mx-auto opacity-70 mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">All stock levels are optimal.</p>
                </div>
              ) : (
                lowStockList.map((item) => (
                  <div 
                    key={item.id}
                    className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{item.product_name}</h4>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">Code: {item.product_code}</span>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <span className="block text-xs font-bold font-mono text-rose-500">
                        {parseFloat(item.stock_qty)} {item.unit_type}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Limit: {parseFloat(item.low_stock_limit)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {lowStockList.length > 0 && (
            <Link
              to="/products"
              className="mt-6 block w-full text-center rounded-xl bg-slate-100 dark:bg-slate-850 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              View Full Stock Settings
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
