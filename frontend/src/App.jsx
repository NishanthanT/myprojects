import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

// Layout Components
import MainLayout from './layouts/MainLayout.jsx';

// Pages
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
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

// Loading Spinner
import LoadingSpinner from './components/LoadingSpinner.jsx';

// Protected Route wrapper component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token, loading } = useAuth();

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

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If cashier tries to access admin-only pages, redirect to POS Billing
    return <Navigate to="/pos" replace />;
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
      <Route path="/login" element={!user ? <Login /> : <Navigate to={user.role === 'admin' ? '/' : '/pos'} replace />} />

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
            user?.role === 'admin' ? (
              <Dashboard />
            ) : (
              <Navigate to="/pos" replace />
            )
          }
        />
        
        {/* Common Pages */}
        <Route path="pos" element={<POSBilling />} />
        <Route path="customers" element={<Customers />} />
        
        {/* Cashier Specific Pages */}
        <Route path="today-sales" element={<TodaySales />} />

        {/* Admin Only Pages */}
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
          path="offers"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Offers />
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

      {/* Fallback Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
