export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'sales' | 'accounts' | 'inventory' | 'procurement';
export type CompanyEnum = 'LLP' | 'YES YES' | 'Zekon';
export type InvoiceTypeEnum =
  | 'GST'
  | 'NGST'
  | 'IGST'
  | 'Delivery Challan Out'
  | 'Delivery Challan In'
  | 'Stock Transfer'
  | 'Credit Note'
  | 'Accessories';
export type OrderStatusEnum = 'Pending' | 'Approved' | 'Rejected' | 'Billed' | 'Delivered' | 'Voided';
export type PaymentModeEnum = 'Cash' | 'Cheque' | 'UPI' | 'Bank Transfer';
export type CollectionStatusEnum = 'Pending' | 'Collected' | 'Overdue' | 'Voided';
export type DeliveryStatusEnum = 'Pending' | 'In Transit' | 'Delivered' | 'Failed';
export type StockAdjustmentTypeEnum = 'Addition' | 'Subtraction';
export type SupplierStatusEnum = 'Active' | 'Inactive';
export type PoStatusEnum = 'Draft' | 'Pending' | 'Approved' | 'Received' | 'Cancelled';
export type GrnStatusEnum = 'Pending' | 'Verified' | 'Completed';
export type ReceiptAllocationKindEnum = 'order' | 'opening_invoice' | 'opening_delivery_challan' | 'advance';
export type BackOrderStatusEnum = 'Pending' | 'Released' | 'Cancelled';
export type StockReservationStatusEnum = 'Pending' | 'Consumed' | 'Released';
export type DistrictEnum = string;
export type VehicleTypeEnum = string;
export type GodownEnum = string;
export type StateEnum = string;

type TableDef<Row, Insert, Update = Partial<Insert>, Relationships extends readonly unknown[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

export interface Database {
  public: {
    Tables: {
      users: TableDef<
        {
          id: string;
          employee_id: string | null;
          full_name: string;
          email: string;
          role: UserRole;
          is_active: boolean;
          deleted_at: string | null;
          deleted_by: string | null;
          delete_reason: string | null;
          restored_at: string | null;
          restored_by: string | null;
          must_change_password: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          employee_id?: string | null;
          full_name: string;
          email: string;
          role: UserRole;
          is_active?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
          delete_reason?: string | null;
          restored_at?: string | null;
          restored_by?: string | null;
          must_change_password?: boolean;
        },
        Partial<{
          id: string;
          employee_id?: string | null;
          full_name: string;
          email: string;
          role: UserRole;
          is_active?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
          delete_reason?: string | null;
          restored_at?: string | null;
          restored_by?: string | null;
          must_change_password?: boolean;
        }>,
        []
      >;
      brands: TableDef<
        {
          id: string;
          name: string;
          is_active: boolean;
          deleted_at: string | null;
          deleted_by: string | null;
          delete_reason: string | null;
          restored_at: string | null;
          restored_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          name: string;
          is_active?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
          delete_reason?: string | null;
          restored_at?: string | null;
          restored_by?: string | null;
        }
      >;
      products: TableDef<
        {
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
          deleted_at: string | null;
          deleted_by: string | null;
          delete_reason: string | null;
          restored_at: string | null;
          restored_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          name: string;
          brand_id?: string | null;
          sub_category_id?: string | null;
          sku: string;
          mrp?: number;
          dealer_price: number;
          stock_qty?: number;
          location?: string | null;
          is_active?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
          delete_reason?: string | null;
          restored_at?: string | null;
          restored_by?: string | null;
        },
        Partial<{
          name: string;
          brand_id?: string | null;
          sub_category_id?: string | null;
          sku: string;
          mrp?: number;
          dealer_price: number;
          stock_qty?: number;
          location?: string | null;
          is_active?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
          delete_reason?: string | null;
          restored_at?: string | null;
          restored_by?: string | null;
        }>,
        [
          {
            foreignKeyName: 'products_brand_id_fkey';
            columns: ['brand_id'];
            isOneToOne: false;
            referencedRelation: 'brands';
            referencedColumns: ['id'];
          }
        ]
      >;
      customers: TableDef<
        {
          id: string;
          name: string;
          phone: string | null;
          second_phone: string | null;
          address: string;
          place: string | null;
          location: DistrictEnum | null;
          state: StateEnum | null;
          pincode: string | null;
          gst_pan: string | null;
          pan_no: string | null;
          company: CompanyEnum | null;
          opening_invoice: number;
          opening_delivery_challan: number;
          opening_balance: number;
          assigned_to: string | null;
          is_active: boolean;
          deleted_at: string | null;
          deleted_by: string | null;
          delete_reason: string | null;
          restored_at: string | null;
          restored_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          name: string;
          phone?: string | null;
          second_phone?: string | null;
          address: string;
          place?: string | null;
          location?: DistrictEnum | null;
          state?: StateEnum | null;
          pincode?: string | null;
          gst_pan?: string | null;
          pan_no?: string | null;
          company?: CompanyEnum | null;
          opening_invoice?: number;
          opening_delivery_challan?: number;
          assigned_to?: string | null;
          is_active?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
          delete_reason?: string | null;
          restored_at?: string | null;
          restored_by?: string | null;
        },
        Partial<{
          name: string;
          phone: string | null;
          second_phone?: string | null;
          address: string;
          place?: string | null;
          location?: DistrictEnum | null;
          state?: StateEnum | null;
          pincode?: string | null;
          gst_pan?: string | null;
          pan_no?: string | null;
          company?: CompanyEnum | null;
          opening_invoice?: number;
          opening_delivery_challan?: number;
          assigned_to?: string | null;
          is_active?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
          delete_reason?: string | null;
          restored_at?: string | null;
          restored_by?: string | null;
        }>,
        [
          {
            foreignKeyName: 'customers_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ]
      >;
      orders: TableDef<
        {
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
          salesperson_id: string | null;
          irn: string | null;
          ack_no: string | null;
          ack_date: string | null;
          signed_qr_payload: string | null;
          e_invoice_status: 'pending' | 'generated' | 'cancelled' | null;
          e_invoice_generated_at: string | null;
          ewb_no: string | null;
          ewb_generated_date: string | null;
          ewb_valid_upto: string | null;
          ewb_mode: string | null;
          ewb_supply_type: string | null;
          ewb_transaction_type: string | null;
          ewb_approx_distance: number | null;
          transporter_name: string | null;
          transporter_id: string | null;
          vehicle_no: string | null;
          dispatch_from_pincode: string | null;
          ship_to_pincode: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          order_number: string;
          company: CompanyEnum;
          invoice_type: InvoiceTypeEnum;
          invoice_number?: string | null;
          customer_id?: string | null;
          godown?: GodownEnum | null;
          site_address: string;
          remarks?: string | null;
          delivery_date?: string | null;
          subtotal?: number;
          total_discount?: number;
          grand_total?: number;
          status?: OrderStatusEnum;
          created_by?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          billed_by?: string | null;
          billed_at?: string | null;
          taxable_amount?: number;
          cgst_amount?: number;
          sgst_amount?: number;
          igst_amount?: number;
          tax_amount?: number;
          invoice_pdf_generated_at?: string | null;
          salesperson_id?: string | null;
          irn?: string | null;
          ack_no?: string | null;
          ack_date?: string | null;
          signed_qr_payload?: string | null;
          e_invoice_status?: 'pending' | 'generated' | 'cancelled' | null;
          e_invoice_generated_at?: string | null;
          ewb_no?: string | null;
          ewb_generated_date?: string | null;
          ewb_valid_upto?: string | null;
          ewb_mode?: string | null;
          ewb_supply_type?: string | null;
          ewb_transaction_type?: string | null;
          ewb_approx_distance?: number | null;
          transporter_name?: string | null;
          transporter_id?: string | null;
          vehicle_no?: string | null;
          dispatch_from_pincode?: string | null;
          ship_to_pincode?: string | null;
        },
        Partial<{
          order_number: string;
          company: CompanyEnum;
          invoice_type: InvoiceTypeEnum;
          invoice_number?: string | null;
          customer_id?: string | null;
          godown?: GodownEnum | null;
          site_address: string;
          remarks?: string | null;
          delivery_date?: string | null;
          subtotal?: number;
          total_discount?: number;
          grand_total?: number;
          status?: OrderStatusEnum;
          created_by?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          billed_by?: string | null;
          billed_at?: string | null;
          taxable_amount?: number;
          cgst_amount?: number;
          sgst_amount?: number;
          igst_amount?: number;
          tax_amount?: number;
          invoice_pdf_generated_at?: string | null;
          salesperson_id?: string | null;
          irn?: string | null;
          ack_no?: string | null;
          ack_date?: string | null;
          signed_qr_payload?: string | null;
          e_invoice_status?: 'pending' | 'generated' | 'cancelled' | null;
          e_invoice_generated_at?: string | null;
          ewb_no?: string | null;
          ewb_generated_date?: string | null;
          ewb_valid_upto?: string | null;
          ewb_mode?: string | null;
          ewb_supply_type?: string | null;
          ewb_transaction_type?: string | null;
          ewb_approx_distance?: number | null;
          transporter_name?: string | null;
          transporter_id?: string | null;
          vehicle_no?: string | null;
          dispatch_from_pincode?: string | null;
          ship_to_pincode?: string | null;
        }>,
        [
          {
            foreignKeyName: 'orders_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_approved_by_fkey';
            columns: ['approved_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_billed_by_fkey';
            columns: ['billed_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_salesperson_id_fkey';
            columns: ['salesperson_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ]
      >;
      order_items: TableDef<
        {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          dealer_price: number;
          discount_pct: number;
          amount: number;
          created_at: string;
        },
        {
          order_id: string;
          product_id: string;
          quantity: number;
          dealer_price: number;
          discount_pct?: number;
          amount: number;
        },
        Partial<{
          order_id: string;
          product_id: string;
          quantity: number;
          dealer_price: number;
          discount_pct?: number;
          amount: number;
        }>,
        [
          {
            foreignKeyName: 'order_items_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          }
        ]
      >;
      receipts: TableDef<
        {
          id: string;
          receipt_number: string;
          order_id: string | null;
          customer_id: string | null;
          amount: number;
          payment_mode: PaymentModeEnum;
          payment_status: string | null;
          bounce_reason: string | null;
          company: string | null;
          brand: string | null;
          received_date: string | null;
          cheque_number: string | null;
          cheque_date: string | null;
          on_account_of: string | null;
          recorded_by: string | null;
          created_at: string;
        },
        {
          receipt_number: string;
          order_id?: string | null;
          customer_id?: string | null;
          amount: number;
          payment_mode: PaymentModeEnum;
          payment_status?: string | null;
          bounce_reason?: string | null;
          company?: string | null;
          brand?: string | null;
          received_date?: string | null;
          cheque_number?: string | null;
          cheque_date?: string | null;
          on_account_of?: string | null;
          recorded_by?: string | null;
        },
        Partial<{
          receipt_number: string;
          order_id?: string | null;
          customer_id?: string | null;
          amount: number;
          payment_mode: PaymentModeEnum;
          payment_status?: string | null;
          bounce_reason?: string | null;
          company?: string | null;
          brand?: string | null;
          received_date?: string | null;
          cheque_number?: string | null;
          cheque_date?: string | null;
          on_account_of?: string | null;
          recorded_by?: string | null;
        }>,
        [
          {
            foreignKeyName: 'receipts_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'receipts_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'receipts_recorded_by_fkey';
            columns: ['recorded_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ]
      >;
      delivery_items: TableDef<
        {
          id: string;
          delivery_id: string;
          order_item_id: string;
          product_id: string;
          ordered_qty: number;
          delivered_qty: number;
          created_at: string;
        },
        {
          delivery_id: string;
          order_item_id: string;
          product_id: string;
          ordered_qty: number;
          delivered_qty: number;
        },
        Partial<{
          delivery_id: string;
          order_item_id: string;
          product_id: string;
          ordered_qty: number;
          delivered_qty: number;
        }>,
        [
          {
            foreignKeyName: 'delivery_items_delivery_id_fkey';
            columns: ['delivery_id'];
            isOneToOne: false;
            referencedRelation: 'deliveries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'delivery_items_order_item_id_fkey';
            columns: ['order_item_id'];
            isOneToOne: false;
            referencedRelation: 'order_items';
            referencedColumns: ['id'];
          }
        ]
      >;
      back_orders: TableDef<
        {
          id: string;
          order_id: string;
          order_item_id: string | null;
          product_id: string;
          pending_qty: number;
          dealer_price: number;
          discount_pct: number;
          status: BackOrderStatusEnum;
          released_order_id: string | null;
          released_at: string | null;
          released_by: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          order_id: string;
          order_item_id?: string | null;
          product_id: string;
          pending_qty: number;
          dealer_price?: number;
          discount_pct?: number;
          status?: BackOrderStatusEnum;
          released_order_id?: string | null;
          released_at?: string | null;
          released_by?: string | null;
          created_by?: string | null;
        },
        Partial<{
          order_id: string;
          order_item_id?: string | null;
          product_id: string;
          pending_qty: number;
          dealer_price?: number;
          discount_pct?: number;
          status?: BackOrderStatusEnum;
          released_order_id?: string | null;
          released_at?: string | null;
          released_by?: string | null;
          created_by?: string | null;
        }>,
        [
          {
            foreignKeyName: 'back_orders_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'back_orders_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          }
        ]
      >;
      receipt_allocations: TableDef<
        {
          id: string;
          receipt_id: string;
          kind: ReceiptAllocationKindEnum;
          target_order_id: string | null;
          amount: number;
          created_at: string;
        },
        {
          receipt_id: string;
          kind: ReceiptAllocationKindEnum;
          target_order_id?: string | null;
          amount: number;
        },
        Partial<{
          receipt_id: string;
          kind: ReceiptAllocationKindEnum;
          target_order_id?: string | null;
          amount: number;
        }>,
        [
          {
            foreignKeyName: 'receipt_allocations_receipt_id_fkey';
            columns: ['receipt_id'];
            isOneToOne: false;
            referencedRelation: 'receipts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'receipt_allocations_target_order_id_fkey';
            columns: ['target_order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          }
        ]
      >;
      collections: TableDef<
        {
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
        },
        {
          order_id: string;
          customer_id: string;
          amount: number;
          due_date: string;
          collected_date?: string | null;
          status?: CollectionStatusEnum;
          created_by?: string | null;
        },
        Partial<{
          order_id: string;
          customer_id: string;
          amount: number;
          due_date: string;
          collected_date?: string | null;
          status?: CollectionStatusEnum;
          created_by?: string | null;
        }>,
        [
          {
            foreignKeyName: 'collections_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'collections_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'collections_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ]
      >;
      deliveries: TableDef<
        {
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
        },
        {
          delivery_number: string;
          order_id: string;
          initiated_by?: string | null;
          initiated_by_name?: string | null;
          delivery_agent_id?: string | null;
          driver_name?: string | null;
          vehicle_number?: string | null;
          status?: DeliveryStatusEnum;
          failure_reason?: string | null;
          dispatched_at?: string | null;
          delivered_at?: string | null;
          created_by?: string | null;
        },
        Partial<{
          delivery_number: string;
          order_id: string;
          initiated_by?: string | null;
          initiated_by_name?: string | null;
          delivery_agent_id?: string | null;
          driver_name?: string | null;
          vehicle_number?: string | null;
          status?: DeliveryStatusEnum;
          failure_reason?: string | null;
          dispatched_at?: string | null;
          delivered_at?: string | null;
          created_by?: string | null;
        }>,
        [
          {
            foreignKeyName: 'deliveries_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'deliveries_delivery_agent_id_fkey';
            columns: ['delivery_agent_id'];
            isOneToOne: false;
            referencedRelation: 'delivery_agents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'deliveries_initiated_by_fkey';
            columns: ['initiated_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'deliveries_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ]
      >;
      delivery_agents: TableDef<
        {
          id: string;
          name: string;
          vehicle_number: string | null;
          vehicle_type: VehicleTypeEnum | null;
          vehicle_type_other: string | null;
          phone: string | null;
          is_active: boolean;
          deleted_at: string | null;
          deleted_by: string | null;
          delete_reason: string | null;
          restored_at: string | null;
          restored_by: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          name: string;
          vehicle_number?: string | null;
          vehicle_type?: VehicleTypeEnum | null;
          vehicle_type_other?: string | null;
          phone?: string | null;
          is_active?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
          delete_reason?: string | null;
          restored_at?: string | null;
          restored_by?: string | null;
          created_by?: string | null;
        },
        Partial<{
          name: string;
          vehicle_number?: string | null;
          vehicle_type?: VehicleTypeEnum | null;
          vehicle_type_other?: string | null;
          phone?: string | null;
          is_active?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
          delete_reason?: string | null;
          restored_at?: string | null;
          restored_by?: string | null;
          created_by?: string | null;
        }>,
        [
          {
            foreignKeyName: 'delivery_agents_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ]
      >;
      stock_adjustments: TableDef<
        {
          id: string;
          product_id: string;
          quantity: number;
          type: StockAdjustmentTypeEnum;
          reason: string | null;
          location: GodownEnum | null;
          adjusted_by: string | null;
          created_at: string;
          invoice_no: string | null;
          invoice_date: string | null;
          company: CompanyEnum | null;
        },
        {
          product_id: string;
          quantity: number;
          type: StockAdjustmentTypeEnum;
          reason?: string | null;
          location?: GodownEnum | null;
          adjusted_by?: string | null;
          invoice_no?: string | null;
          invoice_date?: string | null;
          company?: CompanyEnum | null;
        },
        Partial<{
          product_id: string;
          quantity: number;
          type: StockAdjustmentTypeEnum;
          reason?: string | null;
          location?: GodownEnum | null;
          adjusted_by?: string | null;
          invoice_no?: string | null;
          invoice_date?: string | null;
          company?: CompanyEnum | null;
        }>,
        [
          {
            foreignKeyName: 'stock_adjustments_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_adjustments_adjusted_by_fkey';
            columns: ['adjusted_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ]
      >;
      suppliers: TableDef<
        {
          id: string;
          name: string;
          contact_person: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          status: SupplierStatusEnum;
          created_at: string;
          updated_at: string;
        },
        {
          name: string;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          status?: SupplierStatusEnum;
        }
      >;
      purchase_orders: TableDef<
        {
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
        },
        {
          po_number: string;
          supplier_id: string;
          status?: PoStatusEnum;
          total_amount?: number;
          created_by?: string | null;
          expected_delivery_date?: string | null;
          delivered_at?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          remarks?: string | null;
        },
        Partial<{
          po_number: string;
          supplier_id: string;
          status?: PoStatusEnum;
          total_amount?: number;
          created_by?: string | null;
          expected_delivery_date?: string | null;
          delivered_at?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          remarks?: string | null;
        }>,
        [
          {
            foreignKeyName: 'purchase_orders_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'suppliers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'purchase_orders_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'purchase_orders_approved_by_fkey';
            columns: ['approved_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ]
      >;
      po_items: TableDef<
        {
          id: string;
          po_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          amount: number;
          created_at: string;
        },
        {
          po_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          amount: number;
        },
        Partial<{
          po_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          amount: number;
        }>,
        [
          {
            foreignKeyName: 'po_items_po_id_fkey';
            columns: ['po_id'];
            isOneToOne: false;
            referencedRelation: 'purchase_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'po_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          }
        ]
      >;
      grn: TableDef<
        {
          id: string;
          grn_number: string;
          po_id: string | null;
          supplier_id: string | null;
          received_by: string | null;
          received_date: string;
          remarks: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          grn_number: string;
          po_id?: string | null;
          supplier_id?: string | null;
          received_by?: string | null;
          received_date?: string;
          remarks?: string | null;
        },
        Partial<{
          grn_number: string;
          po_id?: string | null;
          supplier_id?: string | null;
          received_by?: string | null;
          received_date?: string;
          remarks?: string | null;
        }>,
        [
          {
            foreignKeyName: 'grn_po_id_fkey';
            columns: ['po_id'];
            isOneToOne: false;
            referencedRelation: 'purchase_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'grn_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'suppliers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'grn_received_by_fkey';
            columns: ['received_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ]
      >;
      grn_items: TableDef<
        {
          id: string;
          grn_id: string;
          purchase_order_id: string | null;
          product_id: string;
          expected_qty: number;
          received_qty: number;
          damaged_qty: number;
          location: GodownEnum | null;
          status: GrnStatusEnum;
          received_date: string | null;
          created_at: string;
        },
        {
          grn_id: string;
          purchase_order_id?: string | null;
          product_id: string;
          expected_qty?: number;
          received_qty?: number;
          damaged_qty?: number;
          location?: GodownEnum | null;
          status?: GrnStatusEnum;
          received_date?: string | null;
        },
        Partial<{
          grn_id: string;
          purchase_order_id?: string | null;
          product_id: string;
          expected_qty?: number;
          received_qty?: number;
          damaged_qty?: number;
          location?: GodownEnum | null;
          status?: GrnStatusEnum;
          received_date?: string | null;
        }>,
        [
          {
            foreignKeyName: 'grn_items_grn_id_fkey';
            columns: ['grn_id'];
            isOneToOne: false;
            referencedRelation: 'grn';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'grn_items_purchase_order_id_fkey';
            columns: ['purchase_order_id'];
            isOneToOne: false;
            referencedRelation: 'purchase_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'grn_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          }
        ]
      >;
      stock_movements: TableDef<
        {
          id: string;
          product_id: string;
          quantity: number;
          movement_type: string;
          reference_type: string | null;
          reference_id: string | null;
          location: GodownEnum | null;
          created_by: string | null;
          created_at: string;
        },
        {
          product_id: string;
          quantity: number;
          movement_type: string;
          reference_type?: string | null;
          reference_id?: string | null;
          location?: GodownEnum | null;
          created_by?: string | null;
        },
        Partial<{
          product_id: string;
          quantity: number;
          movement_type: string;
          reference_type?: string | null;
          reference_id?: string | null;
          location?: GodownEnum | null;
          created_by?: string | null;
        }>,
        [
          {
            foreignKeyName: 'stock_movements_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_movements_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ]
      >;
      product_stock_locations: TableDef<
        {
          id: string;
          product_id: string;
          location: GodownEnum;
          stock_qty: number;
          created_at: string;
          updated_at: string;
        },
        {
          product_id: string;
          location: GodownEnum;
          stock_qty?: number;
        },
        Partial<{
          product_id: string;
          location: GodownEnum;
          stock_qty?: number;
        }>,
        [
          {
            foreignKeyName: 'product_stock_locations_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          }
        ]
      >;
      stock_transfers: TableDef<
        {
          id: string;
          company: CompanyEnum | null;
          product_id: string;
          from_location: GodownEnum;
          to_location: GodownEnum;
          quantity: number;
          reason: string | null;
          transferred_by: string | null;
          created_at: string;
        },
        {
          company?: CompanyEnum | null;
          product_id: string;
          from_location: GodownEnum;
          to_location: GodownEnum;
          quantity: number;
          reason?: string | null;
          transferred_by?: string | null;
        },
        Partial<{
          company?: CompanyEnum | null;
          product_id: string;
          from_location: GodownEnum;
          to_location: GodownEnum;
          quantity: number;
          reason?: string | null;
          transferred_by?: string | null;
        }>,
        [
          {
            foreignKeyName: 'stock_transfers_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_transfers_transferred_by_fkey';
            columns: ['transferred_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ]
      >;
      product_price_tiers: TableDef<
        {
          id: string;
          product_id: string;
          tier_code: string;
          price: number;
          created_at: string;
          updated_at: string;
        },
        {
          product_id: string;
          tier_code: string;
          price: number;
        },
        Partial<{
          product_id: string;
          tier_code: string;
          price: number;
        }>,
        [
          {
            foreignKeyName: 'product_price_tiers_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          }
        ]
      >;
      salesperson_product_notes: TableDef<
        {
          id: string;
          product_id: string;
          user_id: string;
          note: string;
          created_at: string;
          updated_at: string;
        },
        {
          product_id: string;
          user_id: string;
          note: string;
        },
        Partial<{
          product_id: string;
          user_id: string;
          note: string;
        }>,
        [
          {
            foreignKeyName: 'salesperson_product_notes_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'salesperson_product_notes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ]
      >;
      settings: TableDef<
        {
          id: string;
          key: string;
          value: Json | null;
          created_at: string;
          updated_at: string;
        },
        {
          key: string;
          value?: Json | null;
        }
      >;
      data_recovery_events: TableDef<
        {
          id: string;
          entity_table: string;
          entity_id: string;
          entity_label: string;
          action: 'archived' | 'restored' | 'voided' | 'reversed';
          actor_id: string | null;
          actor_name: string | null;
          reason: string | null;
          metadata: Json | null;
          created_at: string;
        },
        {
          entity_table: string;
          entity_id: string;
          entity_label: string;
          action: 'archived' | 'restored' | 'voided' | 'reversed';
          actor_id?: string | null;
          actor_name?: string | null;
          reason?: string | null;
          metadata?: Json | null;
        },
        Partial<{
          entity_table: string;
          entity_id: string;
          entity_label: string;
          action: 'archived' | 'restored' | 'voided' | 'reversed';
          actor_id?: string | null;
          actor_name?: string | null;
          reason?: string | null;
          metadata?: Json | null;
        }>,
        [
          {
            foreignKeyName: 'data_recovery_events_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ]
      >;
      billing_reversal_requests: TableDef<
        {
          id: string;
          order_id: string;
          invoice_number: string | null;
          company: CompanyEnum;
          request_reason: string;
          admin_review_note: string | null;
          status: 'Pending' | 'Approved' | 'Rejected';
          requested_by: string;
          approved_by: string | null;
          rejected_by: string | null;
          approved_at: string | null;
          rejected_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          order_id: string;
          invoice_number?: string | null;
          company: CompanyEnum;
          request_reason: string;
          admin_review_note?: string | null;
          status?: 'Pending' | 'Approved' | 'Rejected';
          requested_by: string;
          approved_by?: string | null;
          rejected_by?: string | null;
          approved_at?: string | null;
          rejected_at?: string | null;
        },
        Partial<{
          order_id: string;
          invoice_number?: string | null;
          company: CompanyEnum;
          request_reason: string;
          admin_review_note?: string | null;
          status?: 'Pending' | 'Approved' | 'Rejected';
          requested_by: string;
          approved_by?: string | null;
          rejected_by?: string | null;
          approved_at?: string | null;
          rejected_at?: string | null;
        }>,
        [
          {
            foreignKeyName: 'billing_reversal_requests_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'billing_reversal_requests_requested_by_fkey';
            columns: ['requested_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'billing_reversal_requests_approved_by_fkey';
            columns: ['approved_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'billing_reversal_requests_rejected_by_fkey';
            columns: ['rejected_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ]
      >;
      stock_reservations: TableDef<
        {
          id: string;
          order_id: string;
          order_item_id: string;
          product_id: string;
          location: GodownEnum;
          qty: number;
          status: StockReservationStatusEnum;
          created_at: string;
          resolved_at: string | null;
          resolved_reason: string | null;
        },
        {
          order_id: string;
          order_item_id: string;
          product_id: string;
          location: GodownEnum;
          qty: number;
          status?: StockReservationStatusEnum;
        },
        Partial<{
          order_id: string;
          order_item_id: string;
          product_id: string;
          location: GodownEnum;
          qty: number;
          status?: StockReservationStatusEnum;
          resolved_at?: string | null;
          resolved_reason?: string | null;
        }>,
        [
          {
            foreignKeyName: 'stock_reservations_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_reservations_order_item_id_fkey';
            columns: ['order_item_id'];
            isOneToOne: true;
            referencedRelation: 'order_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_reservations_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          }
        ]
      >;
    };
    Views: {
      v_available_stock: {
        Row: {
          product_id: string;
          location: GodownEnum;
          stock_qty: number;
          reserved_qty: number;
          available_qty: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_invoice_sequences_for_fy: {
        Args: { p_fy?: string | null };
        Returns: Array<{ series_key: string; last_seq: number; updated_at: string }>;
      };
      bill_order_atomic: {
        Args: {
          p_order_id: string;
          p_billed_by?: string | null;
        };
        Returns: string;
      };
      bill_order_idempotent: {
        Args: {
          p_order_id: string;
          p_billed_by?: string | null;
          p_idempotency_key?: string | null;
        };
        Returns: string;
      };
      bill_credit_note_atomic: {
        Args: {
          p_order_id: string;
          p_billed_by?: string | null;
        };
        Returns: string;
      };
      bill_credit_note_idempotent: {
        Args: {
          p_order_id: string;
          p_billed_by?: string | null;
          p_idempotency_key?: string | null;
        };
        Returns: string;
      };
      allocate_order_number: {
        Args: {
          p_company: CompanyEnum;
        };
        Returns: string;
      };
      get_company_profiles: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_master_settings: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_sales_target_settings: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_master_setting_options: {
        Args: {
          p_key: string;
        };
        Returns: string[];
      };
      create_master_setting_option: {
        Args: {
          p_key: string;
          p_value: string;
        };
        Returns: string[];
      };
      update_master_setting_option: {
        Args: {
          p_key: string;
          p_old_value: string;
          p_new_value: string;
        };
        Returns: string[];
      };
      delete_master_setting_option: {
        Args: {
          p_key: string;
          p_value: string;
        };
        Returns: string[];
      };
      create_order: {
        Args: {
          p_company: CompanyEnum;
          p_invoice_type: InvoiceTypeEnum;
          p_customer_id?: string | null;
          p_godown?: GodownEnum | null;
          p_site_address: string;
          p_items: Json;
          p_remarks?: string | null;
          p_delivery_date?: string | null;
          p_created_by?: string | null;
          p_salesperson_id?: string | null;
        };
        Returns: string;
      };
      approve_order_atomic: {
        Args: {
          p_order_id: string;
          p_approved_by: string;
          p_items: Json;
        };
        Returns: boolean;
      };
      reject_order: {
        Args: {
          p_order_id: string;
          p_rejected_by: string;
          p_reason?: string | null;
        };
        Returns: boolean;
      };
      void_order: {
        Args: {
          p_order_id: string;
          p_reason?: string | null;
        };
        Returns: boolean;
      };
      create_grn: {
        Args: {
          p_items: Json;
          p_po_id?: string | null;
          p_supplier_id?: string | null;
          p_received_by?: string | null;
          p_remarks?: string | null;
        };
        Returns: string;
      };
      create_grn_idempotent: {
        Args: {
          p_items: Json;
          p_po_id?: string | null;
          p_supplier_id?: string | null;
          p_received_by?: string | null;
          p_remarks?: string | null;
          p_idempotency_key?: string | null;
        };
        Returns: string;
      };
      create_stock_adjustment_atomic: {
        Args: {
          p_product_id: string;
          p_location: GodownEnum;
          p_quantity: number;
          p_type: StockAdjustmentTypeEnum;
          p_reason?: string | null;
          p_user_id?: string | null;
          p_invoice_no?: string | null;
          p_invoice_date?: string | null;
          p_company?: CompanyEnum | null;
        };
        Returns: string;
      };
      update_stock_at_location: {
        Args: {
          p_product_id: string;
          p_location: GodownEnum;
          p_quantity: number;
          p_operation: 'add' | 'subtract' | 'set';
          p_reason?: string | null;
          p_user_id?: string | null;
        };
        Returns: number;
      };
      transfer_stock: {
        Args: {
          p_product_id: string;
          p_from_location: GodownEnum;
          p_to_location: GodownEnum;
          p_quantity: number;
          p_company?: CompanyEnum | null;
          p_reason?: string | null;
          p_user_id?: string | null;
        };
        Returns: boolean;
      };
      create_delivery: {
        Args: {
          p_order_id: string;
          p_agent_id?: string | null;
          p_initiated_by?: string | null;
          p_initiated_by_name?: string | null;
          p_driver_name?: string | null;
          p_vehicle_number?: string | null;
          p_created_by?: string | null;
        };
        Returns: string;
      };
      create_delivery_idempotent: {
        Args: {
          p_order_id: string;
          p_agent_id?: string | null;
          p_initiated_by?: string | null;
          p_initiated_by_name?: string | null;
          p_driver_name?: string | null;
          p_vehicle_number?: string | null;
          p_created_by?: string | null;
          p_idempotency_key?: string | null;
        };
        Returns: string;
      };
      update_delivery_status: {
        Args: {
          p_delivery_id: string;
          p_status: DeliveryStatusEnum;
          p_failure_reason?: string | null;
          p_updated_by?: string | null;
        };
        Returns: boolean;
      };
      update_delivery_status_idempotent: {
        Args: {
          p_delivery_id: string;
          p_status: DeliveryStatusEnum;
          p_failure_reason?: string | null;
          p_updated_by?: string | null;
          p_idempotency_key?: string | null;
        };
        Returns: boolean;
      };
      request_billing_reversal: {
        Args: {
          p_order_id: string;
          p_reason: string;
          p_requested_by?: string | null;
        };
        Returns: string;
      };
      approve_billing_reversal: {
        Args: {
          p_request_id: string;
          p_admin_user_id: string;
          p_admin_note?: string | null;
        };
        Returns: boolean;
      };
      reject_billing_reversal: {
        Args: {
          p_request_id: string;
          p_admin_user_id: string;
          p_admin_note?: string | null;
        };
        Returns: boolean;
      };
      get_billing_reversal_requests: {
        Args: {
          p_status?: string | null;
        };
        Returns: Json;
      };
      approve_order_with_backorders: {
        Args: {
          p_order_id: string;
          p_approved_by: string;
          p_items: Json;
        };
        Returns: Json;
      };
      record_delivery_fulfillment: {
        Args: {
          p_delivery_id: string;
          p_items: Json;
          p_updated_by: string;
        };
        Returns: Json;
      };
      release_back_orders: {
        Args: {
          p_back_order_ids: string[];
          p_released_by: string;
          p_items: Json;
          p_remarks?: string | null;
        };
        Returns: Json;
      };
      create_receipt_with_allocations: {
        Args: {
          payload: Json;
        };
        Returns: {
          receipt_id: string;
          receipt_number: string;
        }[];
      };
    };
    Enums: {
      collection_status_enum: CollectionStatusEnum;
      company_enum: CompanyEnum;
      delivery_status_enum: DeliveryStatusEnum;
      grn_status_enum: GrnStatusEnum;
      invoice_type_enum: InvoiceTypeEnum;
      order_status_enum: OrderStatusEnum;
      payment_mode_enum: PaymentModeEnum;
      receipt_allocation_kind_enum: ReceiptAllocationKindEnum;
      back_order_status_enum: BackOrderStatusEnum;
      po_status_enum: PoStatusEnum;
      stock_adjustment_type_enum: StockAdjustmentTypeEnum;
      supplier_status_enum: SupplierStatusEnum;
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
}
