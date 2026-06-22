import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useShop } from '../context/ShopContext.jsx';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  History, 
  Users as UsersIcon, 
  Truck, 
  Tag, 
  BarChart3, 
  Settings as SettingsIcon, 
  UserSquare2, 
  Sun, 
  Moon,
  X,
  Sparkles,
  ScanBarcode,
  LogOut
} from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { shopInfo } = useShop();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  // Helper to class active links
  const activeClass = ({ isActive }) => 
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      isActive 
        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
    }`;

  // Role based links mapping
  const menuItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      roles: ['admin']
    },
    {
      name: 'POS Billing',
      path: '/pos',
      icon: ShoppingCart,
      roles: ['admin', 'cashier']
    },
    {
      name: 'Today\'s Sales',
      path: '/today-sales',
      icon: History,
      roles: ['cashier', 'admin']
    },
    {
      name: 'Products',
      path: '/products',
      icon: Package,
      roles: ['admin']
    },
    {
      name: 'Barcode Printer',
      path: '/barcode-print',
      icon: ScanBarcode,
      roles: ['admin']
    },
    {
      name: 'Sales History',
      path: '/sales',
      icon: History,
      roles: ['admin']
    },
    {
      name: 'Customers',
      path: '/customers',
      icon: UsersIcon,
      roles: ['admin', 'cashier']
    },
    {
      name: 'Suppliers',
      path: '/suppliers',
      icon: Truck,
      roles: ['admin']
    },
    {
      name: 'Offers / Discounts',
      path: '/offers',
      icon: Tag,
      roles: ['admin']
    },
    {
      name: 'Reports',
      path: '/reports',
      icon: BarChart3,
      roles: ['admin']
    },
    {
      name: 'Users & Staff',
      path: '/users',
      icon: UserSquare2,
      roles: ['admin']
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: SettingsIcon,
      roles: ['admin']
    }
  ];

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(user?.role));

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header Branding */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-slate-200/60 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            {shopInfo.logo ? (
              <img src={shopInfo.logo} alt="Logo" className="h-10 w-10 rounded-xl object-cover shadow-md" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-wide text-slate-900 dark:text-white">{shopInfo.shopName || 'STN MOTORS'}</h1>
              <p className="text-xs text-amber-500 font-semibold tracking-wider uppercase">{shopInfo.shopTagline || 'Tractors & Oils'}</p>
            </div>
          </div>
          
          {/* Mobile Close Button */}
          <button 
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items (Scrollable) */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5">
          {visibleMenuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={activeClass}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="font-medium text-sm">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer Settings & Theme Toggle */}
        <div className="border-t border-slate-200/60 dark:border-slate-800/80 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/20">
          {/* User Profile Badge */}
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate font-semibold text-sm text-slate-800 dark:text-slate-200">{user?.name}</h4>
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4 text-amber-500" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-indigo-500" />
                  <span>Dark</span>
                </>
              )}
            </button>

            {/* Logout Button */}
            <button
              onClick={() => setShowLogoutModal(true)}
              className="px-3 flex items-center justify-center rounded-xl border border-rose-200/60 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-950/15 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/30 text-xs font-semibold transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setShowLogoutModal(false)} />
          <div className="relative w-full max-w-sm transform rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl z-10 text-center animate-in fade-in zoom-in duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30 mb-4">
              <LogOut className="h-8 w-8 text-rose-600 dark:text-rose-500 ml-1" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Sign Out</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Are you sure you want to log out of your account?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 py-2.5 font-bold text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmLogout}
                className="flex-1 rounded-xl bg-rose-500 py-2.5 font-bold text-sm text-white shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-colors"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
