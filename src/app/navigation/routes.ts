/**
 * Single source of truth for protected routes.
 *
 * Each entry is consumed by:
 *   - App.tsx              — generates <Route> elements + RoleGate
 *   - components/Sidebar   — derives nav groups per role
 *   - components/SalesMobileNav — derives `match` predicates per bottom tab
 *   - any future RoleGuard hook that decides if `user.role` may access a URL
 *
 * Adding a new sales page should be one edit here, not four files.
 */
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Users, Package, ShoppingCart, TrendingUp,
  BarChart3, FileText, DollarSign, FileCheck, Boxes,
  Plus, Receipt, Wallet, ClipboardCheck, Truck, Car,
  UserCircle, Activity, Settings, PackageOpen, Tags,
  RotateCcw, FileBarChart, ArrowRightLeft, FileSpreadsheet,
} from 'lucide-react';

export type Role = 'admin' | 'sales' | 'accounts' | 'inventory' | 'procurement';

/** Bottom-nav tab a route surfaces under for the sales-mobile shell. */
export type SalesMobileTab = 'home' | 'customers' | 'newOrder' | 'collect' | 'more';

export interface SidebarMeta {
  /** Per-role sidebar group + label (a route can show up in multiple roles
   *  under different group labels — keyed by role). */
  byRole: Partial<Record<Role, { group: string; label: string; icon: LucideIcon; order?: number }>>;
}

export interface RouteDef {
  /** URL pattern, including dynamic segments (e.g. `/admin/customers/:id/edit`). */
  path: string;
  /** Roles permitted to render this route. Empty/undefined => no role gate
   *  (currently unused — every protected route has at least one role). */
  allowedRoles: Role[];
  /** Sidebar group + label per role. Omit for routes hidden from the sidebar
   *  (e.g. dynamic `:id/edit` routes, deep modals). */
  sidebar?: SidebarMeta;
  /** Which bottom tab in SalesMobileNav this URL highlights when sales user
   *  is on it. Omit if not surfaced in mobile bottom nav. */
  salesMobileTab?: SalesMobileTab;
}

// ── Route registry ────────────────────────────────────────────────────────
//
// Order in this array determines load order in App.tsx; sidebar order is
// driven by the `order` field in `sidebar.byRole`.

export const PROTECTED_ROUTES: RouteDef[] = [
  // Admin
  { path: '/admin', allowedRoles: ['admin'],
    sidebar: { byRole: { admin: { group: 'Overview', label: 'Dashboard', icon: LayoutDashboard, order: 0 } } } },
  { path: '/admin/staff', allowedRoles: ['admin'],
    sidebar: { byRole: { admin: { group: 'Overview', label: 'Team Management', icon: Users, order: 1 } } } },
  { path: '/admin/customers', allowedRoles: ['admin'],
    sidebar: { byRole: { admin: { group: 'Overview', label: 'Customers', icon: UserCircle, order: 2 } } } },
  { path: '/admin/customers/new', allowedRoles: ['admin'] },
  { path: '/admin/customers/:id/edit', allowedRoles: ['admin'] },
  { path: '/admin/customer-analysis', allowedRoles: ['admin'],
    sidebar: { byRole: { admin: { group: 'Sales & Finance', label: 'Customer Analysis', icon: BarChart3, order: 8 } } } },
  { path: '/admin/brands', allowedRoles: ['admin'],
    sidebar: { byRole: { admin: { group: 'Inventory', label: 'Brands', icon: Package, order: 0 } } } },
  { path: '/admin/products', allowedRoles: ['admin'],
    sidebar: { byRole: { admin: { group: 'Inventory', label: 'Products', icon: Boxes, order: 1 } } } },
  { path: '/admin/sales', allowedRoles: ['admin'],
    sidebar: { byRole: { admin: { group: 'Sales & Finance', label: 'All Orders', icon: ShoppingCart, order: 1 } } } },
  { path: '/admin/bulk-bills', allowedRoles: ['admin'],
    sidebar: { byRole: { admin: { group: 'Sales & Finance', label: 'Bulk Bills', icon: FileSpreadsheet, order: 4 } } } },
  { path: '/admin/reports', allowedRoles: ['admin'],
    sidebar: { byRole: { admin: { group: 'Sales & Finance', label: 'Reports', icon: FileText, order: 9 } } } },
  { path: '/admin/drivers', allowedRoles: ['admin'],
    sidebar: { byRole: { admin: { group: 'Inventory', label: 'Delivery Drivers', icon: Car, order: 6 } } } },
  { path: '/admin/activity', allowedRoles: ['admin'],
    sidebar: { byRole: { admin: { group: 'System', label: 'Activity Log', icon: Activity, order: 0 } } } },
  { path: '/admin/settings', allowedRoles: ['admin'],
    sidebar: { byRole: { admin: { group: 'System', label: 'Settings', icon: Settings, order: 1 } } } },

  // Sales
  { path: '/sales', allowedRoles: ['sales'],
    sidebar: { byRole: { sales: { group: 'My Performance', label: 'Dashboard', icon: LayoutDashboard, order: 0 } } },
    salesMobileTab: 'home' },
  { path: '/sales/my-customers', allowedRoles: ['sales'],
    sidebar: { byRole: { sales: { group: 'Customers', label: 'My Customers', icon: UserCircle, order: 0 } } },
    salesMobileTab: 'customers' },
  { path: '/sales/create-order', allowedRoles: ['sales', 'admin'],
    sidebar: {
      byRole: {
        sales: { group: 'Orders', label: 'Create Order', icon: Plus, order: 0 },
        admin: { group: 'Sales & Finance', label: 'Create Order', icon: Plus, order: 0 },
      },
    },
    salesMobileTab: 'newOrder' },
  { path: '/sales/credit-note', allowedRoles: ['sales', 'admin'],
    salesMobileTab: 'more' },
  { path: '/sales/my-orders', allowedRoles: ['sales'],
    sidebar: { byRole: { sales: { group: 'Orders', label: 'My Orders', icon: ShoppingCart, order: 1 } } },
    salesMobileTab: 'more' },
  { path: '/sales/approved-sales', allowedRoles: ['sales', 'admin'],
    sidebar: { byRole: { sales: { group: 'Orders', label: 'Sales', icon: TrendingUp, order: 2 } } },
    salesMobileTab: 'more' },
  { path: '/sales/back-orders', allowedRoles: ['sales', 'admin', 'accounts'],
    sidebar: {
      byRole: {
        sales: { group: 'Orders', label: 'Back Orders', icon: PackageOpen, order: 3 },
      },
    },
    salesMobileTab: 'more' },
  { path: '/sales/receipt', allowedRoles: ['sales', 'admin'],
    sidebar: {
      byRole: {
        sales: { group: 'Collections', label: 'Receipt Entry', icon: Receipt, order: 0 },
        admin: { group: 'Sales & Finance', label: 'Receipt Entry', icon: Receipt, order: 5 },
      },
    },
    salesMobileTab: 'collect' },
  { path: '/sales/my-collection', allowedRoles: ['sales', 'admin'],
    sidebar: { byRole: { sales: { group: 'Collections', label: 'My Collection', icon: Wallet, order: 1 } } },
    salesMobileTab: 'collect' },
  { path: '/sales/collection-status', allowedRoles: ['sales', 'admin'],
    salesMobileTab: 'more' },
  { path: '/sales/price-list', allowedRoles: ['sales', 'admin'],
    sidebar: {
      byRole: {
        sales: { group: 'Inventory', label: 'Price List', icon: Tags, order: 0 },
        admin: { group: 'Inventory', label: 'Price List', icon: Tags, order: 2 },
      },
    },
    salesMobileTab: 'more' },
  { path: '/sales/more', allowedRoles: ['sales'],
    salesMobileTab: 'more' },
  { path: '/sales/stock-transfer', allowedRoles: ['sales', 'admin', 'inventory'],
    salesMobileTab: 'more' },

  // Accounts
  { path: '/accounts', allowedRoles: ['accounts'],
    sidebar: { byRole: { accounts: { group: 'Overview', label: 'Dashboard', icon: LayoutDashboard, order: 0 } } } },
  { path: '/accounts/pending-orders', allowedRoles: ['accounts', 'admin'],
    sidebar: {
      byRole: {
        accounts: { group: 'Approvals', label: 'Pending Orders', icon: FileCheck, order: 0 },
        admin: { group: 'Sales & Finance', label: 'Pending Orders', icon: FileCheck, order: 2 },
      },
    } },
  { path: '/accounts/back-orders', allowedRoles: ['accounts', 'admin'],
    sidebar: {
      byRole: {
        accounts: { group: 'Approvals', label: 'Back Orders', icon: PackageOpen, order: 1 },
        admin: { group: 'Sales & Finance', label: 'Back Orders', icon: PackageOpen, order: 3 },
      },
    } },
  { path: '/accounts/billing', allowedRoles: ['accounts', 'admin'],
    sidebar: {
      byRole: {
        accounts: { group: 'Approvals', label: 'Billing', icon: Receipt, order: 2 },
        admin: { group: 'Sales & Finance', label: 'Billing', icon: Receipt, order: 4 },
      },
    } },
  { path: '/accounts/sales', allowedRoles: ['accounts', 'admin'],
    sidebar: { byRole: { accounts: { group: 'Approvals', label: 'Sales Records', icon: TrendingUp, order: 3 } } } },
  { path: '/accounts/collection-status', allowedRoles: ['accounts', 'admin'],
    sidebar: {
      byRole: {
        accounts: { group: 'Finance', label: 'Collection Status', icon: ClipboardCheck, order: 0 },
        admin: { group: 'Sales & Finance', label: 'Collection Status', icon: ClipboardCheck, order: 6 },
      },
    } },
  { path: '/accounts/payments', allowedRoles: ['accounts', 'admin'],
    sidebar: {
      byRole: {
        accounts: { group: 'Finance', label: 'Payments', icon: DollarSign, order: 1 },
        admin: { group: 'Sales & Finance', label: 'Payments', icon: DollarSign, order: 7 },
      },
    } },

  // Shared
  { path: '/stock', allowedRoles: ['admin', 'accounts', 'sales', 'inventory', 'procurement'],
    sidebar: {
      byRole: {
        admin: { group: 'Inventory', label: 'Stock View', icon: BarChart3, order: 2 },
        sales: { group: 'Inventory', label: 'Stock View', icon: BarChart3, order: 1 },
        accounts: { group: 'Finance', label: 'Stock View', icon: Package, order: 2 },
        inventory: { group: 'Stock', label: 'Stock View', icon: BarChart3, order: 0 },
        procurement: { group: 'Inventory', label: 'Stock View', icon: Package, order: 0 },
      },
    },
    salesMobileTab: 'more' },

  // Inventory
  { path: '/inventory', allowedRoles: ['inventory', 'admin'],
    sidebar: { byRole: { inventory: { group: 'Overview', label: 'Dashboard', icon: LayoutDashboard, order: 0 } } } },
  { path: '/inventory/stock', allowedRoles: ['inventory', 'admin'],
    sidebar: { byRole: { inventory: { group: 'Stock', label: 'Stock', icon: BarChart3, order: 1 } } } },
  { path: '/inventory/brands', allowedRoles: ['inventory', 'admin'],
    sidebar: { byRole: { inventory: { group: 'Catalogue', label: 'Brands', icon: Package, order: 0 } } } },
  { path: '/inventory/products', allowedRoles: ['inventory', 'admin'],
    sidebar: { byRole: { inventory: { group: 'Catalogue', label: 'Products', icon: ShoppingCart, order: 1 } } } },
  { path: '/inventory/adjustment', allowedRoles: ['inventory', 'admin'],
    sidebar: {
      byRole: {
        inventory: { group: 'Stock', label: 'Stock Adjustment', icon: FileCheck, order: 2 },
        admin: { group: 'Inventory', label: 'Adjustment', icon: FileCheck, order: 3 },
      },
    } },
  { path: '/inventory/transfer', allowedRoles: ['inventory', 'admin'],
    sidebar: { byRole: { inventory: { group: 'Stock', label: 'Transfer', icon: ArrowRightLeft, order: 3 } } } },
  { path: '/inventory/reports', allowedRoles: ['inventory', 'admin'],
    sidebar: { byRole: { inventory: { group: 'Catalogue', label: 'Reports', icon: BarChart3, order: 2 } } } },
  { path: '/inventory/delivery', allowedRoles: ['inventory', 'admin'],
    sidebar: {
      byRole: {
        inventory: { group: 'Stock', label: 'Delivery', icon: Truck, order: 4 },
        admin: { group: 'Inventory', label: 'Delivery', icon: Truck, order: 5 },
      },
    } },

  // Procurement
  { path: '/procurement', allowedRoles: ['procurement', 'admin'],
    sidebar: { byRole: { procurement: { group: 'Overview', label: 'Dashboard', icon: LayoutDashboard, order: 0 } } } },
  { path: '/procurement/orders', allowedRoles: ['procurement', 'admin'],
    sidebar: { byRole: { procurement: { group: 'Purchase', label: 'Purchase Orders', icon: ShoppingCart, order: 0 } } } },
  { path: '/procurement/history', allowedRoles: ['procurement', 'admin'],
    sidebar: { byRole: { procurement: { group: 'Purchase', label: 'Purchase History', icon: RotateCcw, order: 1 } } } },
  { path: '/procurement/suppliers', allowedRoles: ['procurement', 'admin'],
    sidebar: { byRole: { procurement: { group: 'Purchase', label: 'Suppliers', icon: Truck, order: 2 } } } },
  { path: '/procurement/grn', allowedRoles: ['procurement', 'admin'],
    sidebar: { byRole: { procurement: { group: 'Purchase', label: 'GRN', icon: FileCheck, order: 3 } } } },
  { path: '/procurement/reports', allowedRoles: ['procurement', 'admin'],
    sidebar: { byRole: { procurement: { group: 'Purchase', label: 'Reports', icon: FileBarChart, order: 4 } } } },
];

// ── Sidebar derivation ────────────────────────────────────────────────────

export interface SidebarNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}
export interface SidebarNavGroup {
  title: string;
  items: SidebarNavItem[];
}

/** Build sidebar groups for `role` from the registry. */
export function getSidebarGroupsForRole(role: Role | undefined): SidebarNavGroup[] {
  if (!role) return [];
  const groupOrder: string[] = [];
  const groups: Record<string, Array<{ item: SidebarNavItem; order: number }>> = {};

  for (const route of PROTECTED_ROUTES) {
    const meta = route.sidebar?.byRole[role];
    if (!meta) continue;
    if (!groups[meta.group]) {
      groups[meta.group] = [];
      groupOrder.push(meta.group);
    }
    groups[meta.group].push({
      item: { label: meta.label, path: route.path, icon: meta.icon },
      order: meta.order ?? 999,
    });
  }

  return groupOrder.map((title) => ({
    title,
    items: groups[title].sort((a, b) => a.order - b.order).map((x) => x.item),
  }));
}

// ── Sales mobile-nav derivation ───────────────────────────────────────────

/** All paths that should highlight the given sales-mobile tab. */
export function getSalesMobilePaths(tab: SalesMobileTab): string[] {
  return PROTECTED_ROUTES
    .filter((r) => r.salesMobileTab === tab)
    .map((r) => r.path);
}

// ── Access check ──────────────────────────────────────────────────────────

/** Returns the matching route definition for a path, if any. */
export function findRouteDef(pathname: string): RouteDef | undefined {
  // Exact match first (most routes are static); fall back to prefix match for
  // sub-routes that share a parent.
  const exact = PROTECTED_ROUTES.find((r) => r.path === pathname);
  if (exact) return exact;
  return PROTECTED_ROUTES.find((r) => {
    if (!r.path.includes(':')) return pathname.startsWith(r.path + '/');
    const pattern = new RegExp('^' + r.path.replace(/:[^/]+/g, '[^/]+') + '$');
    return pattern.test(pathname);
  });
}

export function isRoleAllowed(role: Role | undefined, route: RouteDef): boolean {
  if (!role) return false;
  return route.allowedRoles.includes(role);
}
