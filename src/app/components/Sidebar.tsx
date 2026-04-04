import React, { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '@/app/contexts/AuthContext';
import {
  LayoutDashboard, Users, Package, ShoppingCart, TrendingUp,
  BarChart3, FileText, LogOut, DollarSign, FileCheck, Boxes,
  Plus, Receipt, Wallet, ClipboardCheck, Truck, Car,
  UserCircle, ChevronRight, ChevronDown, X, PanelLeftClose, PanelLeftOpen,
  ClipboardList, Activity,
} from 'lucide-react';

interface NavItem { label: string; path: string; icon: React.ReactNode; }
interface NavGroup { title: string; items: NavItem[]; }

const useNavGroups = (role: string | undefined): NavGroup[] => {
  if (role === 'admin') return [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={16} /> },
        { label: 'Team Management', path: '/admin/staff', icon: <Users size={16} /> },
        { label: 'Customers', path: '/admin/customers', icon: <UserCircle size={16} /> },
      ],
    },
    {
      title: 'Inventory',
      items: [
        { label: 'Brands', path: '/admin/brands', icon: <Package size={16} /> },
        { label: 'Products', path: '/admin/products', icon: <Boxes size={16} /> },
        { label: 'Stock View', path: '/stock', icon: <BarChart3 size={16} /> },
        { label: 'Inv. Management', path: '/inventory/stock', icon: <Boxes size={16} /> },
        { label: 'Adjustment', path: '/inventory/adjustment', icon: <FileCheck size={16} /> },
        { label: 'Delivery', path: '/inventory/delivery', icon: <Truck size={16} /> },
        { label: 'Delivery Drivers', path: '/admin/drivers', icon: <Car size={16} /> },
      ],
    },
    {
      title: 'Sales & Finance',
      items: [
        { label: 'Create Order', path: '/sales/create-order', icon: <Plus size={16} /> },
        { label: 'All Orders', path: '/admin/sales', icon: <ShoppingCart size={16} /> },
        { label: 'Back Order', path: '/accounts/pending-orders', icon: <FileCheck size={16} /> },
        { label: 'Billing', path: '/accounts/billing', icon: <Receipt size={16} /> },
        { label: 'Receipt Entry', path: '/sales/receipt', icon: <Receipt size={16} /> },
        { label: 'Collection Status', path: '/accounts/collection-status', icon: <ClipboardCheck size={16} /> },
        { label: 'Payments', path: '/accounts/payments', icon: <DollarSign size={16} /> },
        { label: 'Customer Analysis', path: '/admin/customer-analysis', icon: <BarChart3 size={16} /> },
        { label: 'Reports', path: '/admin/reports', icon: <FileText size={16} /> },
      ],
    },
    {
      title: 'Procurement',
      items: [
        { label: 'Purchase Orders', path: '/procurement/orders', icon: <ClipboardList size={16} /> },
        { label: 'GRN', path: '/procurement/grn', icon: <ClipboardCheck size={16} /> },
        { label: 'Purchase History', path: '/procurement/history', icon: <TrendingUp size={16} /> },
        { label: 'Suppliers', path: '/procurement/suppliers', icon: <Truck size={16} /> },
        { label: 'Proc. Reports', path: '/procurement/reports', icon: <BarChart3 size={16} /> },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Activity Log', path: '/admin/activity', icon: <Activity size={16} /> },
      ],
    },
  ];

  if (role === 'sales') return [
    {
      title: 'My Performance',
      items: [{ label: 'Dashboard', path: '/sales', icon: <LayoutDashboard size={16} /> }],
    },
    {
      title: 'Customers',
      items: [
        { label: 'My Customers', path: '/sales/my-customers', icon: <UserCircle size={16} /> },
      ],
    },
    {
      title: 'Orders',
      items: [
        { label: 'Create Order', path: '/sales/create-order', icon: <Plus size={16} /> },
        { label: 'My Orders', path: '/sales/my-orders', icon: <ShoppingCart size={16} /> },
      ],
    },
    {
      title: 'Collections',
      items: [
        { label: 'Receipt Entry', path: '/sales/receipt', icon: <Receipt size={16} /> },
        { label: 'My Collection', path: '/sales/my-collection', icon: <Wallet size={16} /> },
      ],
    },
    {
      title: 'Inventory',
      items: [
        { label: 'Stock View', path: '/stock', icon: <BarChart3 size={16} /> },
      ],
    },
  ];

  if (role === 'accounts') return [
    {
      title: 'Overview',
      items: [{ label: 'Dashboard', path: '/accounts', icon: <LayoutDashboard size={16} /> }],
    },
    {
      title: 'Approvals',
      items: [
        { label: 'Pending Orders', path: '/accounts/pending-orders', icon: <FileCheck size={16} /> },
        { label: 'Billing', path: '/accounts/billing', icon: <Receipt size={16} /> },
        { label: 'Sales Records', path: '/accounts/sales', icon: <TrendingUp size={16} /> },
      ],
    },
    {
      title: 'Finance',
      items: [
        { label: 'Collection Status', path: '/accounts/collection-status', icon: <ClipboardCheck size={16} /> },
        { label: 'Payments', path: '/accounts/payments', icon: <DollarSign size={16} /> },
        { label: 'Stock View', path: '/stock', icon: <Package size={16} /> },
      ],
    },
  ];

  if (role === 'inventory') return [
    {
      title: 'Overview',
      items: [{ label: 'Dashboard', path: '/inventory', icon: <LayoutDashboard size={16} /> }],
    },
    {
      title: 'Stock',
      items: [
        { label: 'Stock View', path: '/stock', icon: <BarChart3 size={16} /> },
        { label: 'Inventory Stock', path: '/inventory/stock', icon: <Boxes size={16} /> },
        { label: 'Stock Adjustment', path: '/inventory/adjustment', icon: <FileCheck size={16} /> },
        { label: 'Delivery', path: '/inventory/delivery', icon: <Truck size={16} /> },
      ],
    },
    {
      title: 'Catalogue',
      items: [
        { label: 'Brands', path: '/inventory/brands', icon: <Package size={16} /> },
        { label: 'Products', path: '/inventory/products', icon: <ShoppingCart size={16} /> },
        { label: 'Reports', path: '/inventory/reports', icon: <BarChart3 size={16} /> },
      ],
    },
  ];

  if (role === 'procurement') return [
    {
      title: 'Overview',
      items: [{ label: 'Dashboard', path: '/procurement', icon: <LayoutDashboard size={16} /> }],
    },
    {
      title: 'Purchase',
      items: [
        { label: 'Purchase Orders', path: '/procurement/orders', icon: <ShoppingCart size={16} /> },
        { label: 'GRN', path: '/procurement/grn', icon: <ClipboardCheck size={16} /> },
        { label: 'Purchase History', path: '/procurement/history', icon: <TrendingUp size={16} /> },
      ],
    },
    {
      title: 'Suppliers',
      items: [
        { label: 'Suppliers', path: '/procurement/suppliers', icon: <Truck size={16} /> },
        { label: 'Reports', path: '/procurement/reports', icon: <BarChart3 size={16} /> },
      ],
    },
    {
      title: 'Inventory',
      items: [
        { label: 'Stock View', path: '/stock', icon: <Package size={16} /> },
      ],
    },
  ];

  return [];
};

const ROLE_META: Record<string, { label: string; color: string; dot: string }> = {
  admin: { label: 'Administrator', color: 'text-violet-200', dot: 'bg-violet-300' },
  sales: { label: 'Sales Executive', color: 'text-white/70', dot: 'bg-white' },
  accounts: { label: 'Accounts', color: 'text-emerald-200', dot: 'bg-emerald-300' },
  inventory: { label: 'Inventory', color: 'text-sky-200', dot: 'bg-sky-300' },
  procurement: { label: 'Procurement', color: 'text-rose-200', dot: 'bg-rose-300' },
};

const getInitials = (name: string) =>
  name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

/* Tooltip for collapsed icons */
const NavTooltip = ({
  label, collapsed, children,
}: { label: string; collapsed: boolean; children: React.ReactNode }) => (
  <div className="relative group/tip">
    {children}
    {collapsed && (
      <div className="
        pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
        bg-white text-gray-800 text-xs font-medium px-2.5 py-1.5 rounded-lg
        whitespace-nowrap border border-gray-200 shadow-lg shadow-black/20
        opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150
      ">
        {label}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-white" />
      </div>
    )}
  </div>
);

export const Sidebar = ({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const groups = useNavGroups(user?.role);
  const roleMeta = ROLE_META[user?.role ?? ''];

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => Object.fromEntries(groups.map(g => [g.title, true]))
  );
  const toggleSection = (title: string) =>
    setOpenSections(prev => ({ ...prev, [title]: !prev[title] }));

  const isActive = (path: string) => {
    const rootPaths = ['/admin', '/sales', '/accounts', '/inventory', '/procurement'];
    if (rootPaths.includes(path)) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const w = isCollapsed ? 'lg:w-[68px]' : 'lg:w-[240px]';

  return (
    <aside
      className={`
        h-screen text-white flex flex-col fixed left-0 top-0 z-40
        border-r border-white/10
        transition-[width,transform] duration-300 ease-in-out
        ${isOpen ? 'translate-x-0 w-[240px]' : '-translate-x-full lg:translate-x-0'}
        ${w}
      `}
      style={{
        background: 'linear-gradient(178deg, #0b1320 0%, #111d2d 62%, #12263a 100%)',
        boxShadow: '4px 0 28px rgba(0,0,0,0.28)',
      }}
      aria-label="Primary sidebar"
    >
      {/* ── Brand ── */}
      <div className={`flex items-center gap-3 border-b border-white/15 shrink-0 ${isCollapsed ? 'px-3 py-4 justify-center' : 'px-5 py-4'
        }`}>
        <div className="relative shrink-0">
          <img
            src="/logo.jpg"
            alt="YES YES MARKETING"
            className={`object-contain rounded-lg transition-all duration-300 ${isCollapsed ? 'h-8 w-8' : 'h-8 w-8'
              }`}
          />
          {/* Live indicator dot */}
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-300 rounded-full border-2 border-[#0f1a2a]" />
        </div>
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white leading-tight tracking-widest uppercase">
              YES YES
            </p>
            <p className="text-[9px] text-white/60 leading-tight tracking-[0.2em] uppercase">
              Marketing ERP
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden ml-auto p-1 rounded-md text-white/60 hover:bg-white/20 hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1a2a]"
          aria-label="Close sidebar"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── User Profile ── */}
      <div className={`border-b border-white/15 shrink-0 ${isCollapsed ? 'px-3 py-3' : 'px-4 py-3.5'
        }`}>
        {isCollapsed ? (
          <NavTooltip
            label={`${user?.full_name} · ${roleMeta?.label ?? ''}`}
            collapsed
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-xs font-bold text-white mx-auto cursor-default select-none">
              {getInitials(user?.full_name ?? 'U')}
            </div>
          </NavTooltip>
        ) : (
            <div className="flex items-center gap-3 bg-white/[0.07] rounded-xl px-3 py-2.5 border border-white/10">
              <div className="relative w-8 h-8 rounded-xl bg-white/[0.08] border border-white/15 flex items-center justify-center text-xs font-bold text-white shrink-0 select-none">
              {getInitials(user?.full_name ?? 'U')}
              {roleMeta && (
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0f1a2a] ${roleMeta.dot}`} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">{user?.full_name}</p>
              {roleMeta && (
                <p className={`text-[10px] mt-0.5 leading-none font-medium ${roleMeta.color}`}>
                  {roleMeta.label}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav aria-label="Main navigation" className={`flex-1 overflow-y-auto py-4 custom-scrollbar ${isCollapsed ? 'px-2.5' : 'px-3'
        } space-y-5`}>
        {groups.map((group) => {
          const sectionOpen = openSections[group.title] ?? true;
          return (
            <div key={group.title}>
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => toggleSection(group.title)}
                  className="w-full flex items-center justify-between px-2 mb-2 group/sec focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1a2a] rounded-md"
                  aria-expanded={sectionOpen}
                  aria-controls={`sidebar-section-${group.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <span className="text-[9px] font-bold text-white/50 uppercase tracking-[0.18em] group-hover/sec:text-white/80 transition-colors">
                    {group.title}
                  </span>
                  <ChevronDown
                    size={10}
                    className={`text-white/40 group-hover/sec:text-white/80 transition-all duration-200 ${sectionOpen ? 'rotate-0' : '-rotate-90'
                      }`}
                  />
                </button>
              ) : (
                <div className="w-5 h-px bg-white/10 mx-auto mb-2 mt-1" />
              )}

              <ul
                id={`sidebar-section-${group.title.toLowerCase().replace(/\s+/g, '-')}`}
                className={`space-y-0.5 overflow-hidden transition-all duration-250 ease-in-out ${!isCollapsed && !sectionOpen ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'
                }`}>
                {group.items.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <li key={item.path}>
                      <NavTooltip label={item.label} collapsed={isCollapsed}>
                        <Link
                          to={item.path}
                          onClick={onClose}
                          aria-label={item.label}
                          className={`
                            relative flex items-center rounded-lg text-[13px] font-medium
                            transition-all duration-150 group/link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1a2a]
                            ${isCollapsed
                              ? 'justify-center w-10 h-9 mx-auto'
                              : 'gap-2.5 px-3 py-2'
                            }
                            ${active
                              ? 'bg-primary/22 text-white border border-primary/25'
                              : 'text-white/75 hover:bg-white/[0.08] hover:text-white border border-transparent'
                            }
                          `}
                        >
                          {/* Active accent bar */}
                          {active && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full shadow-[0_0_10px_rgba(0,189,180,0.7)]" />
                          )}
                          <span className={`shrink-0 transition-colors ${active
                            ? 'text-white'
                            : 'text-white/60 group-hover/link:text-white/90'
                            }`}>
                            {item.icon}
                          </span>
                          {!isCollapsed && (
                            <span className="flex-1 truncate">{item.label}</span>
                          )}
                          {!isCollapsed && active && (
                            <ChevronRight size={11} className="text-white/60 shrink-0" />
                          )}
                        </Link>
                      </NavTooltip>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* ── Collapse toggle ── */}
      <div className="hidden lg:block px-3 py-2 border-t border-white/15 shrink-0">
        <NavTooltip
          label={isCollapsed ? 'Expand' : 'Collapse'}
          collapsed={isCollapsed}
        >
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`w-full flex items-center rounded-lg text-xs font-medium text-white/70 hover:bg-white/15 hover:text-white transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1a2a] ${isCollapsed ? 'justify-center h-9' : 'gap-2.5 px-3 py-2'
              }`}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed
              ? <PanelLeftOpen size={15} />
              : <><PanelLeftClose size={15} /><span>Collapse</span></>
            }
          </button>
        </NavTooltip>
      </div>

      {/* ── Sign Out ── */}
      <div className={`border-t border-white/15 shrink-0 ${isCollapsed ? 'px-3 py-3' : 'px-3 py-3'}`}>
        <NavTooltip label="Sign Out" collapsed={isCollapsed}>
          <button
            type="button"
            onClick={logout}
            className={`w-full flex items-center rounded-lg text-xs font-medium text-white/70 hover:bg-red-500/20 hover:text-red-200 transition-all duration-150 group/out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1a2a] ${isCollapsed ? 'justify-center h-9' : 'gap-2.5 px-3 py-2'
              }`}
            aria-label="Sign out"
          >
            <LogOut size={15} className="shrink-0 transition-colors group-hover/out:text-red-400" />
            {!isCollapsed && <span className="text-[13px]">Sign Out</span>}
          </button>
        </NavTooltip>
      </div>
    </aside>
  );
};
