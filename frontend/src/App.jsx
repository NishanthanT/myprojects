import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import {PAGE_PERMISSIONS,hasPermission,homeFor} from './utils/permissions.mjs';
import { useAuth } from './context/AuthContext.jsx';

// Layout Components
import MainLayout from './layouts/MainLayout.jsx';

// Pages
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import BillImport from './pages/BillImport.jsx';
import POSBilling from './pages/POSBilling.jsx';
import SalesHistory from './pages/SalesHistory.jsx';
import TodaySales from './pages/TodaySales.jsx';
import Customers from './pages/Customers.jsx';
import Suppliers from './pages/Suppliers.jsx';
import Offers from './pages/Offers.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import Users from './pages/Users.jsx';
import BarcodePrint from './pages/BarcodePrint.jsx';
import Orders from './pages/Orders.jsx';
import Website from './pages/Website.jsx';

// Public marketing site
import PublicLayout from './layouts/PublicLayout.jsx';
import PublicHome from './pages/public/PublicHome.jsx';
import PublicProducts from './pages/public/PublicProducts.jsx';
import PublicOffers from './pages/public/PublicOffers.jsx';
import PublicVehicles from './pages/public/PublicVehicles.jsx';
import PublicAbout from './pages/public/PublicAbout.jsx';
import PublicContact from './pages/public/PublicContact.jsx';
import PublicMechanicalServices from './pages/public/PublicMechanicalServices.jsx';

// Loading Spinner
import LoadingSpinner from './components/LoadingSpinner.jsx';

// Protected Route wrapper component
const ProtectedRoute = ({ children }) => {
  const { user, token, loading } = useAuth();
  const location=useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const page=PAGE_PERMISSIONS.find(page=>page.path===location.pathname.replace(/\/$/,'')||page.path===location.pathname);
  if (page && !hasPermission(user,page.key)) {
    return <Navigate to={homeFor(user)} replace />;
  }

  return children;
};

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to={homeFor(user)} replace />} />

      {/* Authenticated Routes wrapped in Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={['admin', 'cashier']}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard: Redirect Cashier to POS, Admin to Dashboard */}
        <Route
          index
          element={
            hasPermission(user,'dashboard') ? (
              <Dashboard />
            ) : (
              <Navigate to={homeFor(user)} replace />
            )
          }
        />
        
        {/* Common Pages */}
        <Route path="no-access" element={<div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-slate-700 dark:text-slate-300">No pages have been assigned to your account. Please contact your admin.</div>} />
        <Route path="pos" element={<POSBilling />} />
        <Route path="customers" element={<Customers />} />
        <Route path="orders" element={<Orders />} />
        <Route path="offers" element={<Offers />} />
        <Route path="website" element={<Website />} />
        
        {/* Cashier Specific Pages */}
        <Route path="today-sales" element={<TodaySales />} />

        {/* Admin Only Pages */}
        <Route path="bill-import" element={<ProtectedRoute allowedRoles={['admin']}><BillImport /></ProtectedRoute>} />
        <Route
          path="products"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Products />
            </ProtectedRoute>
          }
        />
        <Route
          path="sales"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <SalesHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="suppliers"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Suppliers />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="barcode-print"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <BarcodePrint />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Public Marketing Website — no login required */}
      <Route path="/shop" element={<PublicLayout />}>
        <Route index element={<PublicHome />} />
        <Route path="products" element={<PublicProducts />} />
        <Route path="offers" element={<PublicOffers />} />
        <Route path="vehicles" element={<PublicVehicles />} />
        <Route path="about" element={<PublicAbout />} />
        <Route path="contact" element={<PublicContact />} />
        <Route path="mechanical-services" element={<PublicMechanicalServices />} />
      </Route>

      {/* Fallback Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
