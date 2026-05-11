export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_trail: {
        Row: {
          action: string
          after: Json | null
          before: Json | null
          changed_at: string
          changed_by: string | null
          id: string
          row_id: string
          table_name: string
        }
        Insert: {
          action: string
          after?: Json | null
          before?: Json | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          row_id: string
          table_name: string
        }
        Update: {
          action?: string
          after?: Json | null
          before?: Json | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          row_id?: string
          table_name?: string
        }
        Relationships: []
      }
      billing_reversal_requests: {
        Row: {
          admin_review_note: string | null
          approved_at: string | null
          approved_by: string | null
          company: Database["public"]["Enums"]["company_enum"]
          created_at: string
          id: string
          invoice_number: string | null
          order_id: string
          rejected_at: string | null
          rejected_by: string | null
          request_reason: string
          requested_by: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_review_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company: Database["public"]["Enums"]["company_enum"]
          created_at?: string
          id?: string
          invoice_number?: string | null
          order_id: string
          rejected_at?: string | null
          rejected_by?: string | null
          request_reason: string
          requested_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_review_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company?: Database["public"]["Enums"]["company_enum"]
          created_at?: string
          id?: string
          invoice_number?: string | null
          order_id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          request_reason?: string
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_reversal_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_reversal_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_reversal_requests_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_reversal_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_active: boolean
          name: string
          restored_at: string | null
          restored_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          restored_at?: string | null
          restored_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          restored_at?: string | null
          restored_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          amount: number
          collected_date: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          due_date: string
          id: string
          order_id: string
          status: Database["public"]["Enums"]["collection_status_enum"]
          updated_at: string
        }
        Insert: {
          amount: number
          collected_date?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          due_date: string
          id?: string
          order_id: string
          status?: Database["public"]["Enums"]["collection_status_enum"]
          updated_at?: string
        }
        Update: {
          amount?: number
          collected_date?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          due_date?: string
          id?: string
          order_id?: string
          status?: Database["public"]["Enums"]["collection_status_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string
          assigned_to: string | null
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          gst_pan: string | null
          id: string
          is_active: boolean
          location: string | null
          name: string
          opening_balance: number
          pan_no: string | null
          phone: string
          pincode: string | null
          place: string | null
          restored_at: string | null
          restored_by: string | null
          second_phone: string | null
          state_code: string | null
          updated_at: string
        }
        Insert: {
          address: string
          assigned_to?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          gst_pan?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          opening_balance?: number
          pan_no?: string | null
          phone: string
          pincode?: string | null
          place?: string | null
          restored_at?: string | null
          restored_by?: string | null
          second_phone?: string | null
          state_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          assigned_to?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          gst_pan?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          opening_balance?: number
          pan_no?: string | null
          phone?: string
          pincode?: string | null
          place?: string | null
          restored_at?: string | null
          restored_by?: string | null
          second_phone?: string | null
          state_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["code"]
          },
        ]
      }
      data_recovery_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          entity_id: string
          entity_label: string
          entity_table: string
          id: string
          metadata: Json | null
          reason: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          entity_id: string
          entity_label: string
          entity_table: string
          id?: string
          metadata?: Json | null
          reason?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          entity_id?: string
          entity_label?: string
          entity_table?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_recovery_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          created_at: string
          created_by: string | null
          delivered_at: string | null
          delivery_agent_id: string | null
          delivery_number: string
          dispatched_at: string | null
          driver_name: string | null
          failure_reason: string | null
          id: string
          initiated_by: string | null
          initiated_by_name: string | null
          order_id: string
          status: Database["public"]["Enums"]["delivery_status_enum"]
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          delivery_agent_id?: string | null
          delivery_number: string
          dispatched_at?: string | null
          driver_name?: string | null
          failure_reason?: string | null
          id?: string
          initiated_by?: string | null
          initiated_by_name?: string | null
          order_id: string
          status?: Database["public"]["Enums"]["delivery_status_enum"]
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          delivery_agent_id?: string | null
          delivery_number?: string
          dispatched_at?: string | null
          driver_name?: string | null
          failure_reason?: string | null
          id?: string
          initiated_by?: string | null
          initiated_by_name?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["delivery_status_enum"]
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_delivery_agent_id_fkey"
            columns: ["delivery_agent_id"]
            isOneToOne: false
            referencedRelation: "delivery_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_agents: {
        Row: {
          created_at: string
          created_by: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          restored_at: string | null
          restored_by: string | null
          updated_at: string
          vehicle_number: string | null
          vehicle_type: string | null
          vehicle_type_other: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          restored_at?: string | null
          restored_by?: string | null
          updated_at?: string
          vehicle_number?: string | null
          vehicle_type?: string | null
          vehicle_type_other?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          restored_at?: string | null
          restored_by?: string | null
          updated_at?: string
          vehicle_number?: string | null
          vehicle_type?: string | null
          vehicle_type_other?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_agents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_items: {
        Row: {
          created_at: string
          delivery_id: string
          id: string
          order_item_id: string
          qty: number
        }
        Insert: {
          created_at?: string
          delivery_id: string
          id?: string
          order_item_id: string
          qty: number
        }
        Update: {
          created_at?: string
          delivery_id?: string
          id?: string
          order_item_id?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_items_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      grn: {
        Row: {
          created_at: string
          grn_number: string
          id: string
          po_id: string | null
          received_by: string | null
          received_date: string
          remarks: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          grn_number: string
          id?: string
          po_id?: string | null
          received_by?: string | null
          received_date?: string
          remarks?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          grn_number?: string
          id?: string
          po_id?: string | null
          received_by?: string | null
          received_date?: string
          remarks?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grn_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      grn_items: {
        Row: {
          created_at: string
          damaged_qty: number
          expected_qty: number
          grn_id: string
          id: string
          location: string | null
          product_id: string
          purchase_order_id: string | null
          received_date: string | null
          received_qty: number
          status: Database["public"]["Enums"]["grn_status_enum"]
        }
        Insert: {
          created_at?: string
          damaged_qty?: number
          expected_qty?: number
          grn_id: string
          id?: string
          location?: string | null
          product_id: string
          purchase_order_id?: string | null
          received_date?: string | null
          received_qty?: number
          status?: Database["public"]["Enums"]["grn_status_enum"]
        }
        Update: {
          created_at?: string
          damaged_qty?: number
          expected_qty?: number
          grn_id?: string
          id?: string
          location?: string | null
          product_id?: string
          purchase_order_id?: string | null
          received_date?: string | null
          received_qty?: number
          status?: Database["public"]["Enums"]["grn_status_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "grn_items_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "grn"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "grn_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_sequences: {
        Row: {
          created_at: string
          last_seq: number
          series_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          last_seq?: number
          series_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          last_seq?: number
          series_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          amount: number
          cgst_amount: number
          created_at: string
          dealer_price: number
          delivered_qty: number
          discount_pct: number
          hsn_code: string | null
          id: string
          igst_amount: number
          order_id: string
          product_id: string
          quantity: number
          received_qty: number
          returned_qty: number
          sgst_amount: number
          tax_rate: number | null
          taxable_amount: number | null
          uom: string | null
        }
        Insert: {
          amount: number
          cgst_amount?: number
          created_at?: string
          dealer_price: number
          delivered_qty?: number
          discount_pct?: number
          hsn_code?: string | null
          id?: string
          igst_amount?: number
          order_id: string
          product_id: string
          quantity: number
          received_qty?: number
          returned_qty?: number
          sgst_amount?: number
          tax_rate?: number | null
          taxable_amount?: number | null
          uom?: string | null
        }
        Update: {
          amount?: number
          cgst_amount?: number
          created_at?: string
          dealer_price?: number
          delivered_qty?: number
          discount_pct?: number
          hsn_code?: string | null
          id?: string
          igst_amount?: number
          order_id?: string
          product_id?: string
          quantity?: number
          received_qty?: number
          returned_qty?: number
          sgst_amount?: number
          tax_rate?: number | null
          taxable_amount?: number | null
          uom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          billed_at: string | null
          billed_by: string | null
          cgst_amount: number
          company: Database["public"]["Enums"]["company_enum"]
          created_at: string
          created_by: string | null
          customer_id: string | null
          delivery_date: string | null
          godown: string | null
          grand_total: number
          id: string
          igst_amount: number
          invoice_number: string | null
          invoice_pdf_generated_at: string | null
          invoice_type: Database["public"]["Enums"]["invoice_type_enum"]
          order_number: string
          place_of_supply: string | null
          remarks: string | null
          reverse_charge: boolean
          round_off: number
          sgst_amount: number
          site_address: string
          status: Database["public"]["Enums"]["order_status_enum"]
          subtotal: number
          tax_amount: number
          taxable_amount: number
          total_discount: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          billed_at?: string | null
          billed_by?: string | null
          cgst_amount?: number
          company: Database["public"]["Enums"]["company_enum"]
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivery_date?: string | null
          godown?: string | null
          grand_total?: number
          id?: string
          igst_amount?: number
          invoice_number?: string | null
          invoice_pdf_generated_at?: string | null
          invoice_type: Database["public"]["Enums"]["invoice_type_enum"]
          order_number: string
          place_of_supply?: string | null
          remarks?: string | null
          reverse_charge?: boolean
          round_off?: number
          sgst_amount?: number
          site_address: string
          status?: Database["public"]["Enums"]["order_status_enum"]
          subtotal?: number
          tax_amount?: number
          taxable_amount?: number
          total_discount?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          billed_at?: string | null
          billed_by?: string | null
          cgst_amount?: number
          company?: Database["public"]["Enums"]["company_enum"]
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivery_date?: string | null
          godown?: string | null
          grand_total?: number
          id?: string
          igst_amount?: number
          invoice_number?: string | null
          invoice_pdf_generated_at?: string | null
          invoice_type?: Database["public"]["Enums"]["invoice_type_enum"]
          order_number?: string
          place_of_supply?: string | null
          remarks?: string | null
          reverse_charge?: boolean
          round_off?: number
          sgst_amount?: number
          site_address?: string
          status?: Database["public"]["Enums"]["order_status_enum"]
          subtotal?: number
          tax_amount?: number
          taxable_amount?: number
          total_discount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_billed_by_fkey"
            columns: ["billed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_place_of_supply_fkey"
            columns: ["place_of_supply"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["code"]
          },
        ]
      }
      po_items: {
        Row: {
          amount: number
          created_at: string
          id: string
          po_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          po_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          po_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "po_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "po_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stock_locations: {
        Row: {
          created_at: string
          id: string
          location: string
          product_id: string
          stock_qty: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location: string
          product_id: string
          stock_qty?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string
          product_id?: string
          stock_qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_locations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_stock_locations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          cost_price: number | null
          created_at: string
          dealer_price: number
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          hsn_code: string | null
          id: string
          is_active: boolean
          location: string | null
          mrp: number
          name: string
          restored_at: string | null
          restored_by: string | null
          sku: string
          stock_qty: number
          sub_category_id: string | null
          tax_rate: number
          uom: string
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          cost_price?: number | null
          created_at?: string
          dealer_price?: number
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          mrp?: number
          name: string
          restored_at?: string | null
          restored_by?: string | null
          sku: string
          stock_qty?: number
          sub_category_id?: string | null
          tax_rate?: number
          uom?: string
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          cost_price?: number | null
          created_at?: string
          dealer_price?: number
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          mrp?: number
          name?: string
          restored_at?: string | null
          restored_by?: string | null
          sku?: string
          stock_qty?: number
          sub_category_id?: string | null
          tax_rate?: number
          uom?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          delivered_at: string | null
          expected_delivery_date: string | null
          id: string
          po_number: string
          remarks: string | null
          status: Database["public"]["Enums"]["po_status_enum"]
          supplier_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          expected_delivery_date?: string | null
          id?: string
          po_number: string
          remarks?: string | null
          status?: Database["public"]["Enums"]["po_status_enum"]
          supplier_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          expected_delivery_date?: string | null
          id?: string
          po_number?: string
          remarks?: string | null
          status?: Database["public"]["Enums"]["po_status_enum"]
          supplier_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_return_items: {
        Row: {
          amount: number | null
          grn_item_id: string | null
          id: string
          product_id: string
          purchase_return_id: string
          qty: number
          rate: number | null
        }
        Insert: {
          amount?: number | null
          grn_item_id?: string | null
          id?: string
          product_id: string
          purchase_return_id: string
          qty: number
          rate?: number | null
        }
        Update: {
          amount?: number | null
          grn_item_id?: string | null
          id?: string
          product_id?: string
          purchase_return_id?: string
          qty?: number
          rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_return_items_grn_item_id_fkey"
            columns: ["grn_item_id"]
            isOneToOne: false
            referencedRelation: "grn_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "purchase_return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_return_items_purchase_return_id_fkey"
            columns: ["purchase_return_id"]
            isOneToOne: false
            referencedRelation: "purchase_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_returns: {
        Row: {
          created_at: string
          created_by: string | null
          grn_id: string | null
          id: string
          location: string
          reason: string | null
          return_date: string
          return_number: string
          status: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          grn_id?: string | null
          id?: string
          location: string
          reason?: string | null
          return_date?: string
          return_number: string
          status?: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          grn_id?: string | null
          id?: string
          location?: string
          reason?: string | null
          return_date?: string
          return_number?: string
          status?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_returns_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "grn"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_returns_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number
          bounce_reason: string | null
          brand: string | null
          cheque_date: string | null
          cheque_number: string | null
          company: string | null
          created_at: string
          customer_id: string | null
          id: string
          on_account_of: string | null
          order_id: string | null
          payment_mode: Database["public"]["Enums"]["payment_mode_enum"]
          payment_status: string | null
          receipt_number: string
          received_date: string | null
          recorded_by: string | null
        }
        Insert: {
          amount: number
          bounce_reason?: string | null
          brand?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          company?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          on_account_of?: string | null
          order_id?: string | null
          payment_mode: Database["public"]["Enums"]["payment_mode_enum"]
          payment_status?: string | null
          receipt_number: string
          received_date?: string | null
          recorded_by?: string | null
        }
        Update: {
          amount?: number
          bounce_reason?: string | null
          brand?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          company?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          on_account_of?: string | null
          order_id?: string | null
          payment_mode?: Database["public"]["Enums"]["payment_mode_enum"]
          payment_status?: string | null
          receipt_number?: string
          received_date?: string | null
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rpc_idempotency_keys: {
        Row: {
          created_at: string
          function_name: string
          id: string
          idempotency_key: string
          result_bool: boolean | null
          result_text: string | null
          result_uuid: string | null
        }
        Insert: {
          created_at?: string
          function_name: string
          id?: string
          idempotency_key: string
          result_bool?: boolean | null
          result_text?: string | null
          result_uuid?: string | null
        }
        Update: {
          created_at?: string
          function_name?: string
          id?: string
          idempotency_key?: string
          result_bool?: boolean | null
          result_text?: string | null
          result_uuid?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      states: {
        Row: {
          code: string
          created_at: string
          is_active: boolean
          name: string
          short_name: string | null
        }
        Insert: {
          code: string
          created_at?: string
          is_active?: boolean
          name: string
          short_name?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          is_active?: boolean
          name?: string
          short_name?: string | null
        }
        Relationships: []
      }
      stock_adjustments: {
        Row: {
          adjusted_by: string | null
          created_at: string
          id: string
          location: string | null
          product_id: string
          quantity: number
          reason: string
          type: Database["public"]["Enums"]["stock_adjustment_type_enum"]
        }
        Insert: {
          adjusted_by?: string | null
          created_at?: string
          id?: string
          location?: string | null
          product_id: string
          quantity: number
          reason: string
          type: Database["public"]["Enums"]["stock_adjustment_type_enum"]
        }
        Update: {
          adjusted_by?: string | null
          created_at?: string
          id?: string
          location?: string | null
          product_id?: string
          quantity?: number
          reason?: string
          type?: Database["public"]["Enums"]["stock_adjustment_type_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_adjusted_by_fkey"
            columns: ["adjusted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          location: string | null
          movement_type: string
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          movement_type: string
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          movement_type?: string
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          company: Database["public"]["Enums"]["company_enum"] | null
          created_at: string
          from_location: string
          id: string
          product_id: string
          quantity: number
          reason: string | null
          to_location: string
          transferred_by: string | null
        }
        Insert: {
          company?: Database["public"]["Enums"]["company_enum"] | null
          created_at?: string
          from_location: string
          id?: string
          product_id: string
          quantity: number
          reason?: string | null
          to_location: string
          transferred_by?: string | null
        }
        Update: {
          company?: Database["public"]["Enums"]["company_enum"] | null
          created_at?: string
          from_location?: string
          id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          to_location?: string
          transferred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_transfers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_transferred_by_fkey"
            columns: ["transferred_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          state_code: string | null
          status: Database["public"]["Enums"]["supplier_status_enum"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          state_code?: string | null
          status?: Database["public"]["Enums"]["supplier_status_enum"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          state_code?: string | null
          status?: Database["public"]["Enums"]["supplier_status_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["code"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string
          employee_id: string | null
          full_name: string
          id: string
          is_active: boolean
          must_change_password: boolean
          restored_at: string | null
          restored_by: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email: string
          employee_id?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          restored_at?: string | null
          restored_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string
          employee_id?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          restored_at?: string | null
          restored_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      product_stock_summary: {
        Row: {
          brand_name: string | null
          product_id: string | null
          product_name: string | null
          sku: string | null
          stock_by_location: Json | null
          total_stock: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      allocate_invoice_sequence: {
        Args: { p_series_key: string }
        Returns: number
      }
      allocate_order_number: {
        Args: { p_company: Database["public"]["Enums"]["company_enum"] }
        Returns: string
      }
      allocate_purchase_return_number: { Args: never; Returns: string }
      approve_billing_reversal: {
        Args: {
          p_admin_note?: string
          p_admin_user_id: string
          p_request_id: string
        }
        Returns: boolean
      }
      approve_order: {
        Args: { p_approved_by: string; p_order_id: string }
        Returns: boolean
      }
      approve_order_atomic: {
        Args: { p_approved_by: string; p_items: Json; p_order_id: string }
        Returns: boolean
      }
      assert_master_setting_key: { Args: { p_key: string }; Returns: string }
      bill_credit_note_atomic: {
        Args: { p_billed_by?: string; p_order_id: string }
        Returns: string
      }
      bill_credit_note_idempotent: {
        Args: {
          p_billed_by?: string
          p_idempotency_key: string
          p_order_id: string
        }
        Returns: string
      }
      bill_order: {
        Args: {
          p_billed_by: string
          p_invoice_number?: string
          p_order_id: string
        }
        Returns: boolean
      }
      bill_order_atomic: {
        Args: { p_billed_by?: string; p_order_id: string }
        Returns: string
      }
      bill_order_idempotent: {
        Args: {
          p_billed_by?: string
          p_idempotency_key?: string
          p_order_id: string
        }
        Returns: string
      }
      create_customer: {
        Args: {
          p_address: string
          p_assigned_to?: string
          p_gst_pan?: string
          p_location?: string
          p_name: string
          p_opening_balance?: number
          p_phone: string
          p_pincode?: string
          p_place?: string
        }
        Returns: string
      }
      create_delivery:
        | {
            Args: {
              p_agent_id?: string
              p_created_by?: string
              p_order_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_agent_id?: string
              p_created_by?: string
              p_driver_name?: string
              p_initiated_by?: string
              p_initiated_by_name?: string
              p_order_id: string
              p_vehicle_number?: string
            }
            Returns: string
          }
      create_delivery_idempotent: {
        Args: {
          p_agent_id?: string
          p_created_by?: string
          p_driver_name?: string
          p_idempotency_key?: string
          p_initiated_by?: string
          p_initiated_by_name?: string
          p_order_id: string
          p_vehicle_number?: string
        }
        Returns: string
      }
      create_grn: {
        Args: {
          p_items: Json
          p_po_id?: string
          p_received_by?: string
          p_remarks?: string
          p_supplier_id?: string
        }
        Returns: string
      }
      create_grn_idempotent: {
        Args: {
          p_idempotency_key?: string
          p_items: Json
          p_po_id?: string
          p_received_by?: string
          p_remarks?: string
          p_supplier_id?: string
        }
        Returns: string
      }
      create_master_setting_option: {
        Args: { p_key: string; p_value: string }
        Returns: string[]
      }
      create_order: {
        Args: {
          p_company: Database["public"]["Enums"]["company_enum"]
          p_created_by?: string
          p_customer_id: string
          p_delivery_date?: string
          p_godown: string
          p_invoice_type: Database["public"]["Enums"]["invoice_type_enum"]
          p_items: Json
          p_remarks?: string
          p_site_address: string
        }
        Returns: string
      }
      create_product: {
        Args: {
          p_brand_id?: string
          p_dealer_price: number
          p_initial_stock_chenakkal?: number
          p_initial_stock_kottakkal?: number
          p_mrp: number
          p_name: string
          p_sku: string
        }
        Returns: string
      }
      create_purchase_return_idempotent: {
        Args: {
          p_created_by?: string
          p_grn_id: string
          p_idempotency_key: string
          p_items: Json
          p_location: string
          p_reason: string
          p_supplier_id: string
        }
        Returns: string
      }
      create_stock_adjustment_atomic: {
        Args: {
          p_location: string
          p_product_id: string
          p_quantity: number
          p_reason?: string
          p_type: Database["public"]["Enums"]["stock_adjustment_type_enum"]
          p_user_id?: string
        }
        Returns: string
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      default_master_setting_option: {
        Args: { p_key: string }
        Returns: string
      }
      delete_master_setting_option: {
        Args: { p_key: string; p_value: string }
        Returns: string[]
      }
      filter_jsonb_text_array: {
        Args: { p_allowed: string[]; p_value: Json }
        Returns: Json
      }
      generate_delivery_number: { Args: never; Returns: string }
      generate_grn_number: { Args: never; Returns: string }
      generate_invoice_number:
        | {
            Args: { p_company: Database["public"]["Enums"]["company_enum"] }
            Returns: string
          }
        | {
            Args: {
              p_company: Database["public"]["Enums"]["company_enum"]
              p_godown?: string
              p_invoice_type: Database["public"]["Enums"]["invoice_type_enum"]
              p_remarks?: string
            }
            Returns: string
          }
      generate_order_number: { Args: never; Returns: string }
      generate_po_number: { Args: never; Returns: string }
      get_billing_reversal_requests: {
        Args: { p_status?: string }
        Returns: Json
      }
      get_company_profiles: { Args: never; Returns: Json }
      get_customer_balance: { Args: { p_customer_id: string }; Returns: number }
      get_customer_ledger: {
        Args: { p_customer_id: string }
        Returns: {
          balance: number
          credit: number
          debit: number
          reference_number: string
          transaction_date: string
          transaction_type: string
        }[]
      }
      get_low_stock_products: {
        Args: { p_threshold?: number }
        Returns: {
          location: string
          product_id: string
          product_name: string
          sku: string
          stock_qty: number
        }[]
      }
      get_master_setting_options: { Args: { p_key: string }; Returns: string[] }
      get_master_settings: { Args: never; Returns: Json }
      get_order_summary: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          order_count: number
          status: Database["public"]["Enums"]["order_status_enum"]
          total_amount: number
        }[]
      }
      get_sales_target_settings: { Args: never; Returns: Json }
      get_stock_by_location: {
        Args: { p_location?: string }
        Returns: {
          brand_name: string
          location: string
          product_id: string
          product_name: string
          sku: string
          stock_qty: number
        }[]
      }
      has_role: {
        Args: { p_roles: Database["public"]["Enums"]["user_role"][] }
        Returns: boolean
      }
      is_active_user: { Args: never; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      is_valid_email: { Args: { p_value: string }; Returns: boolean }
      is_valid_gstin: { Args: { p_value: string }; Returns: boolean }
      is_valid_pan: { Args: { p_value: string }; Returns: boolean }
      is_valid_phone: { Args: { p_value: string }; Returns: boolean }
      is_valid_pincode: { Args: { p_value: string }; Returns: boolean }
      normalize_master_setting_values: {
        Args: { p_values: string[] }
        Returns: string[]
      }
      normalize_master_settings_array: {
        Args: { p_allowed: string[]; p_default: Json; p_value: Json }
        Returns: Json
      }
      reject_billing_reversal: {
        Args: {
          p_admin_note?: string
          p_admin_user_id: string
          p_request_id: string
        }
        Returns: boolean
      }
      reject_order: {
        Args: { p_order_id: string; p_reason?: string; p_rejected_by: string }
        Returns: boolean
      }
      request_billing_reversal: {
        Args: { p_order_id: string; p_reason: string; p_requested_by?: string }
        Returns: string
      }
      save_master_setting_options: {
        Args: { p_key: string; p_values: string[] }
        Returns: string[]
      }
      transfer_stock:
        | {
            Args: {
              p_company?: Database["public"]["Enums"]["company_enum"]
              p_from_location: string
              p_product_id: string
              p_quantity: number
              p_reason?: string
              p_to_location: string
              p_user_id?: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_from_location: string
              p_product_id: string
              p_quantity: number
              p_reason?: string
              p_to_location: string
              p_user_id?: string
            }
            Returns: boolean
          }
      update_delivery_status:
        | {
            Args: {
              p_delivery_id: string
              p_failure_reason?: string
              p_status: Database["public"]["Enums"]["delivery_status_enum"]
            }
            Returns: boolean
          }
        | {
            Args: {
              p_delivery_id: string
              p_failure_reason?: string
              p_status: Database["public"]["Enums"]["delivery_status_enum"]
              p_updated_by?: string
            }
            Returns: boolean
          }
      update_delivery_status_idempotent: {
        Args: {
          p_delivery_id: string
          p_failure_reason?: string
          p_idempotency_key?: string
          p_status: Database["public"]["Enums"]["delivery_status_enum"]
          p_updated_by?: string
        }
        Returns: boolean
      }
      update_master_setting_option: {
        Args: { p_key: string; p_new_value: string; p_old_value: string }
        Returns: string[]
      }
      update_stock_at_location: {
        Args: {
          p_location: string
          p_operation: string
          p_product_id: string
          p_quantity: number
          p_reason?: string
          p_user_id?: string
        }
        Returns: number
      }
      validate_master_setting_option: {
        Args: {
          p_key: string
          p_label?: string
          p_required?: boolean
          p_value: string
        }
        Returns: string
      }
    }
    Enums: {
      collection_status_enum: "Pending" | "Collected" | "Overdue" | "Voided"
      company_enum: "LLP" | "YES YES" | "Zekon"
      delivery_status_enum: "Pending" | "In Transit" | "Delivered" | "Failed"
      grn_status_enum: "Pending" | "Verified" | "Completed"
      invoice_type_enum:
        | "GST"
        | "NGST"
        | "IGST"
        | "Delivery Challan Out"
        | "Delivery Challan In"
        | "Stock Transfer"
        | "Credit Note"
      order_status_enum:
        | "Pending"
        | "Approved"
        | "Rejected"
        | "Billed"
        | "Delivered"
        | "Voided"
      payment_mode_enum: "Cash" | "Cheque" | "UPI" | "Bank Transfer"
      po_status_enum:
        | "Draft"
        | "Pending"
        | "Approved"
        | "Received"
        | "Cancelled"
      stock_adjustment_type_enum: "Addition" | "Subtraction"
      supplier_status_enum: "Active" | "Inactive"
      user_role: "admin" | "sales" | "accounts" | "inventory" | "procurement"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      collection_status_enum: ["Pending", "Collected", "Overdue", "Voided"],
      company_enum: ["LLP", "YES YES", "Zekon"],
      delivery_status_enum: ["Pending", "In Transit", "Delivered", "Failed"],
      grn_status_enum: ["Pending", "Verified", "Completed"],
      invoice_type_enum: [
        "GST",
        "NGST",
        "IGST",
        "Delivery Challan Out",
        "Delivery Challan In",
        "Stock Transfer",
        "Credit Note",
      ],
      order_status_enum: [
        "Pending",
        "Approved",
        "Rejected",
        "Billed",
        "Delivered",
        "Voided",
      ],
      payment_mode_enum: ["Cash", "Cheque", "UPI", "Bank Transfer"],
      po_status_enum: ["Draft", "Pending", "Approved", "Received", "Cancelled"],
      stock_adjustment_type_enum: ["Addition", "Subtraction"],
      supplier_status_enum: ["Active", "Inactive"],
      user_role: ["admin", "sales", "accounts", "inventory", "procurement"],
    },
  },
} as const

// ---------------------------------------------------------------------------
// Named enum aliases — used directly by the app. Keep these in sync when
// regenerating types from the live schema. Three pseudo-enums (Godown / District /
// VehicleType) are now text columns backed by master settings, so they alias to
// `string`.
// ---------------------------------------------------------------------------

export type UserRole = Database['public']['Enums']['user_role'];
export type CompanyEnum = Database['public']['Enums']['company_enum'];
export type InvoiceTypeEnum = Database['public']['Enums']['invoice_type_enum'];
export type OrderStatusEnum = Database['public']['Enums']['order_status_enum'];
export type PaymentModeEnum = Database['public']['Enums']['payment_mode_enum'];
export type CollectionStatusEnum = Database['public']['Enums']['collection_status_enum'];
export type DeliveryStatusEnum = Database['public']['Enums']['delivery_status_enum'];
export type StockAdjustmentTypeEnum = Database['public']['Enums']['stock_adjustment_type_enum'];
export type SupplierStatusEnum = Database['public']['Enums']['supplier_status_enum'];
export type PoStatusEnum = Database['public']['Enums']['po_status_enum'];
export type GrnStatusEnum = Database['public']['Enums']['grn_status_enum'];
export type DistrictEnum = string;
export type VehicleTypeEnum = string;
export type GodownEnum = string;
