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
export type DistrictEnum = 'Kasaragod' | 'Kannur' | 'Wayanad' | 'Kozhikode' | 'Malappuram' | 'Palakkad' | 'Thrissur' | 'Ernakulam' | 'Idukki' | 'Kottayam' | 'Alappuzha' | 'Pathanamthitta' | 'Kollam' | 'Thiruvananthapuram';
export type VehicleTypeEnum = '2-Wheeler' | '3-Wheeler' | '4-Wheeler' | 'Truck' | 'Others';
export type GodownEnum = 'Kottakkal' | 'Chenakkal';

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
                    sub_category_id: string | null;
                    sku: string;
                    mrp: number;
                    dealer_price: number;
                    stock_qty: number;
                    location: string | null;
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
                    place: string | null;
                    location: DistrictEnum | null;
                    pincode: string | null;
                    gst_pan: string | null;
                    opening_balance: number;
                    assigned_to: string | null;
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
                    invoice_number: string | null;
                    customer_id: string | null;
                    godown: GodownEnum | null;
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
                    billed_by: string | null;
                    billed_at: string | null;
                    taxable_amount: number;
                    cgst_amount: number;
                    sgst_amount: number;
                    igst_amount: number;
                    tax_amount: number;
                    invoice_pdf_generated_at: string | null;
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
                    payment_status: string | null;
                    bounce_reason: string | null;
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
                    initiated_by: string | null;
                    initiated_by_name: string | null;
                    delivery_agent_id: string | null;
                    driver_name: string | null;
                    vehicle_number: string | null;
                    status: DeliveryStatusEnum;
                    failure_reason: string | null;
                    dispatched_at: string | null;
                    delivered_at: string | null;
                    created_by: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['deliveries']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['deliveries']['Insert']>;
            };
            delivery_agents: {
                Row: {
                    id: string;
                    name: string;
                    vehicle_number: string | null;
                    vehicle_type: VehicleTypeEnum | null;
                    vehicle_type_other: string | null;
                    phone: string | null;
                    is_active: boolean;
                    created_by: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['delivery_agents']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['delivery_agents']['Insert']>;
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
            purchase_orders: {
                Row: {
                    id: string;
                    po_number: string;
                    supplier_id: string;
                    status: PoStatusEnum;
                    total_amount: number;
                    created_by: string | null;
                    expected_delivery_date: string | null;
                    delivered_at: string | null;
                    approved_by: string | null;
                    approved_at: string | null;
                    remarks: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['purchase_orders']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['purchase_orders']['Insert']>;
            };
            grn_items: {
                Row: {
                    id: string;
                    grn_id: string;
                    purchase_order_id: string | null;
                    product_id: string;
                    expected_qty: number;
                    received_qty: number;
                    damaged_qty: number;
                    status: GrnStatusEnum | string;
                    received_date: string | null;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['grn_items']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['grn_items']['Insert']>;
            };
            stock_movements: {
                Row: {
                    id: string;
                    product_id: string;
                    quantity: number;
                    movement_type: string;
                    reference_type: string | null;
                    reference_id: string | null;
                    created_by: string | null;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['stock_movements']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['stock_movements']['Insert']>;
            };
        };
    };
}
