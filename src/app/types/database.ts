export type UserRole = 'admin' | 'sales' | 'accounts' | 'inventory' | 'procurement';
export type CompanyEnum = 'LLP' | 'YES YES' | 'Zekon';
export type InvoiceTypeEnum =
    | 'GST'
    | 'NGST'
    | 'IGST'
    | 'Delivery Challan Out'
    | 'Delivery Challan In'
    | 'Stock Transfer'
    | 'Credit Note';
export type OrderStatusEnum = 'Pending' | 'Approved' | 'Rejected' | 'Billed' | 'Delivered';
export type PaymentModeEnum = 'Cash' | 'Cheque' | 'UPI' | 'Bank Transfer';
export type CollectionStatusEnum = 'Pending' | 'Collected' | 'Overdue';
export type DeliveryStatusEnum = 'Pending' | 'In Transit' | 'Delivered' | 'Failed';
export type StockAdjustmentTypeEnum = 'Addition' | 'Subtraction';
export type SupplierStatusEnum = 'Active' | 'Inactive';
export type PoStatusEnum = 'Draft' | 'Pending' | 'Approved' | 'Received' | 'Cancelled';
export type GrnStatusEnum = 'Pending' | 'Verified' | 'Completed';

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    employee_id: string | null;
                    full_name: string;
                    email: string;
                    role: UserRole;
                    is_active: boolean;
                    must_change_password: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['users']['Insert']>;
            };
            brands: {
                Row: {
                    id: string;
                    name: string;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['brands']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['brands']['Insert']>;
            };
            products: {
                Row: {
                    id: string;
                    name: string;
                    brand_id: string | null;
                    sku: string;
                    dealer_price: number;
                    stock_qty: number;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['products']['Insert']>;
            };
            customers: {
                Row: {
                    id: string;
                    name: string;
                    phone: string;
                    address: string;
                    gst_pan: string | null;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['customers']['Insert']>;
            };
            orders: {
                Row: {
                    id: string;
                    order_number: string;
                    company: CompanyEnum;
                    invoice_type: InvoiceTypeEnum;
                    customer_id: string | null;
                    site_address: string;
                    remarks: string | null;
                    delivery_date: string | null;
                    subtotal: number;
                    total_discount: number;
                    grand_total: number;
                    status: OrderStatusEnum;
                    created_by: string | null;
                    approved_by: string | null;
                    approved_at: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['orders']['Insert']>;
            };
            order_items: {
                Row: {
                    id: string;
                    order_id: string;
                    product_id: string;
                    quantity: number;
                    dealer_price: number;
                    discount_pct: number;
                    amount: number;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['order_items']['Insert']>;
            };
            receipts: {
                Row: {
                    id: string;
                    receipt_number: string;
                    order_id: string;
                    amount: number;
                    payment_mode: PaymentModeEnum;
                    recorded_by: string | null;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['receipts']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['receipts']['Insert']>;
            };
            collections: {
                Row: {
                    id: string;
                    order_id: string;
                    customer_id: string;
                    amount: number;
                    due_date: string;
                    collected_date: string | null;
                    status: CollectionStatusEnum;
                    created_by: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['collections']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['collections']['Insert']>;
            };
            deliveries: {
                Row: {
                    id: string;
                    delivery_number: string;
                    order_id: string;
                    driver_name: string | null;
                    vehicle_number: string | null;
                    status: DeliveryStatusEnum;
                    dispatched_at: string | null;
                    delivered_at: string | null;
                    created_by: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['deliveries']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['deliveries']['Insert']>;
            };
            stock_adjustments: {
                Row: {
                    id: string;
                    product_id: string;
                    quantity: number;
                    type: StockAdjustmentTypeEnum;
                    reason: string;
                    adjusted_by: string | null;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['stock_adjustments']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['stock_adjustments']['Insert']>;
            };
            suppliers: {
                Row: {
                    id: string;
                    name: string;
                    contact_person: string | null;
                    phone: string | null;
                    email: string | null;
                    address: string | null;
                    status: SupplierStatusEnum;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['suppliers']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['suppliers']['Insert']>;
            };
        };
    };
}
