import React from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '@/app/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
  BarChart3,
  FileText,
  LogOut,
  UserCircle,
  DollarSign,
  FileCheck,
  Boxes,
  Plus,
  Receipt,
  Wallet,
  ClipboardCheck,
  Truck,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const getNavItems = (): NavItem[] => {
    if (user?.role === 'admin') {
      return [
        { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} /> },
        { label: 'Staff Management', path: '/admin/staff', icon: <Users size={20} /> },
        { label: 'Customers', path: '/admin/customers', icon: <UserCircle size={20} /> },
        { label: 'Brands', path: '/admin/brands', icon: <Package size={20} /> },
        { label: 'Products', path: '/admin/products', icon: <Boxes size={20} /> },
        { label: 'Create Order', path: '/sales/create-order', icon: <Plus size={20} /> },
        { label: 'All Orders', path: '/admin/orders', icon: <ShoppingCart size={20} /> },
        { label: 'Pending Orders', path: '/accounts/pending-orders', icon: <FileCheck size={20} /> },
        { label: 'Sales', path: '/admin/sales', icon: <TrendingUp size={20} /> },
        { label: 'Receipt', path: '/sales/receipt', icon: <Receipt size={20} /> },
        { label: 'My Collection', path: '/sales/my-collection', icon: <Wallet size={20} /> },
        { label: 'Collection Status', path: '/accounts/collection-status', icon: <ClipboardCheck size={20} /> },
        { label: 'Payments', path: '/accounts/payments', icon: <DollarSign size={20} /> },
        { label: 'Stock', path: '/stock', icon: <Package size={20} /> },
        { label: 'Reports', path: '/admin/reports', icon: <FileText size={20} /> },
      ];
    } else if (user?.role === 'sales') {
      return [
        { label: 'Dashboard', path: '/sales', icon: <LayoutDashboard size={20} /> },
        { label: 'Create Order', path: '/sales/create-order', icon: <ShoppingCart size={20} /> },
        { label: 'My Orders', path: '/sales/my-orders', icon: <FileText size={20} /> },
        { label: 'Receipt', path: '/sales/receipt', icon: <Receipt size={20} /> },
        { label: 'My Collection', path: '/sales/my-collection', icon: <Wallet size={20} /> },
      ];
    } else if (user?.role === 'accounts') {
      return [
        { label: 'Dashboard', path: '/accounts', icon: <LayoutDashboard size={20} /> },
        { label: 'Pending Orders', path: '/accounts/pending-orders', icon: <FileCheck size={20} /> },
        { label: 'Sales Records', path: '/accounts/sales', icon: <TrendingUp size={20} /> },
        { label: 'Collection Status', path: '/accounts/collection-status', icon: <ClipboardCheck size={20} /> },
        { label: 'Payments', path: '/accounts/payments', icon: <DollarSign size={20} /> },
        { label: 'Stock', path: '/stock', icon: <Package size={20} /> },
      ];
    } else if (user?.role === 'inventory') {
      return [
        { label: 'Dashboard', path: '/inventory', icon: <LayoutDashboard size={20} /> },
        { label: 'Stock', path: '/inventory/stock', icon: <Boxes size={20} /> },
        { label: 'Brands', path: '/inventory/brands', icon: <Package size={20} /> },
        { label: 'Products', path: '/inventory/products', icon: <ShoppingCart size={20} /> },
        { label: 'Stock Adjustment', path: '/inventory/adjustment', icon: <FileCheck size={20} /> },
        { label: 'Delivery Management', path: '/inventory/delivery', icon: <Truck size={20} /> },
        { label: 'Reports', path: '/inventory/reports', icon: <BarChart3 size={20} /> },
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  return (
    <div className="w-64 h-screen bg-[#1e3a8a] text-white flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-blue-700">
        <h1 className="text-xl font-semibold">YES YES MARKETING</h1>
        <p className="text-sm text-blue-200 mt-1">{user?.name}</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#f97316] text-white'
                      : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-blue-700">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100 hover:bg-blue-800 hover:text-white transition-colors w-full"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};