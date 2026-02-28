import React from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '@/app/contexts/AuthContext';
import {
  LayoutDashboard, Users, Package, ShoppingCart, TrendingUp,
  BarChart3, FileText, LogOut, DollarSign, FileCheck, Boxes,
  Plus, Receipt, Wallet, ClipboardCheck, Truck,
  UserCircle, ChevronRight,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const useNavGroups = (role: string | undefined): NavGroup[] => {
  if (role === 'admin') return [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={18} /> },
        { label: 'Staff Management', path: '/admin/staff', icon: <Users size={18} /> },
        { label: 'Customers', path: '/admin/customers', icon: <UserCircle size={18} /> },
      ],
    },
    {
      title: 'Inventory & Catalogue',
      items: [
        { label: 'Brands', path: '/admin/brands', icon: <Package size={18} /> },
        { label: 'Products', path: '/admin/products', icon: <Boxes size={18} /> },
        { label: 'Stock View', path: '/stock', icon: <BarChart3 size={18} /> },
        { label: 'Inventory Management', path: '/inventory/stock', icon: <Boxes size={18} /> },
        { label: 'Stock Adjustment', path: '/inventory/adjustment', icon: <FileCheck size={18} /> },
        { label: 'Delivery Management', path: '/inventory/delivery', icon: <Truck size={18} /> },
      ],
    },
    {
      title: 'Sales & Finance',
      items: [
        { label: 'Create Order', path: '/sales/create-order', icon: <Plus size={18} /> },
        { label: 'All Orders', path: '/admin/orders', icon: <ShoppingCart size={18} /> },
        { label: 'Pending Approval', path: '/accounts/pending-orders', icon: <FileCheck size={18} /> },
        { label: 'Receipt Entry', path: '/sales/receipt', icon: <Receipt size={18} /> },
        { label: 'Collection Status', path: '/accounts/collection-status', icon: <ClipboardCheck size={18} /> },
        { label: 'Payments', path: '/accounts/payments', icon: <DollarSign size={18} /> },
        { label: 'Sales Records', path: '/admin/sales', icon: <TrendingUp size={18} /> },
        { label: 'Reports', path: '/admin/reports', icon: <FileText size={18} /> },
      ],
    },
  ];

  if (role === 'sales') return [
    {
      title: 'My Performance',
      items: [
        { label: 'Dashboard', path: '/sales', icon: <LayoutDashboard size={18} /> },
      ],
    },
    {
      title: 'Orders',
      items: [
        { label: 'Create Order', path: '/sales/create-order', icon: <Plus size={18} /> },
        { label: 'My Orders', path: '/sales/my-orders', icon: <ShoppingCart size={18} /> },
      ],
    },
    {
      title: 'Collections',
      items: [
        { label: 'Receipt Entry', path: '/sales/receipt', icon: <Receipt size={18} /> },
        { label: 'My Collection', path: '/sales/my-collection', icon: <Wallet size={18} /> },
      ],
    },
  ];

  if (role === 'accounts') return [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', path: '/accounts', icon: <LayoutDashboard size={18} /> },
      ],
    },
    {
      title: 'Approvals',
      items: [
        { label: 'Pending Orders', path: '/accounts/pending-orders', icon: <FileCheck size={18} /> },
        { label: 'Sales Records', path: '/accounts/sales', icon: <TrendingUp size={18} /> },
      ],
    },
    {
      title: 'Finance',
      items: [
        { label: 'Collection Status', path: '/accounts/collection-status', icon: <ClipboardCheck size={18} /> },
        { label: 'Payments', path: '/accounts/payments', icon: <DollarSign size={18} /> },
        { label: 'Stock View', path: '/stock', icon: <Package size={18} /> },
      ],
    },
  ];

  if (role === 'inventory') return [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', path: '/inventory', icon: <LayoutDashboard size={18} /> },
      ],
    },
    {
      title: 'Stock',
      items: [
        { label: 'Inventory Stock', path: '/inventory/stock', icon: <Boxes size={18} /> },
        { label: 'Stock Adjustment', path: '/inventory/adjustment', icon: <FileCheck size={18} /> },
        { label: 'Delivery Management', path: '/inventory/delivery', icon: <Truck size={18} /> },
      ],
    },
    {
      title: 'Catalogue',
      items: [
        { label: 'Brands', path: '/inventory/brands', icon: <Package size={18} /> },
        { label: 'Products', path: '/inventory/products', icon: <ShoppingCart size={18} /> },
        { label: 'Reports', path: '/inventory/reports', icon: <BarChart3 size={18} /> },
      ],
    },
  ];

  return [];
};

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  admin: { label: 'Administrator', color: 'bg-purple-500/20 text-purple-200' },
  sales: { label: 'Sales Executive', color: 'bg-teal-500/20 text-teal-200' },
  accounts: { label: 'Accounts', color: 'bg-green-500/20 text-green-200' },
  inventory: { label: 'Inventory', color: 'bg-teal-500/20 text-teal-200' },
};

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const groups = useNavGroups(user?.role);
  const roleBadge = ROLE_BADGE[user?.role ?? ''];

  const isActive = (path: string) => {
    if (path === '/admin' || path === '/sales' || path === '/accounts' || path === '/inventory') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="w-64 h-screen bg-[#34b0a7] text-white flex flex-col fixed left-0 top-0 shadow-2xl">

      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-white/10">
        <img src="/logo.jpg" alt="YES YES MARKETING" className="w-full h-auto object-contain rounded-xl" />
      </div>

      {/* User Profile */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#34b0a7] to-[#115e59] flex items-center justify-center text-sm font-bold text-white shrink-0">
            {getInitials(user?.full_name ?? 'U')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate drop-shadow-sm">{user?.full_name}</p>
            {roleBadge && (
              <span className={`inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium ${roleBadge.color}`}>
                {roleBadge.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5 custom-scrollbar">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="text-[10px] font-bold text-teal-800 uppercase tracking-widest px-3 mb-2">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${active
                        ? 'bg-teal-700/50 text-white shadow-sm'
                        : 'text-teal-50 hover:bg-teal-600/30 hover:text-white'
                        }`}
                    >
                      {/* Active left accent */}
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full shadow-sm" />
                      )}
                      <span className={`transition-colors ${active ? 'text-white' : 'text-teal-100 group-hover:text-white'}`}>
                        {item.icon}
                      </span>
                      <span className="flex-1 drop-shadow-sm">{item.label}</span>
                      {active && <ChevronRight size={14} className="text-white opacity-80" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-teal-50 hover:bg-red-500/10 hover:text-red-100 transition-all duration-150 group"
        >
          <LogOut size={18} className="group-hover:text-red-200 transition-colors" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
