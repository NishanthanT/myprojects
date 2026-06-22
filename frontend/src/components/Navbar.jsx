import React, { useState, useEffect } from 'react';
import { Menu, Bell, AlertTriangle, ChevronDown, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Link } from 'react-router-dom';

const Navbar = ({ setSidebarOpen }) => {
  const { user } = useAuth();
  const [time, setTime] = useState(new Date());
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Clock dynamic ticking
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch low stock items
  const checkLowStock = async () => {
    try {
      const response = await fetch('/api/reports/low-stock', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setLowStockCount(data.report.length);
        setLowStockItems(data.report.slice(0, 5)); // show top 5 in notification list
      }
    } catch (error) {
      console.error('Error checking stock levels:', error);
    }
  };

  useEffect(() => {
    checkLowStock();
    // Poll every 60 seconds
    const interval = setInterval(checkLowStock, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatClock = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-slate-200/60 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 md:px-6 lg:px-8">
      {/* Left: Mobile hamburger menu toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden shadow-sm"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden md:block">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">STN Motors POS Terminal</span>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Jaffna Main Branch</h2>
        </div>
      </div>

      {/* Center: Dynamic clock */}
      <div className="text-center bg-slate-100 dark:bg-slate-950 px-4 py-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/30">
        <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">{formatDate(time)}</span>
        <span className="mx-2 text-slate-300 dark:text-slate-700">|</span>
        <span className="font-mono text-sm font-bold text-amber-500 dark:text-amber-400">{formatClock(time)}</span>
      </div>

      {/* Right: User actions & stock notifications */}
      <div className="flex items-center gap-4">
        {/* Low Stock Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm transition-all duration-200"
          >
            <Bell className="h-5 w-5" />
            {lowStockCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-4 ring-white dark:ring-slate-900 animate-pulse">
                {lowStockCount}
              </span>
            )}
          </button>

          {/* Dropdown list */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all duration-200 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>Low Stock Warnings</span>
                </h4>
                <span className="rounded-full bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                  {lowStockCount} items
                </span>
              </div>
              
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {lowStockCount === 0 ? (
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400 py-4">All products have sufficient stock levels.</p>
                ) : (
                  lowStockItems.map((item) => (
                    <div 
                      key={item.id}
                      className="flex flex-col gap-0.5 rounded-xl bg-slate-50 dark:bg-slate-950 p-2.5 border border-slate-100 dark:border-slate-850 hover:bg-amber-50/20 dark:hover:bg-amber-950/10"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                          {item.product_name}
                        </span>
                        <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded-md">
                          Stock: {parseFloat(item.stock_qty)} {item.unit_type}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        Code: {item.product_code} | Limit: {parseFloat(item.low_stock_limit)}
                      </span>
                    </div>
                  ))
                )}
              </div>
              
              {lowStockCount > 0 && user?.role === 'admin' && (
                <Link
                  to="/products"
                  onClick={() => setDropdownOpen(false)}
                  className="mt-3 block w-full text-center rounded-xl bg-slate-100 dark:bg-slate-850 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  Manage Inventories
                </Link>
              )}
            </div>
          )}
        </div>

        {/* User profile dropdown badge */}
        <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-4">
          <div className="hidden lg:block text-right">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{user?.name}</h4>
            <span className="text-xs text-slate-400 capitalize">{user?.role}</span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm">
            <User className="h-5 w-5" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
