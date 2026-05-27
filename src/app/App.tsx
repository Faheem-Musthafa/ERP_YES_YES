import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router';
import { AuthProvider, useAuth } from '@/app/contexts/AuthContext';
import { Layout } from '@/app/components/Layout';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { Toaster } from '@/app/components/ui/sonner';
import { CustomerDialogProvider } from '@/app/components/CustomerDialogProvider';

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
const BackOrders = lazy(() => import('@/app/pages/sales/BackOrders').then(m => ({ default: m.BackOrders })));
const ApprovedSales = lazy(() => import('@/app/pages/sales/ApprovedSales').then(m => ({ default: m.ApprovedSales })));
const PriceList = lazy(() => import('@/app/pages/sales/PriceList').then(m => ({ default: m.PriceList })));
const SalesMore = lazy(() => import('@/app/pages/sales/SalesMore').then(m => ({ default: m.SalesMore })));

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

// Parent layout shell — mounts Layout once and renders nested route content
// via Outlet. Persisting across child route changes prevents Layout
// (notification poll, sidebar state) from remounting on every navigation.
const ProtectedShell = () => {
  const { user, loading } = useAuth();
  if (loading) return Loader;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_active) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  return <Layout><Outlet /></Layout>;
};

// Per-route role check. Auth/active/must-change-password already enforced by
// ProtectedShell parent.
const RoleGate = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { user } = useAuth();
  if (allowedRoles && !allowedRoles.includes(user?.role ?? '')) return <Navigate to="/" replace />;
  return <>{children}</>;
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

        {/* All authenticated routes share one Layout instance (mounted by
            ProtectedShell). Layout persists across navigations between child
            routes — sidebar/notification state and the notification polling
            interval no longer reset on every page change. */}
        <Route element={<ProtectedShell />}>
          {/* Admin Routes */}
          <Route path="/admin" element={<RoleGate allowedRoles={['admin']}><AdminDashboard /></RoleGate>} />
          <Route path="/admin/staff" element={<RoleGate allowedRoles={['admin']}><StaffManagement /></RoleGate>} />
          <Route path="/admin/customers" element={<RoleGate allowedRoles={['admin']}><Customers /></RoleGate>} />
          <Route path="/admin/customers/new" element={<RoleGate allowedRoles={['admin']}><CustomerForm /></RoleGate>} />
          <Route path="/admin/customers/:id/edit" element={<RoleGate allowedRoles={['admin']}><CustomerForm /></RoleGate>} />
          <Route path="/admin/customer-analysis" element={<RoleGate allowedRoles={['admin']}><CustomerAnalysisReport /></RoleGate>} />
          <Route path="/admin/brands" element={<RoleGate allowedRoles={['admin']}><Brands /></RoleGate>} />
          <Route path="/admin/products" element={<RoleGate allowedRoles={['admin']}><Products /></RoleGate>} />
          <Route path="/admin/sales" element={<RoleGate allowedRoles={['admin']}><SalesRecords /></RoleGate>} />
          <Route path="/admin/reports" element={<RoleGate allowedRoles={['admin']}><AdminReports /></RoleGate>} />
          <Route path="/admin/drivers" element={<RoleGate allowedRoles={['admin']}><DeliveryDrivers /></RoleGate>} />
          <Route path="/admin/activity" element={<RoleGate allowedRoles={['admin']}><ActivityLog /></RoleGate>} />
          <Route path="/admin/settings" element={<RoleGate allowedRoles={['admin']}><AdminSettings /></RoleGate>} />

          {/* Sales Routes */}
          <Route path="/sales" element={<RoleGate allowedRoles={['sales']}><SalesDashboard /></RoleGate>} />
          <Route path="/sales/create-order" element={<RoleGate allowedRoles={['sales', 'admin']}><CreateOrder /></RoleGate>} />
          <Route path="/sales/credit-note" element={<RoleGate allowedRoles={['sales', 'admin']}><CreditNote /></RoleGate>} />
          <Route path="/sales/my-orders" element={<RoleGate allowedRoles={['sales']}><MyOrders /></RoleGate>} />
          <Route path="/sales/my-customers" element={<RoleGate allowedRoles={['sales']}><MyCustomers /></RoleGate>} />
          <Route path="/sales/receipt" element={<RoleGate allowedRoles={['sales', 'admin']}><ReceiptEntry /></RoleGate>} />
          <Route path="/sales/my-collection" element={<RoleGate allowedRoles={['sales', 'admin']}><MyCollection /></RoleGate>} />
          <Route path="/sales/collection-status" element={<RoleGate allowedRoles={['sales', 'admin']}><CollectionStatus /></RoleGate>} />
          <Route path="/sales/back-orders" element={<RoleGate allowedRoles={['sales', 'admin', 'accounts']}><BackOrders /></RoleGate>} />
          <Route path="/sales/approved-sales" element={<RoleGate allowedRoles={['sales', 'admin']}><ApprovedSales /></RoleGate>} />
          <Route path="/sales/price-list" element={<RoleGate allowedRoles={['sales', 'admin']}><PriceList /></RoleGate>} />
          <Route path="/sales/more" element={<RoleGate allowedRoles={['sales']}><SalesMore /></RoleGate>} />
          <Route path="/accounts/back-orders" element={<RoleGate allowedRoles={['accounts', 'admin']}><BackOrders /></RoleGate>} />

          {/* Accounts Routes */}
          <Route path="/accounts" element={<RoleGate allowedRoles={['accounts']}><AccountsDashboard /></RoleGate>} />
          <Route path="/accounts/collection-status" element={<RoleGate allowedRoles={['accounts', 'admin']}><CollectionStatus /></RoleGate>} />
          <Route path="/accounts/pending-orders" element={<RoleGate allowedRoles={['accounts', 'admin']}><OrderReview /></RoleGate>} />
          <Route path="/accounts/billing" element={<RoleGate allowedRoles={['accounts', 'admin']}><Billing /></RoleGate>} />
          <Route path="/accounts/sales" element={<RoleGate allowedRoles={['accounts', 'admin']}><SalesRecords /></RoleGate>} />
          <Route path="/accounts/payments" element={<RoleGate allowedRoles={['accounts', 'admin']}><Payments /></RoleGate>} />

          {/* Shared Routes */}
          <Route path="/stock" element={<RoleGate allowedRoles={['admin', 'accounts', 'sales', 'inventory', 'procurement']}><StockManagement /></RoleGate>} />

          {/* Inventory Routes */}
          <Route path="/inventory" element={<RoleGate allowedRoles={['inventory', 'admin']}><InventoryDashboard /></RoleGate>} />
          <Route path="/inventory/stock" element={<RoleGate allowedRoles={['inventory', 'admin']}><InventoryStock /></RoleGate>} />
          <Route path="/inventory/brands" element={<RoleGate allowedRoles={['inventory', 'admin']}><Brands /></RoleGate>} />
          <Route path="/inventory/products" element={<RoleGate allowedRoles={['inventory', 'admin']}><Products /></RoleGate>} />
          <Route path="/inventory/adjustment" element={<RoleGate allowedRoles={['inventory', 'admin']}><StockAdjustment /></RoleGate>} />
          <Route path="/inventory/transfer" element={<RoleGate allowedRoles={['inventory', 'admin']}><StockTransfer /></RoleGate>} />
          <Route path="/sales/stock-transfer" element={<RoleGate allowedRoles={['sales', 'admin', 'inventory']}><StockTransfer /></RoleGate>} />
          <Route path="/inventory/reports" element={<RoleGate allowedRoles={['inventory', 'admin']}><InventoryReports /></RoleGate>} />
          <Route path="/inventory/delivery" element={<RoleGate allowedRoles={['inventory', 'admin']}><DeliveryManagement /></RoleGate>} />

          {/* Procurement Routes */}
          <Route path="/procurement" element={<RoleGate allowedRoles={['procurement', 'admin']}><ProcurementDashboard /></RoleGate>} />
          <Route path="/procurement/orders" element={<RoleGate allowedRoles={['procurement', 'admin']}><PurchaseOrders /></RoleGate>} />
          <Route path="/procurement/history" element={<RoleGate allowedRoles={['procurement', 'admin']}><PurchaseHistory /></RoleGate>} />
          <Route path="/procurement/suppliers" element={<RoleGate allowedRoles={['procurement', 'admin']}><Suppliers /></RoleGate>} />
          <Route path="/procurement/grn" element={<RoleGate allowedRoles={['procurement', 'admin']}><GRN /></RoleGate>} />
          <Route path="/procurement/reports" element={<RoleGate allowedRoles={['procurement', 'admin']}><ProcurementReports /></RoleGate>} />
        </Route>

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
          <CustomerDialogProvider>
            <AppRoutes />
          </CustomerDialogProvider>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
