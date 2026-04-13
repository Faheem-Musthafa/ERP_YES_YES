import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router';
import { AuthProvider, useAuth } from '@/app/contexts/AuthContext';
import { Layout } from '@/app/components/Layout';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { Toaster } from '@/app/components/ui/sonner';

// ── Eagerly loaded (tiny, always needed) ──────────────────────────────────
import { Login } from '@/app/pages/Login';
import { ChangePassword } from './pages/ChangePassword';

// ── Route-based code splitting ────────────────────────────────────────────
// Each page is loaded only when first navigated to, giving Vite a chance to
// split them into separate chunks (one per role / module).

// Admin
const AdminDashboard = lazy(() => import('@/app/pages/admin/Dashboard').then(m => ({ default: m.AdminDashboard })));
const StaffManagement = lazy(() => import('@/app/pages/admin/StaffManagement').then(m => ({ default: m.StaffManagement })));
const Customers = lazy(() => import('@/app/pages/admin/Customers').then(m => ({ default: m.Customers })));
const CustomerForm = lazy(() => import('@/app/pages/admin/CustomerForm').then(m => ({ default: m.CustomerForm })));
const CustomerAnalysisReport = lazy(() => import('@/app/pages/admin/CustomerAnalysisReport').then(m => ({ default: m.CustomerAnalysisReport })));
const AdminReports = lazy(() => import('@/app/pages/admin/AdminReports').then(m => ({ default: m.AdminReports })));
const DeliveryDrivers = lazy(() => import('@/app/pages/admin/DeliveryDrivers').then(m => ({ default: m.DeliveryDrivers })));
const ActivityLog = lazy(() => import('@/app/pages/admin/ActivityLog').then(m => ({ default: m.ActivityLog })));
const AdminSettings = lazy(() => import('@/app/pages/admin/Settings').then(m => ({ default: m.AdminSettings })));

// Sales
const SalesDashboard = lazy(() => import('@/app/pages/sales/Dashboard').then(m => ({ default: m.SalesDashboard })));
const CreateOrder = lazy(() => import('@/app/pages/sales/CreateOrder').then(m => ({ default: m.CreateOrder })));
const CreditNote = lazy(() => import('@/app/pages/sales/CreditNote').then(m => ({ default: m.CreditNote })));
const MyOrders = lazy(() => import('@/app/pages/sales/MyOrders').then(m => ({ default: m.MyOrders })));
const MyCustomers = lazy(() => import('@/app/pages/sales/MyCustomers').then(m => ({ default: m.MyCustomers })));
const ReceiptEntry = lazy(() => import('@/app/pages/sales/ReceiptEntry').then(m => ({ default: m.ReceiptEntry })));
const MyCollection = lazy(() => import('@/app/pages/sales/MyCollection').then(m => ({ default: m.MyCollection })));
const CollectionStatus = lazy(() => import('@/app/pages/sales/CollectionStatus').then(m => ({ default: m.CollectionStatus })));

// Accounts
const AccountsDashboard = lazy(() => import('@/app/pages/accounts/Dashboard').then(m => ({ default: m.AccountsDashboard })));
const OrderReview = lazy(() => import('@/app/pages/accounts/OrderReview').then(m => ({ default: m.OrderReview })));
const SalesRecords = lazy(() => import('@/app/pages/accounts/SalesRecords').then(m => ({ default: m.SalesRecords })));
const Payments = lazy(() => import('@/app/pages/accounts/Payments').then(m => ({ default: m.Payments })));
const Billing = lazy(() => import('@/app/pages/accounts/Billing').then(m => ({ default: m.Billing })));

// Shared
const StockManagement = lazy(() => import('@/app/pages/shared/StockManagement').then(m => ({ default: m.StockManagement })));

// Inventory
const InventoryDashboard = lazy(() => import('@/app/pages/inventory/InventoryDashboard').then(m => ({ default: m.InventoryDashboard })));
const InventoryStock = lazy(() => import('@/app/pages/inventory/InventoryStock').then(m => ({ default: m.InventoryStock })));
const Brands = lazy(() => import('@/app/pages/inventory/Brands').then(m => ({ default: m.Brands })));
const Products = lazy(() => import('@/app/pages/inventory/Products').then(m => ({ default: m.Products })));
const StockAdjustment = lazy(() => import('@/app/pages/inventory/StockAdjustment').then(m => ({ default: m.StockAdjustment })));
const StockTransfer = lazy(() => import('@/app/pages/inventory/StockTransfer').then(m => ({ default: m.StockTransfer })));
const InventoryReports = lazy(() => import('@/app/pages/inventory/InventoryReports').then(m => ({ default: m.InventoryReports })));
const DeliveryManagement = lazy(() => import('@/app/pages/inventory/DeliveryManagement').then(m => ({ default: m.DeliveryManagement })));

// Procurement
const ProcurementDashboard = lazy(() => import('@/app/pages/procurement/ProcurementDashboard').then(m => ({ default: m.ProcurementDashboard })));
const PurchaseOrders = lazy(() => import('@/app/pages/procurement/PurchaseOrders').then(m => ({ default: m.PurchaseOrders })));
const PurchaseHistory = lazy(() => import('@/app/pages/procurement/PurchaseHistory').then(m => ({ default: m.PurchaseHistory })));
const Suppliers = lazy(() => import('@/app/pages/procurement/Suppliers').then(m => ({ default: m.Suppliers })));
const GRN = lazy(() => import('@/app/pages/procurement/GRN').then(m => ({ default: m.GRN })));
const ProcurementReports = lazy(() => import('@/app/pages/procurement/ProcurementReports').then(m => ({ default: m.ProcurementReports })));

// ── Loading spinner (hoisted outside components — rule: rendering-hoist-jsx) ──
const Loader = (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="w-8 h-8 border-4 border-[#34b0a7] border-t-transparent rounded-full animate-spin" />
  </div>
);

// ── Guard components ──────────────────────────────────────────────────────

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { user, loading } = useAuth();
  if (loading) return Loader;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_active) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role ?? '')) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
};

const ChangePasswordRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return Loader;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_active) return <Navigate to="/login" replace />;
  const hash = location.hash || '';
  const isRecoveryFlow = hash.includes('type=recovery') || hash.includes('access_token=');
  if (!user.must_change_password && !isRecoveryFlow) return <Navigate to="/" replace />;
  return <ChangePassword />;
};

const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return Loader;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_active) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'sales') return <Navigate to="/sales" replace />;
  if (user.role === 'accounts') return <Navigate to="/accounts" replace />;
  if (user.role === 'inventory') return <Navigate to="/inventory" replace />;
  if (user.role === 'procurement') return <Navigate to="/procurement" replace />;
  return <Navigate to="/login" replace />;
};

// ── Routes ────────────────────────────────────────────────────────────────

const AppRoutes = () => {
  const { user, loading } = useAuth();

  return (
    // Single Suspense boundary: spinner shown while any lazy chunk loads
    <Suspense fallback={Loader}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={loading ? Loader : user && !user.must_change_password ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/change-password" element={<ChangePasswordRoute />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/staff" element={<ProtectedRoute allowedRoles={['admin']}><StaffManagement /></ProtectedRoute>} />
        <Route path="/admin/customers" element={<ProtectedRoute allowedRoles={['admin']}><Customers /></ProtectedRoute>} />
        <Route path="/admin/customers/new" element={<ProtectedRoute allowedRoles={['admin']}><CustomerForm /></ProtectedRoute>} />
        <Route path="/admin/customers/:id/edit" element={<ProtectedRoute allowedRoles={['admin']}><CustomerForm /></ProtectedRoute>} />
        <Route path="/admin/customer-analysis" element={<ProtectedRoute allowedRoles={['admin']}><CustomerAnalysisReport /></ProtectedRoute>} />
        <Route path="/admin/brands" element={<ProtectedRoute allowedRoles={['admin']}><Brands /></ProtectedRoute>} />
        <Route path="/admin/products" element={<ProtectedRoute allowedRoles={['admin']}><Products /></ProtectedRoute>} />
        <Route path="/admin/sales" element={<ProtectedRoute allowedRoles={['admin']}><SalesRecords /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} />
        <Route path="/admin/drivers" element={<ProtectedRoute allowedRoles={['admin']}><DeliveryDrivers /></ProtectedRoute>} />
        <Route path="/admin/activity" element={<ProtectedRoute allowedRoles={['admin']}><ActivityLog /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>} />

        {/* Sales Routes */}
        <Route path="/sales" element={<ProtectedRoute allowedRoles={['sales']}><SalesDashboard /></ProtectedRoute>} />
        <Route path="/sales/create-order" element={<ProtectedRoute allowedRoles={['sales', 'admin']}><CreateOrder /></ProtectedRoute>} />
        <Route path="/sales/credit-note" element={<ProtectedRoute allowedRoles={['sales', 'admin']}><CreditNote /></ProtectedRoute>} />
        <Route path="/sales/my-orders" element={<ProtectedRoute allowedRoles={['sales']}><MyOrders /></ProtectedRoute>} />
        <Route path="/sales/my-customers" element={<ProtectedRoute allowedRoles={['sales']}><MyCustomers /></ProtectedRoute>} />
        <Route path="/sales/receipt" element={<ProtectedRoute allowedRoles={['sales', 'admin']}><ReceiptEntry /></ProtectedRoute>} />
        <Route path="/sales/my-collection" element={<ProtectedRoute allowedRoles={['sales', 'admin']}><MyCollection /></ProtectedRoute>} />
        <Route path="/sales/collection-status" element={<ProtectedRoute allowedRoles={['sales', 'admin']}><CollectionStatus /></ProtectedRoute>} />

        {/* Accounts Routes */}
        <Route path="/accounts" element={<ProtectedRoute allowedRoles={['accounts']}><AccountsDashboard /></ProtectedRoute>} />
        <Route path="/accounts/collection-status" element={<ProtectedRoute allowedRoles={['accounts', 'admin']}><CollectionStatus /></ProtectedRoute>} />
        <Route path="/accounts/pending-orders" element={<ProtectedRoute allowedRoles={['accounts', 'admin']}><OrderReview /></ProtectedRoute>} />
        <Route path="/accounts/billing" element={<ProtectedRoute allowedRoles={['accounts', 'admin']}><Billing /></ProtectedRoute>} />
        <Route path="/accounts/sales" element={<ProtectedRoute allowedRoles={['accounts', 'admin']}><SalesRecords /></ProtectedRoute>} />
        <Route path="/accounts/payments" element={<ProtectedRoute allowedRoles={['accounts', 'admin']}><Payments /></ProtectedRoute>} />

        {/* Shared Routes */}
        <Route path="/stock" element={<ProtectedRoute allowedRoles={['admin', 'accounts', 'sales', 'inventory', 'procurement']}><StockManagement /></ProtectedRoute>} />

        {/* Inventory Routes */}
        <Route path="/inventory" element={<ProtectedRoute allowedRoles={['inventory', 'admin']}><InventoryDashboard /></ProtectedRoute>} />
        <Route path="/inventory/stock" element={<ProtectedRoute allowedRoles={['inventory', 'admin']}><InventoryStock /></ProtectedRoute>} />
        <Route path="/inventory/brands" element={<ProtectedRoute allowedRoles={['inventory', 'admin']}><Brands /></ProtectedRoute>} />
        <Route path="/inventory/products" element={<ProtectedRoute allowedRoles={['inventory', 'admin']}><Products /></ProtectedRoute>} />
        <Route path="/inventory/adjustment" element={<ProtectedRoute allowedRoles={['inventory', 'admin']}><StockAdjustment /></ProtectedRoute>} />
        <Route path="/inventory/transfer" element={<ProtectedRoute allowedRoles={['inventory', 'admin']}><StockTransfer /></ProtectedRoute>} />
        <Route path="/sales/stock-transfer" element={<ProtectedRoute allowedRoles={['sales', 'admin', 'inventory']}><StockTransfer /></ProtectedRoute>} />
        <Route path="/inventory/reports" element={<ProtectedRoute allowedRoles={['inventory', 'admin']}><InventoryReports /></ProtectedRoute>} />
        <Route path="/inventory/delivery" element={<ProtectedRoute allowedRoles={['inventory', 'admin']}><DeliveryManagement /></ProtectedRoute>} />

        {/* Procurement Routes */}
        <Route path="/procurement" element={<ProtectedRoute allowedRoles={['procurement', 'admin']}><ProcurementDashboard /></ProtectedRoute>} />
        <Route path="/procurement/orders" element={<ProtectedRoute allowedRoles={['procurement', 'admin']}><PurchaseOrders /></ProtectedRoute>} />
        <Route path="/procurement/history" element={<ProtectedRoute allowedRoles={['procurement', 'admin']}><PurchaseHistory /></ProtectedRoute>} />
        <Route path="/procurement/suppliers" element={<ProtectedRoute allowedRoles={['procurement', 'admin']}><Suppliers /></ProtectedRoute>} />
        <Route path="/procurement/grn" element={<ProtectedRoute allowedRoles={['procurement', 'admin']}><GRN /></ProtectedRoute>} />
        <Route path="/procurement/reports" element={<ProtectedRoute allowedRoles={['procurement', 'admin']}><ProcurementReports /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
