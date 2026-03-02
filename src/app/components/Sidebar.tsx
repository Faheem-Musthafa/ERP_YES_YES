import React, { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '@/app/contexts/AuthContext';
import {
  LayoutDashboard, Users, Package, ShoppingCart, TrendingUp,
  BarChart3, FileText, LogOut, DollarSign, FileCheck, Boxes,
  Plus, Receipt, Wallet, ClipboardCheck, Truck,
  UserCircle, ChevronLeft, ChevronRight, X, PanelLeftClose, PanelLeftOpen,
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

  if (role === 'procurement') return [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', path: '/procurement', icon: <LayoutDashboard size={18} /> },
      ],
    },
    {
      title: 'Purchase',
      items: [
        { label: 'Purchase Orders', path: '/procurement/orders', icon: <ShoppingCart size={18} /> },
        { label: 'GRN', path: '/procurement/grn', icon: <ClipboardCheck size={18} /> },
        { label: 'Purchase History', path: '/procurement/history', icon: <TrendingUp size={18} /> },
      ],
    },
    {
      title: 'Suppliers',
      items: [
        { label: 'Suppliers', path: '/procurement/suppliers', icon: <Truck size={18} /> },
        { label: 'Reports', path: '/procurement/reports', icon: <BarChart3 size={18} /> },
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
  procurement: { label: 'Procurement', color: 'bg-pink-500/20 text-pink-200' },
};

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

/* Tooltip wrapper — shows label on hover when sidebar is collapsed */
const NavTooltip = ({ label, collapsed, children }: { label: string; collapsed: boolean; children: React.ReactNode }) => (
  <div className="relative group/tip">
    {children}
    {collapsed && (
      <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
        bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap
        opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 shadow-xl">
        {label}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
      </div>
    )}
  </div>
);

export const Sidebar = ({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) => {
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

  const sidebarWidth = isCollapsed ? 'lg:w-[72px]' : 'lg:w-64';

  return (
    <div
      className={`
        h-screen bg-gradient-to-b from-[#2da89f] via-[#34b0a7] to-[#2a9d94]
        text-white flex flex-col fixed left-0 top-0 z-40 shadow-xl
        transition-[width,transform] duration-300 ease-in-out
        ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
        ${sidebarWidth}
      `}
    >
      {/* ── Brand / Logo ── */}
      <div className={`flex items-center border-b border-white/10 shrink-0 ${isCollapsed ? 'px-3 py-4 justify-center' : 'px-4 py-4 gap-3'}`}>
        <img
          src="/logo.jpg"
          alt="YES YES MARKETING"
          className={`object-contain rounded-lg shrink-0 transition-all duration-300 ${isCollapsed ? 'h-9 w-9' : 'h-9 w-auto max-w-[120px]'}`}
        />
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white leading-tight tracking-wide">YES YES</p>
            <p className="text-[10px] text-white/70 leading-tight">MARKETING</p>
          </div>
        )}
        {/* Mobile close */}
        <button
          onClick={onClose}
          className="lg:hidden ml-auto p-1.5 rounded-lg text-white/70 hover:bg-white/10 transition-colors shrink-0"
          aria-label="Close sidebar"
        >
          <X size={17} />
        </button>
      </div>

      {/* ── User Profile ── */}
      <div className={`border-b border-white/10 shrink-0 ${isCollapsed ? 'px-3 py-3' : 'px-4 py-3'}`}>
        {isCollapsed ? (
          <NavTooltip label={`${user?.full_name} — ${roleBadge?.label ?? ''}`} collapsed>
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-sm font-bold mx-auto cursor-default">
              {getInitials(user?.full_name ?? 'U')}
            </div>
          </NavTooltip>
        ) : (
          <div className="flex items-center gap-3 bg-white/10 rounded-xl px-3 py-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-sm font-bold shrink-0">
              {getInitials(user?.full_name ?? 'U')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.full_name}</p>
              {roleBadge && (
                <span className={`inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${roleBadge.color}`}>
                  {roleBadge.label}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className={`flex-1 overflow-y-auto py-3 custom-scrollbar ${isCollapsed ? 'px-2' : 'px-3'} space-y-4`}>
        {groups.map((group) => (
          <div key={group.title}>
            {!isCollapsed && (
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.15em] px-3 mb-1.5">
                {group.title}
              </p>
            )}
            {isCollapsed && <div className="w-7 h-px bg-white/10 mx-auto mb-2 mt-1" />}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    <NavTooltip label={item.label} collapsed={isCollapsed}>
                      <Link
                        to={item.path}
                        onClick={onClose}
                        className={`
                          flex items-center rounded-xl text-sm font-medium transition-all duration-150 relative group
                          ${isCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 py-2.5'}
                          ${active
                            ? 'bg-white/20 text-white shadow-sm'
                            : 'text-white/80 hover:bg-white/10 hover:text-white'
                          }
                        `}
                      >
                        {active && !isCollapsed && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r-full" />
                        )}
                        {active && isCollapsed && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r-full" />
                        )}
                        <span className={`shrink-0 transition-colors ${active ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>
                          {item.icon}
                        </span>
                        {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                        {!isCollapsed && active && <ChevronRight size={13} className="text-white/60 shrink-0" />}
                      </Link>
                    </NavTooltip>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Collapse toggle (desktop only) ── */}
      <div className="hidden lg:block px-3 py-2 border-t border-white/10 shrink-0">
        <NavTooltip label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} collapsed={isCollapsed}>
          <button
            onClick={onToggleCollapse}
            className={`w-full flex items-center rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all duration-150 ${isCollapsed ? 'justify-center h-10' : 'gap-3 px-3 py-2.5'}`}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <><PanelLeftClose size={18} /><span>Collapse</span></>}
          </button>
        </NavTooltip>
      </div>

      {/* ── Sign Out ── */}
      <div className={`border-t border-white/10 shrink-0 ${isCollapsed ? 'px-3 py-3' : 'px-3 py-3'}`}>
        <NavTooltip label="Sign Out" collapsed={isCollapsed}>
          <button
            onClick={logout}
            className={`w-full flex items-center rounded-xl text-sm font-medium text-white/70 hover:bg-red-500/15 hover:text-red-200 transition-all duration-150 group ${isCollapsed ? 'justify-center h-10' : 'gap-3 px-3 py-2.5'}`}
          >
            <LogOut size={18} className="shrink-0 group-hover:text-red-300 transition-colors" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </NavTooltip>
      </div>
    </div>
  );
};
