import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/app/contexts/AuthContext';
import { Layout } from '@/app/components/Layout';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { Toaster } from '@/app/components/ui/sonner';
import { CustomerDialogProvider } from '@/app/components/CustomerDialogProvider';
import { PROTECTED_ROUTES } from '@/app/navigation/routes';

// Single QueryClient instance shared by all hooks. Sensible defaults for an
// ERP: don't refetch on window focus (sales rep tabs between mobile + email
// all day), stale-after 30s so subsequent renders are instant.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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
const BulkBillUpload = lazy(() => import('@/app/pages/admin/BulkBillUpload').then(m => ({ default: m.BulkBillUpload })));

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
// Outlet is wrapped in an inline ErrorBoundary keyed by pathname so a single
// page crash doesn't unmount the entire app chrome; navigating to a working
// route resets the boundary.
const ProtectedShell = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return Loader;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_active) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  return (
    <Layout>
      <ErrorBoundary inline resetKey={location.pathname}>
        <Outlet />
      </ErrorBoundary>
    </Layout>
  );
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
//
// Component-by-path is wired here, but the *list* of paths + per-path
// `allowedRoles` lives in `navigation/routes.ts`. Adding a new route requires
// one edit in routes.ts plus one entry in COMPONENTS_BY_PATH below — no
// hand-written <Route> JSX and no risk of allowedRoles drifting between
// App.tsx, Sidebar, and SalesMobileNav.

const COMPONENTS_BY_PATH: Record<string, React.ComponentType> = {
  // Admin
  '/admin': AdminDashboard,
  '/admin/staff': StaffManagement,
  '/admin/customers': Customers,
  '/admin/customers/new': CustomerForm,
  '/admin/customers/:id/edit': CustomerForm,
  '/admin/customer-analysis': CustomerAnalysisReport,
  '/admin/brands': Brands,
  '/admin/products': Products,
  '/admin/sales': SalesRecords,
  '/admin/bulk-bills': BulkBillUpload,
  '/admin/reports': AdminReports,
  '/admin/drivers': DeliveryDrivers,
  '/admin/activity': ActivityLog,
  '/admin/settings': AdminSettings,
  // Sales
  '/sales': SalesDashboard,
  '/sales/my-customers': MyCustomers,
  '/sales/create-order': CreateOrder,
  '/sales/credit-note': CreditNote,
  '/sales/my-orders': MyOrders,
  '/sales/approved-sales': ApprovedSales,
  '/sales/back-orders': BackOrders,
  '/sales/receipt': ReceiptEntry,
  '/sales/my-collection': MyCollection,
  '/sales/collection-status': CollectionStatus,
  '/sales/price-list': PriceList,
  '/sales/more': SalesMore,
  '/sales/stock-transfer': StockTransfer,
  // Accounts
  '/accounts': AccountsDashboard,
  '/accounts/pending-orders': OrderReview,
  '/accounts/back-orders': BackOrders,
  '/accounts/billing': Billing,
  '/accounts/sales': SalesRecords,
  '/accounts/collection-status': CollectionStatus,
  '/accounts/payments': Payments,
  // Shared
  '/stock': StockManagement,
  // Inventory
  '/inventory': InventoryDashboard,
  '/inventory/stock': InventoryStock,
  '/inventory/brands': Brands,
  '/inventory/products': Products,
  '/inventory/adjustment': StockAdjustment,
  '/inventory/transfer': StockTransfer,
  '/inventory/reports': InventoryReports,
  '/inventory/delivery': DeliveryManagement,
  // Procurement
  '/procurement': ProcurementDashboard,
  '/procurement/orders': PurchaseOrders,
  '/procurement/history': PurchaseHistory,
  '/procurement/suppliers': Suppliers,
  '/procurement/grn': GRN,
  '/procurement/reports': ProcurementReports,
};

// Sanity check at boot: every protected route in the registry must have a
// component wired up here. Catches drift in dev/CI instead of at runtime.
if (import.meta.env.DEV) {
  for (const r of PROTECTED_ROUTES) {
    if (!COMPONENTS_BY_PATH[r.path]) {
      console.error(`[routes] No component wired for ${r.path} — add it to COMPONENTS_BY_PATH in App.tsx`);
    }
  }
}

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
          {PROTECTED_ROUTES.map((r) => {
            const Component = COMPONENTS_BY_PATH[r.path];
            if (!Component) return null;
            return (
              <Route
                key={r.path}
                path={r.path}
                element={
                  <RoleGate allowedRoles={r.allowedRoles}>
                    <Component />
                  </RoleGate>
                }
              />
            );
          })}
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
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <CustomerDialogProvider>
              <AppRoutes />
            </CustomerDialogProvider>
            <Toaster />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
