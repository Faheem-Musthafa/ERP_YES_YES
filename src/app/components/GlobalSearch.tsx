import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { cn } from '@/app/components/ui/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  Users, Package, ShoppingCart, Truck, Boxes, X, Loader2, AlertCircle,
} from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: 'customer' | 'product' | 'order' | 'supplier' | 'brand';
  path: string;
  icon: React.ReactNode;
}

const RESULT_ICONS = {
  customer: <Users size={16} />,
  product: <Package size={16} />,
  order: <ShoppingCart size={16} />,
  supplier: <Truck size={16} />,
  brand: <Boxes size={16} />,
};

const RESULT_LABELS = {
  customer: 'Customers',
  product: 'Products',
  order: 'Orders',
  supplier: 'Suppliers',
  brand: 'Brands',
};

export const GlobalSearch = ({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setError(null);
    }
  }, [isOpen]);

  // Handle Cmd+K or Ctrl+K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!isOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onOpenChange]);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedIndex(0);

    try {
      const query_lower = searchQuery.toLowerCase();
      const results_list: SearchResult[] = [];

      // Search customers
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, name, phone, location')
        .or(`name.ilike.%${query_lower}%,phone.ilike.%${query_lower}%`)
        .limit(5);

      if (customersError) throw customersError;
      if (customers) {
        customers.forEach(c => {
          results_list.push({
            id: c.id,
            title: c.name,
            subtitle: c.phone || c.location || undefined,
            type: 'customer',
            path: `/admin/customers`,
            icon: RESULT_ICONS.customer,
          });
        });
      }

      // Search products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, brand_id, brands(name)')
        .or(`name.ilike.%${query_lower}%`)
        .limit(5);

      if (productsError) throw productsError;
      if (products) {
        products.forEach((p: any) => {
          results_list.push({
            id: p.id,
            title: p.name,
            subtitle: p.brands?.name || undefined,
            type: 'product',
            path: `/inventory/products`,
            icon: RESULT_ICONS.product,
          });
        });
      }

      // Search orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, customers(name)')
        .or(`order_number.ilike.%${query_lower}%`)
        .limit(5);

      if (ordersError) throw ordersError;
      if (orders) {
        orders.forEach((o: any) => {
          results_list.push({
            id: o.id,
            title: `Order #${o.order_number}`,
            subtitle: o.customers?.name || undefined,
            type: 'order',
            path: `/admin/sales`,
            icon: RESULT_ICONS.order,
          });
        });
      }

      // Search suppliers (if user has procurement access)
      if (['admin', 'procurement'].includes(user?.role || '')) {
        try {
          const { data: suppliers, error: suppliersError } = await supabase
            .from('suppliers')
            .select('id, name, contact_person')
            .ilike('name', `%${query_lower}%`)
            .limit(5);

          if (suppliersError) {
            console.warn('Suppliers search failed:', suppliersError);
          } else if (suppliers) {
            suppliers.forEach(s => {
              results_list.push({
                id: s.id,
                title: s.name,
                subtitle: s.contact_person || undefined,
                type: 'supplier',
                path: `/procurement/suppliers`,
                icon: RESULT_ICONS.supplier,
              });
            });
          }
        } catch (err) {
          console.warn('Suppliers table query failed:', err);
        }
      }

      // Search brands
      const { data: brands, error: brandsError } = await supabase
        .from('brands')
        .select('id, name')
        .ilike('name', `%${query_lower}%`)
        .limit(5);

      if (brandsError) throw brandsError;
      if (brands) {
        brands.forEach(b => {
          results_list.push({
            id: b.id,
            title: b.name,
            type: 'brand',
            path: `/inventory/brands`,
            icon: RESULT_ICONS.brand,
          });
        });
      }

      setResults(results_list);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % Math.max(results.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onOpenChange(false);
    }
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    onOpenChange(false);
  };

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 [&>button]:hidden max-w-xl">
        <DialogHeader>
          <VisuallyHidden>
            <DialogTitle>Global Search</DialogTitle>
          </VisuallyHidden>
        </DialogHeader>
        <div className="flex flex-col h-[500px]">
          {/* Search input */}
          <div className="border-b border-border p-4 shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Search customers, products, orders..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent outline-none text-sm placeholder-muted-foreground"
              />
              {loading && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 text-muted-foreground hover:bg-background rounded transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div ref={listRef} className="flex-1 overflow-y-auto">
            {error && (
              <div className="flex items-center gap-2 p-4 text-sm text-destructive">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {!error && results.length === 0 && query && (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <Package size={32} className="text-muted-foreground mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No results found</p>
              </div>
            )}

            {!error && results.length === 0 && !query && (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <div className="text-xs text-muted-foreground space-y-2">
                  <p>Start typing to search across:</p>
                  <div className="flex gap-2 justify-center flex-wrap text-xs">
                    <span className="px-2 py-1 rounded bg-secondary">Customers</span>
                    <span className="px-2 py-1 rounded bg-secondary">Products</span>
                    <span className="px-2 py-1 rounded bg-secondary">Orders</span>
                    {['admin', 'procurement'].includes(user?.role || '') && (
                      <span className="px-2 py-1 rounded bg-secondary">Suppliers</span>
                    )}
                    <span className="px-2 py-1 rounded bg-secondary">Brands</span>
                  </div>
                </div>
              </div>
            )}

            {!error && results.length > 0 && (
              <div className="p-4 space-y-4">
                {Object.entries(groupedResults).map(([type, typeResults]) => (
                  <div key={type}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                      {RESULT_LABELS[type as keyof typeof RESULT_LABELS]}
                    </p>
                    <div className="space-y-1">
                      {typeResults.map((result, idx) => {
                        const globalIndex = results.indexOf(result);
                        const isSelected = selectedIndex === globalIndex;
                        return (
                          <button
                            key={`${result.type}-${result.id}`}
                            type="button"
                            onClick={() => handleSelect(result)}
                            className={cn(
                              'w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors',
                              isSelected
                                ? 'bg-primary/15 text-foreground'
                                : 'hover:bg-secondary text-foreground/80',
                            )}
                          >
                            <div className="mt-0.5 shrink-0 text-muted-foreground">
                              {result.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{result.title}</p>
                              {result.subtitle && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {result.subtitle}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="border-t border-border px-4 py-2 shrink-0 flex items-center justify-between text-xs text-muted-foreground">
            <span>Use arrow keys to navigate</span>
            <div className="flex gap-1">
              <kbd className="px-2 py-1 bg-secondary rounded text-[10px]">Enter</kbd>
              <span>to select</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
