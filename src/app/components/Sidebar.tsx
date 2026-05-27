import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '@/app/contexts/AuthContext';
import { cloneCompanyProfiles, getPrimaryCompanyName, loadCompanyProfiles } from '@/app/companyProfiles';
import {
  LogOut, ChevronRight, ChevronDown, X, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { getSidebarGroupsForRole, type Role } from '@/app/navigation/routes';

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
  const groups = getSidebarGroupsForRole(user?.role as Role | undefined);
  const [companyProfiles, setCompanyProfiles] = useState(cloneCompanyProfiles());

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => Object.fromEntries(groups.map(g => [g.title, true]))
  );
  const primaryCompanyName = getPrimaryCompanyName(companyProfiles);

  useEffect(() => {
    void loadCompanyProfiles()
      .then(setCompanyProfiles)
      .catch(() => undefined);
  }, []);

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
        backgroundColor: 'var(--brand-900)',
        boxShadow: '4px 0 28px rgba(0,48,46,0.4)',
      }}
      aria-label="Primary sidebar"
    >
      {/* ── Brand ── */}
      <div className={`shrink-0 border-b border-white/10 ${isCollapsed ? 'px-2 py-4' : 'px-5 py-6'}`}>
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="relative shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-white to-teal-50 shadow-lg shadow-black/20">
            <img
              src="/logo.jpg"
              alt="Logo"
              className="w-7 h-7 object-contain mix-blend-multiply"
            />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h2 className="text-[14px] font-black tracking-tight text-white leading-none">
                {primaryCompanyName}
              </h2>
              <p className="text-[10px] font-bold text-teal-300/80 uppercase tracking-widest mt-1">
                ERP System
              </p>
            </div>
          )}
          {!isCollapsed && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
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
                  <span className="text-[10px] font-black text-teal-300/60 uppercase tracking-[0.15em] group-hover/sec:text-white/80 transition-colors">
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
                  const Icon = item.icon;
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
                              ? 'bg-white/20 text-white border border-white/25 shadow-sm font-bold'
                              : 'text-white/90 hover:bg-white/10 hover:text-white border border-transparent'
                            }
                          `}
                        >
                          {/* Active accent bar */}
                          {active && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-6 bg-white rounded-r-full shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
                          )}
                          <span className={`shrink-0 transition-colors ${active
                            ? 'text-white'
                            : 'text-white/70 group-hover/link:text-white'
                            }`}>
                            <Icon size={16} />
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
