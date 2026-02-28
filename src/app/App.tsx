import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider, useAuth } from '@/app/contexts/AuthContext';
import { Layout } from '@/app/components/Layout';
import { Login } from '@/app/pages/Login';
import { ChangePassword } from './pages/ChangePassword';
import { AdminDashboard } from '@/app/pages/admin/Dashboard';
import { StaffManagement } from '@/app/pages/admin/StaffManagement';
import { Customers } from '@/app/pages/admin/Customers';
import { CustomerForm } from '@/app/pages/admin/CustomerForm';
import { SalesDashboard } from '@/app/pages/sales/Dashboard';
import { CreateOrder } from '@/app/pages/sales/CreateOrder';
import { MyOrders } from '@/app/pages/sales/MyOrders';
import { ReceiptEntry } from '@/app/pages/sales/ReceiptEntry';
import { MyCollection } from '@/app/pages/sales/MyCollection';
import { CollectionStatus } from '@/app/pages/sales/CollectionStatus';
import { AccountsDashboard } from '@/app/pages/accounts/Dashboard';
import { OrderReview } from '@/app/pages/accounts/OrderReview';
import { SalesRecords } from '@/app/pages/accounts/SalesRecords';
import { StockManagement } from '@/app/pages/shared/StockManagement';
import { InventoryDashboard } from '@/app/pages/inventory/InventoryDashboard';
import { InventoryStock } from '@/app/pages/inventory/InventoryStock';
import { Brands } from '@/app/pages/inventory/Brands';
import { Products } from '@/app/pages/inventory/Products';
import { StockAdjustment } from '@/app/pages/inventory/StockAdjustment';
import { InventoryReports } from '@/app/pages/inventory/InventoryReports';
import { DeliveryManagement } from '@/app/pages/inventory/DeliveryManagement';
import { Toaster } from '@/app/components/ui/sonner';

// Loading spinner
const Loader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="w-8 h-8 border-4 border-[#34b0a7] border-t-transparent rounded-full animate-spin" />
  </div>
);

// Protected Route — checks auth, active status, and must_change_password
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_active) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  if (allowedRoles && user.role && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
};

// Protected Route without Layout (for full-screen pages like OrderReview)
const ProtectedRouteNoLayout = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_active) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  if (allowedRoles && user.role && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// Home redirect based on role
const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_active) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'sales') return <Navigate to="/sales" replace />;
  if (user.role === 'accounts') return <Navigate to="/accounts" replace />;
  if (user.role === 'inventory') return <Navigate to="/inventory" replace />;
  return <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={user && !user.must_change_password ? <Navigate to="/" replace /> : <Login />} />

      {/* First-login password change — no Layout, just auth check */}
      <Route path="/change-password" element={<ChangePassword />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/staff" element={<ProtectedRoute allowedRoles={['admin']}><StaffManagement /></ProtectedRoute>} />
      <Route path="/admin/customers" element={<ProtectedRoute allowedRoles={['admin']}><Customers /></ProtectedRoute>} />
      <Route path="/admin/customers/new" element={<ProtectedRoute allowedRoles={['admin']}><CustomerForm /></ProtectedRoute>} />
      <Route path="/admin/customers/:id/edit" element={<ProtectedRoute allowedRoles={['admin']}><CustomerForm /></ProtectedRoute>} />
      <Route path="/admin/brands" element={<ProtectedRoute allowedRoles={['admin']}><Brands /></ProtectedRoute>} />
      <Route path="/admin/products" element={<ProtectedRoute allowedRoles={['admin']}><Products /></ProtectedRoute>} />
      <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={['admin']}><SalesRecords /></ProtectedRoute>} />
      <Route path="/admin/sales" element={<ProtectedRoute allowedRoles={['admin']}><SalesRecords /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><div className="p-8"><h1 className="text-2xl font-semibold">Reports</h1><p className="text-gray-600 mt-2">Reporting features coming soon...</p></div></ProtectedRoute>} />

      {/* Sales Routes */}
      <Route path="/sales" element={<ProtectedRoute allowedRoles={['sales']}><SalesDashboard /></ProtectedRoute>} />
      <Route path="/sales/create-order" element={<ProtectedRoute allowedRoles={['sales', 'admin']}><CreateOrder /></ProtectedRoute>} />
      <Route path="/sales/my-orders" element={<ProtectedRoute allowedRoles={['sales']}><MyOrders /></ProtectedRoute>} />
      <Route path="/sales/receipt" element={<ProtectedRoute allowedRoles={['sales', 'admin']}><ReceiptEntry /></ProtectedRoute>} />
      <Route path="/sales/my-collection" element={<ProtectedRoute allowedRoles={['sales', 'admin']}><MyCollection /></ProtectedRoute>} />
      <Route path="/sales/collection-status" element={<ProtectedRoute allowedRoles={['sales', 'admin']}><CollectionStatus /></ProtectedRoute>} />

      {/* Accounts Routes */}
      <Route path="/accounts" element={<ProtectedRoute allowedRoles={['accounts']}><AccountsDashboard /></ProtectedRoute>} />
      <Route path="/accounts/collection-status" element={<ProtectedRoute allowedRoles={['accounts', 'admin']}><CollectionStatus /></ProtectedRoute>} />
      <Route path="/accounts/pending-orders" element={<ProtectedRoute allowedRoles={['accounts', 'admin']}><OrderReview /></ProtectedRoute>} />
      <Route path="/accounts/sales" element={<ProtectedRoute allowedRoles={['accounts', 'admin']}><SalesRecords /></ProtectedRoute>} />
      <Route path="/accounts/payments" element={<ProtectedRoute allowedRoles={['accounts', 'admin']}><div className="p-8"><h1 className="text-2xl font-semibold">Payments</h1><p className="text-gray-600 mt-2">Coming soon...</p></div></ProtectedRoute>} />

      {/* Shared Routes */}
      <Route path="/stock" element={<ProtectedRoute allowedRoles={['admin', 'accounts']}><StockManagement /></ProtectedRoute>} />

      {/* Inventory Routes */}
      <Route path="/inventory" element={<ProtectedRoute allowedRoles={['inventory', 'admin']}><InventoryDashboard /></ProtectedRoute>} />
      <Route path="/inventory/stock" element={<ProtectedRoute allowedRoles={['inventory', 'admin']}><InventoryStock /></ProtectedRoute>} />
      <Route path="/inventory/brands" element={<ProtectedRoute allowedRoles={['inventory', 'admin']}><Brands /></ProtectedRoute>} />
      <Route path="/inventory/products" element={<ProtectedRoute allowedRoles={['inventory', 'admin']}><Products /></ProtectedRoute>} />
      <Route path="/inventory/adjustment" element={<ProtectedRoute allowedRoles={['inventory', 'admin']}><StockAdjustment /></ProtectedRoute>} />
      <Route path="/inventory/reports" element={<ProtectedRoute allowedRoles={['inventory', 'admin']}><InventoryReports /></ProtectedRoute>} />
      <Route path="/inventory/delivery" element={<ProtectedRoute allowedRoles={['inventory', 'admin']}><DeliveryManagement /></ProtectedRoute>} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}
