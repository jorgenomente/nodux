export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      audit_log: {
        Row: {
          action_key: string;
          actor_user_id: string;
          branch_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          metadata: Json | null;
          org_id: string;
        };
        Insert: {
          action_key: string;
          actor_user_id: string;
          branch_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          metadata?: Json | null;
          org_id: string;
        };
        Update: {
          action_key?: string;
          actor_user_id?: string;
          branch_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          metadata?: Json | null;
          org_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_log_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_log_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'audit_log_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'audit_log_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'audit_log_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'audit_log_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_log_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'audit_log_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      branch_memberships: {
        Row: {
          branch_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          org_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          branch_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          org_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          branch_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          org_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'branch_memberships_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'branch_memberships_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'branch_memberships_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'branch_memberships_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'branch_memberships_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'branch_memberships_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'branch_memberships_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'branch_memberships_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      branches: {
        Row: {
          address: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          org_id: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          org_id: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          org_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'branches_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'branches_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'branches_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      cash_session_count_lines: {
        Row: {
          branch_id: string;
          count_scope: string;
          created_at: string;
          denomination_value: number;
          id: string;
          org_id: string;
          quantity: number;
          session_id: string;
        };
        Insert: {
          branch_id: string;
          count_scope?: string;
          created_at?: string;
          denomination_value: number;
          id?: string;
          org_id: string;
          quantity: number;
          session_id: string;
        };
        Update: {
          branch_id?: string;
          count_scope?: string;
          created_at?: string;
          denomination_value?: number;
          id?: string;
          org_id?: string;
          quantity?: number;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cash_session_count_lines_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cash_session_count_lines_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'cash_session_count_lines_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'cash_session_count_lines_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'cash_session_count_lines_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'cash_session_count_lines_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cash_session_count_lines_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'cash_session_count_lines_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'cash_session_count_lines_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'cash_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cash_session_count_lines_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'v_cashbox_session_current';
            referencedColumns: ['session_id'];
          },
        ];
      };
      cash_session_movements: {
        Row: {
          amount: number;
          branch_id: string;
          category_key: string;
          created_at: string;
          created_by: string;
          id: string;
          movement_at: string;
          movement_type: string;
          note: string | null;
          org_id: string;
          session_id: string;
        };
        Insert: {
          amount: number;
          branch_id: string;
          category_key: string;
          created_at?: string;
          created_by: string;
          id?: string;
          movement_at?: string;
          movement_type: string;
          note?: string | null;
          org_id: string;
          session_id: string;
        };
        Update: {
          amount?: number;
          branch_id?: string;
          category_key?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          movement_at?: string;
          movement_type?: string;
          note?: string | null;
          org_id?: string;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cash_session_movements_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cash_session_movements_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'cash_session_movements_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'cash_session_movements_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'cash_session_movements_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'cash_session_movements_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cash_session_movements_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'cash_session_movements_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'cash_session_movements_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'cash_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cash_session_movements_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'v_cashbox_session_current';
            referencedColumns: ['session_id'];
          },
        ];
      };
      cash_sessions: {
        Row: {
          branch_id: string;
          close_confirmed: boolean;
          close_note: string | null;
          closed_at: string | null;
          closed_by: string | null;
          closed_controlled_by_name: string | null;
          closing_drawer_amount: number | null;
          closing_reserve_amount: number | null;
          counted_cash_amount: number | null;
          created_at: string;
          difference_amount: number | null;
          expected_cash_amount: number | null;
          id: string;
          opened_at: string;
          opened_by: string;
          opening_cash_amount: number;
          opening_reserve_amount: number;
          org_id: string;
          period_type: string;
          session_label: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          branch_id: string;
          close_confirmed?: boolean;
          close_note?: string | null;
          closed_at?: string | null;
          closed_by?: string | null;
          closed_controlled_by_name?: string | null;
          closing_drawer_amount?: number | null;
          closing_reserve_amount?: number | null;
          counted_cash_amount?: number | null;
          created_at?: string;
          difference_amount?: number | null;
          expected_cash_amount?: number | null;
          id?: string;
          opened_at?: string;
          opened_by: string;
          opening_cash_amount?: number;
          opening_reserve_amount?: number;
          org_id: string;
          period_type?: string;
          session_label?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          branch_id?: string;
          close_confirmed?: boolean;
          close_note?: string | null;
          closed_at?: string | null;
          closed_by?: string | null;
          closed_controlled_by_name?: string | null;
          closing_drawer_amount?: number | null;
          closing_reserve_amount?: number | null;
          counted_cash_amount?: number | null;
          created_at?: string;
          difference_amount?: number | null;
          expected_cash_amount?: number | null;
          id?: string;
          opened_at?: string;
          opened_by?: string;
          opening_cash_amount?: number;
          opening_reserve_amount?: number;
          org_id?: string;
          period_type?: string;
          session_label?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cash_sessions_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cash_sessions_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'cash_sessions_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'cash_sessions_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'cash_sessions_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'cash_sessions_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cash_sessions_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'cash_sessions_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      client_special_order_items: {
        Row: {
          created_at: string;
          fulfilled_qty: number;
          id: string;
          is_ordered: boolean;
          ordered_at: string | null;
          org_id: string;
          product_id: string;
          requested_qty: number;
          special_order_id: string;
          supplier_id: string | null;
          supplier_order_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          fulfilled_qty?: number;
          id?: string;
          is_ordered?: boolean;
          ordered_at?: string | null;
          org_id: string;
          product_id: string;
          requested_qty: number;
          special_order_id: string;
          supplier_id?: string | null;
          supplier_order_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          fulfilled_qty?: number;
          id?: string;
          is_ordered?: boolean;
          ordered_at?: string | null;
          org_id?: string;
          product_id?: string;
          requested_qty?: number;
          special_order_id?: string;
          supplier_id?: string | null;
          supplier_order_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'client_special_order_items_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_special_order_items_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'client_special_order_items_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'client_special_order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_special_order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'client_special_order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'client_special_order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_typeahead_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'client_special_order_items_special_order_id_fkey';
            columns: ['special_order_id'];
            isOneToOne: false;
            referencedRelation: 'client_special_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_special_order_items_special_order_id_fkey';
            columns: ['special_order_id'];
            isOneToOne: false;
            referencedRelation: 'v_special_order_items_pending';
            referencedColumns: ['special_order_id'];
          },
          {
            foreignKeyName: 'client_special_order_items_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'suppliers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_special_order_items_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_detail_admin';
            referencedColumns: ['supplier_id'];
          },
          {
            foreignKeyName: 'client_special_order_items_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'v_suppliers_admin';
            referencedColumns: ['supplier_id'];
          },
          {
            foreignKeyName: 'client_special_order_items_supplier_order_id_fkey';
            columns: ['supplier_order_id'];
            isOneToOne: false;
            referencedRelation: 'supplier_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_special_order_items_supplier_order_id_fkey';
            columns: ['supplier_order_id'];
            isOneToOne: false;
            referencedRelation: 'v_order_detail_admin';
            referencedColumns: ['order_id'];
          },
          {
            foreignKeyName: 'client_special_order_items_supplier_order_id_fkey';
            columns: ['supplier_order_id'];
            isOneToOne: false;
            referencedRelation: 'v_orders_admin';
            referencedColumns: ['order_id'];
          },
        ];
      };
      client_special_orders: {
        Row: {
          branch_id: string;
          client_id: string;
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          notes: string | null;
          org_id: string;
          quantity: number | null;
          status: Database['public']['Enums']['special_order_status'];
          updated_at: string;
        };
        Insert: {
          branch_id: string;
          client_id: string;
          created_at?: string;
          created_by: string;
          description?: string | null;
          id?: string;
          notes?: string | null;
          org_id: string;
          quantity?: number | null;
          status?: Database['public']['Enums']['special_order_status'];
          updated_at?: string;
        };
        Update: {
          branch_id?: string;
          client_id?: string;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          id?: string;
          notes?: string | null;
          org_id?: string;
          quantity?: number | null;
          status?: Database['public']['Enums']['special_order_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'client_special_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_special_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'client_special_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'client_special_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'client_special_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'client_special_orders_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_special_orders_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'v_special_order_items_pending';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'client_special_orders_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_special_orders_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'client_special_orders_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      clients: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          is_active: boolean;
          name: string;
          notes: string | null;
          org_id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          notes?: string | null;
          org_id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          notes?: string | null;
          org_id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'clients_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'clients_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'clients_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      expiration_batches: {
        Row: {
          batch_code: string | null;
          branch_id: string;
          created_at: string;
          expires_on: string;
          id: string;
          org_id: string;
          product_id: string;
          quantity: number;
          source_ref_id: string | null;
          source_type: string;
          updated_at: string;
        };
        Insert: {
          batch_code?: string | null;
          branch_id: string;
          created_at?: string;
          expires_on: string;
          id?: string;
          org_id: string;
          product_id: string;
          quantity: number;
          source_ref_id?: string | null;
          source_type: string;
          updated_at?: string;
        };
        Update: {
          batch_code?: string | null;
          branch_id?: string;
          created_at?: string;
          expires_on?: string;
          id?: string;
          org_id?: string;
          product_id?: string;
          quantity?: number;
          source_ref_id?: string | null;
          source_type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'expiration_batches_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expiration_batches_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_batches_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_batches_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_batches_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_batches_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expiration_batches_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'expiration_batches_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'expiration_batches_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expiration_batches_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'expiration_batches_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'expiration_batches_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_typeahead_admin';
            referencedColumns: ['product_id'];
          },
        ];
      };
      expiration_waste: {
        Row: {
          batch_id: string | null;
          branch_id: string;
          created_at: string;
          created_by: string;
          id: string;
          org_id: string;
          product_id: string;
          quantity: number;
          total_amount: number;
          unit_price_snapshot: number;
        };
        Insert: {
          batch_id?: string | null;
          branch_id: string;
          created_at?: string;
          created_by: string;
          id?: string;
          org_id: string;
          product_id: string;
          quantity: number;
          total_amount?: number;
          unit_price_snapshot?: number;
        };
        Update: {
          batch_id?: string | null;
          branch_id?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          org_id?: string;
          product_id?: string;
          quantity?: number;
          total_amount?: number;
          unit_price_snapshot?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'expiration_waste_batch_id_fkey';
            columns: ['batch_id'];
            isOneToOne: false;
            referencedRelation: 'expiration_batches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expiration_waste_batch_id_fkey';
            columns: ['batch_id'];
            isOneToOne: false;
            referencedRelation: 'v_expiration_batch_detail';
            referencedColumns: ['batch_id'];
          },
          {
            foreignKeyName: 'expiration_waste_batch_id_fkey';
            columns: ['batch_id'];
            isOneToOne: false;
            referencedRelation: 'v_expirations_due';
            referencedColumns: ['batch_id'];
          },
          {
            foreignKeyName: 'expiration_waste_batch_id_fkey';
            columns: ['batch_id'];
            isOneToOne: false;
            referencedRelation: 'v_expirations_expired';
            referencedColumns: ['batch_id'];
          },
          {
            foreignKeyName: 'expiration_waste_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expiration_waste_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_waste_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_waste_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_waste_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_waste_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expiration_waste_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'expiration_waste_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'expiration_waste_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expiration_waste_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'expiration_waste_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'expiration_waste_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_typeahead_admin';
            referencedColumns: ['product_id'];
          },
        ];
      };
      org_preferences: {
        Row: {
          allow_negative_stock: boolean;
          cash_denominations: Json;
          cash_discount_default_pct: number;
          cash_discount_enabled: boolean;
          created_at: string;
          critical_days: number;
          org_id: string;
          updated_at: string;
          warning_days: number;
        };
        Insert: {
          allow_negative_stock?: boolean;
          cash_denominations?: Json;
          cash_discount_default_pct?: number;
          cash_discount_enabled?: boolean;
          created_at?: string;
          critical_days?: number;
          org_id: string;
          updated_at?: string;
          warning_days?: number;
        };
        Update: {
          allow_negative_stock?: boolean;
          cash_denominations?: Json;
          cash_discount_default_pct?: number;
          cash_discount_enabled?: boolean;
          created_at?: string;
          critical_days?: number;
          org_id?: string;
          updated_at?: string;
          warning_days?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'org_preferences_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: true;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'org_preferences_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: true;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'org_preferences_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: true;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      org_users: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          is_active: boolean;
          org_id: string;
          role: Database['public']['Enums']['user_role'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          is_active?: boolean;
          org_id: string;
          role: Database['public']['Enums']['user_role'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          is_active?: boolean;
          org_id?: string;
          role?: Database['public']['Enums']['user_role'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'org_users_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'org_users_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'org_users_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      orgs: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      platform_admins: {
        Row: {
          created_at: string;
          created_by: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          barcode: string | null;
          created_at: string;
          id: string;
          internal_code: string | null;
          is_active: boolean;
          name: string;
          org_id: string;
          sell_unit_type: Database['public']['Enums']['sell_unit_type'];
          shelf_life_days: number | null;
          unit_price: number;
          uom: string;
          updated_at: string;
        };
        Insert: {
          barcode?: string | null;
          created_at?: string;
          id?: string;
          internal_code?: string | null;
          is_active?: boolean;
          name: string;
          org_id: string;
          sell_unit_type: Database['public']['Enums']['sell_unit_type'];
          shelf_life_days?: number | null;
          unit_price?: number;
          uom: string;
          updated_at?: string;
        };
        Update: {
          barcode?: string | null;
          created_at?: string;
          id?: string;
          internal_code?: string | null;
          is_active?: boolean;
          name?: string;
          org_id?: string;
          sell_unit_type?: Database['public']['Enums']['sell_unit_type'];
          shelf_life_days?: number | null;
          unit_price?: number;
          uom?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'products_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'products_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'products_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      sale_items: {
        Row: {
          id: string;
          line_total: number;
          org_id: string;
          product_id: string;
          product_name_snapshot: string;
          quantity: number;
          sale_id: string;
          unit_price_snapshot: number;
        };
        Insert: {
          id?: string;
          line_total: number;
          org_id: string;
          product_id: string;
          product_name_snapshot: string;
          quantity: number;
          sale_id: string;
          unit_price_snapshot: number;
        };
        Update: {
          id?: string;
          line_total?: number;
          org_id?: string;
          product_id?: string;
          product_name_snapshot?: string;
          quantity?: number;
          sale_id?: string;
          unit_price_snapshot?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'sale_items_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sale_items_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'sale_items_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'sale_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sale_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'sale_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'sale_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_typeahead_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'sale_items_sale_id_fkey';
            columns: ['sale_id'];
            isOneToOne: false;
            referencedRelation: 'sales';
            referencedColumns: ['id'];
          },
        ];
      };
      sale_payments: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          org_id: string;
          payment_method: Database['public']['Enums']['payment_method'];
          sale_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          org_id: string;
          payment_method: Database['public']['Enums']['payment_method'];
          sale_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          org_id?: string;
          payment_method?: Database['public']['Enums']['payment_method'];
          sale_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sale_payments_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sale_payments_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'sale_payments_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'sale_payments_sale_id_fkey';
            columns: ['sale_id'];
            isOneToOne: false;
            referencedRelation: 'sales';
            referencedColumns: ['id'];
          },
        ];
      };
      sales: {
        Row: {
          branch_id: string;
          created_at: string;
          created_by: string;
          discount_amount: number;
          discount_pct: number;
          id: string;
          org_id: string;
          payment_method: Database['public']['Enums']['payment_method'];
          subtotal_amount: number;
          total_amount: number;
        };
        Insert: {
          branch_id: string;
          created_at?: string;
          created_by: string;
          discount_amount?: number;
          discount_pct?: number;
          id?: string;
          org_id: string;
          payment_method: Database['public']['Enums']['payment_method'];
          subtotal_amount?: number;
          total_amount: number;
        };
        Update: {
          branch_id?: string;
          created_at?: string;
          created_by?: string;
          discount_amount?: number;
          discount_pct?: number;
          id?: string;
          org_id?: string;
          payment_method?: Database['public']['Enums']['payment_method'];
          subtotal_amount?: number;
          total_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'sales_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sales_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'sales_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'sales_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'sales_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'sales_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sales_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'sales_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      staff_module_access: {
        Row: {
          branch_id: string | null;
          created_at: string;
          id: string;
          is_enabled: boolean;
          module_key: string;
          org_id: string;
          role: Database['public']['Enums']['user_role'];
          updated_at: string;
        };
        Insert: {
          branch_id?: string | null;
          created_at?: string;
          id?: string;
          is_enabled?: boolean;
          module_key: string;
          org_id: string;
          role?: Database['public']['Enums']['user_role'];
          updated_at?: string;
        };
        Update: {
          branch_id?: string | null;
          created_at?: string;
          id?: string;
          is_enabled?: boolean;
          module_key?: string;
          org_id?: string;
          role?: Database['public']['Enums']['user_role'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'staff_module_access_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'staff_module_access_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'staff_module_access_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'staff_module_access_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'staff_module_access_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'staff_module_access_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'staff_module_access_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'staff_module_access_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      stock_items: {
        Row: {
          branch_id: string;
          id: string;
          org_id: string;
          product_id: string;
          quantity_on_hand: number;
          safety_stock: number;
          updated_at: string;
        };
        Insert: {
          branch_id: string;
          id?: string;
          org_id: string;
          product_id: string;
          quantity_on_hand?: number;
          safety_stock?: number;
          updated_at?: string;
        };
        Update: {
          branch_id?: string;
          id?: string;
          org_id?: string;
          product_id?: string;
          quantity_on_hand?: number;
          safety_stock?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'stock_items_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_items_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'stock_items_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'stock_items_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'stock_items_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'stock_items_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_items_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'stock_items_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'stock_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'stock_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'stock_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_typeahead_admin';
            referencedColumns: ['product_id'];
          },
        ];
      };
      stock_movements: {
        Row: {
          branch_id: string;
          created_at: string;
          expiration_batch_id: string | null;
          id: string;
          movement_type: Database['public']['Enums']['stock_movement_type'];
          org_id: string;
          product_id: string;
          quantity_delta: number;
          reason: string | null;
          source_id: string | null;
          source_type: string | null;
        };
        Insert: {
          branch_id: string;
          created_at?: string;
          expiration_batch_id?: string | null;
          id?: string;
          movement_type: Database['public']['Enums']['stock_movement_type'];
          org_id: string;
          product_id: string;
          quantity_delta: number;
          reason?: string | null;
          source_id?: string | null;
          source_type?: string | null;
        };
        Update: {
          branch_id?: string;
          created_at?: string;
          expiration_batch_id?: string | null;
          id?: string;
          movement_type?: Database['public']['Enums']['stock_movement_type'];
          org_id?: string;
          product_id?: string;
          quantity_delta?: number;
          reason?: string | null;
          source_id?: string | null;
          source_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'stock_movements_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_movements_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'stock_movements_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'stock_movements_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'stock_movements_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'stock_movements_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_movements_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'stock_movements_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'stock_movements_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_movements_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'stock_movements_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'stock_movements_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_typeahead_admin';
            referencedColumns: ['product_id'];
          },
        ];
      };
      supplier_order_items: {
        Row: {
          created_at: string;
          id: string;
          order_id: string;
          ordered_qty: number;
          org_id: string;
          product_id: string;
          received_qty: number;
          unit_cost: number | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          order_id: string;
          ordered_qty: number;
          org_id: string;
          product_id: string;
          received_qty?: number;
          unit_cost?: number | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          order_id?: string;
          ordered_qty?: number;
          org_id?: string;
          product_id?: string;
          received_qty?: number;
          unit_cost?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'supplier_order_items_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'supplier_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_order_items_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'v_order_detail_admin';
            referencedColumns: ['order_id'];
          },
          {
            foreignKeyName: 'supplier_order_items_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'v_orders_admin';
            referencedColumns: ['order_id'];
          },
          {
            foreignKeyName: 'supplier_order_items_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_order_items_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'supplier_order_items_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'supplier_order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'supplier_order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'supplier_order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_typeahead_admin';
            referencedColumns: ['product_id'];
          },
        ];
      };
      supplier_orders: {
        Row: {
          branch_id: string;
          controlled_by_name: string | null;
          controlled_by_user_id: string | null;
          created_at: string;
          created_by: string;
          expected_receive_on: string | null;
          id: string;
          notes: string | null;
          org_id: string;
          received_at: string | null;
          reconciled_at: string | null;
          sent_at: string | null;
          status: Database['public']['Enums']['supplier_order_status'];
          supplier_id: string;
          updated_at: string;
        };
        Insert: {
          branch_id: string;
          controlled_by_name?: string | null;
          controlled_by_user_id?: string | null;
          created_at?: string;
          created_by: string;
          expected_receive_on?: string | null;
          id?: string;
          notes?: string | null;
          org_id: string;
          received_at?: string | null;
          reconciled_at?: string | null;
          sent_at?: string | null;
          status?: Database['public']['Enums']['supplier_order_status'];
          supplier_id: string;
          updated_at?: string;
        };
        Update: {
          branch_id?: string;
          controlled_by_name?: string | null;
          controlled_by_user_id?: string | null;
          created_at?: string;
          created_by?: string;
          expected_receive_on?: string | null;
          id?: string;
          notes?: string | null;
          org_id?: string;
          received_at?: string | null;
          reconciled_at?: string | null;
          sent_at?: string | null;
          status?: Database['public']['Enums']['supplier_order_status'];
          supplier_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'supplier_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_orders_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_orders_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'supplier_orders_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'supplier_orders_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'suppliers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_orders_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_detail_admin';
            referencedColumns: ['supplier_id'];
          },
          {
            foreignKeyName: 'supplier_orders_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'v_suppliers_admin';
            referencedColumns: ['supplier_id'];
          },
        ];
      };
      supplier_payables: {
        Row: {
          branch_id: string;
          created_at: string;
          created_by: string | null;
          due_on: string | null;
          estimated_amount: number;
          id: string;
          invoice_amount: number | null;
          invoice_note: string | null;
          invoice_photo_url: string | null;
          order_id: string;
          org_id: string;
          outstanding_amount: number;
          paid_amount: number;
          paid_at: string | null;
          payment_terms_days_snapshot: number | null;
          preferred_payment_method:
            | Database['public']['Enums']['payment_method']
            | null;
          selected_payment_method:
            | Database['public']['Enums']['payment_method']
            | null;
          status: string;
          supplier_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          branch_id: string;
          created_at?: string;
          created_by?: string | null;
          due_on?: string | null;
          estimated_amount?: number;
          id?: string;
          invoice_amount?: number | null;
          invoice_note?: string | null;
          invoice_photo_url?: string | null;
          order_id: string;
          org_id: string;
          outstanding_amount?: number;
          paid_amount?: number;
          paid_at?: string | null;
          payment_terms_days_snapshot?: number | null;
          preferred_payment_method?:
            | Database['public']['Enums']['payment_method']
            | null;
          selected_payment_method?:
            | Database['public']['Enums']['payment_method']
            | null;
          status?: string;
          supplier_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          branch_id?: string;
          created_at?: string;
          created_by?: string | null;
          due_on?: string | null;
          estimated_amount?: number;
          id?: string;
          invoice_amount?: number | null;
          invoice_note?: string | null;
          invoice_photo_url?: string | null;
          order_id?: string;
          org_id?: string;
          outstanding_amount?: number;
          paid_amount?: number;
          paid_at?: string | null;
          payment_terms_days_snapshot?: number | null;
          preferred_payment_method?:
            | Database['public']['Enums']['payment_method']
            | null;
          selected_payment_method?:
            | Database['public']['Enums']['payment_method']
            | null;
          status?: string;
          supplier_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'supplier_payables_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_payables_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_payables_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_payables_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_payables_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_payables_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: true;
            referencedRelation: 'supplier_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_payables_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: true;
            referencedRelation: 'v_order_detail_admin';
            referencedColumns: ['order_id'];
          },
          {
            foreignKeyName: 'supplier_payables_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: true;
            referencedRelation: 'v_orders_admin';
            referencedColumns: ['order_id'];
          },
          {
            foreignKeyName: 'supplier_payables_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_payables_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'supplier_payables_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'supplier_payables_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'suppliers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_payables_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_detail_admin';
            referencedColumns: ['supplier_id'];
          },
          {
            foreignKeyName: 'supplier_payables_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'v_suppliers_admin';
            referencedColumns: ['supplier_id'];
          },
        ];
      };
      supplier_payment_accounts: {
        Row: {
          account_holder_name: string | null;
          account_identifier: string | null;
          account_label: string | null;
          bank_name: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          is_active: boolean;
          org_id: string;
          supplier_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          account_holder_name?: string | null;
          account_identifier?: string | null;
          account_label?: string | null;
          bank_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          org_id: string;
          supplier_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          account_holder_name?: string | null;
          account_identifier?: string | null;
          account_label?: string | null;
          bank_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          org_id?: string;
          supplier_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'supplier_payment_accounts_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_payment_accounts_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'supplier_payment_accounts_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'supplier_payment_accounts_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'suppliers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_payment_accounts_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_detail_admin';
            referencedColumns: ['supplier_id'];
          },
          {
            foreignKeyName: 'supplier_payment_accounts_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'v_suppliers_admin';
            referencedColumns: ['supplier_id'];
          },
        ];
      };
      supplier_payments: {
        Row: {
          amount: number;
          branch_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          note: string | null;
          order_id: string;
          org_id: string;
          paid_at: string;
          payable_id: string;
          payment_method: Database['public']['Enums']['payment_method'];
          reference: string | null;
          supplier_id: string;
          transfer_account_id: string | null;
        };
        Insert: {
          amount: number;
          branch_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          note?: string | null;
          order_id: string;
          org_id: string;
          paid_at?: string;
          payable_id: string;
          payment_method: Database['public']['Enums']['payment_method'];
          reference?: string | null;
          supplier_id: string;
          transfer_account_id?: string | null;
        };
        Update: {
          amount?: number;
          branch_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          note?: string | null;
          order_id?: string;
          org_id?: string;
          paid_at?: string;
          payable_id?: string;
          payment_method?: Database['public']['Enums']['payment_method'];
          reference?: string | null;
          supplier_id?: string;
          transfer_account_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'supplier_payments_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_payments_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_payments_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_payments_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_payments_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_payments_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'supplier_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_payments_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'v_order_detail_admin';
            referencedColumns: ['order_id'];
          },
          {
            foreignKeyName: 'supplier_payments_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'v_orders_admin';
            referencedColumns: ['order_id'];
          },
          {
            foreignKeyName: 'supplier_payments_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_payments_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'supplier_payments_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'supplier_payments_payable_id_fkey';
            columns: ['payable_id'];
            isOneToOne: false;
            referencedRelation: 'supplier_payables';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_payments_payable_id_fkey';
            columns: ['payable_id'];
            isOneToOne: false;
            referencedRelation: 'v_orders_admin';
            referencedColumns: ['payable_id'];
          },
          {
            foreignKeyName: 'supplier_payments_payable_id_fkey';
            columns: ['payable_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_payables_admin';
            referencedColumns: ['payable_id'];
          },
          {
            foreignKeyName: 'supplier_payments_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'suppliers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_payments_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_detail_admin';
            referencedColumns: ['supplier_id'];
          },
          {
            foreignKeyName: 'supplier_payments_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'v_suppliers_admin';
            referencedColumns: ['supplier_id'];
          },
          {
            foreignKeyName: 'supplier_payments_transfer_account_id_fkey';
            columns: ['transfer_account_id'];
            isOneToOne: false;
            referencedRelation: 'supplier_payment_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      supplier_products: {
        Row: {
          created_at: string;
          default_purchase_uom: string | null;
          id: string;
          org_id: string;
          product_id: string;
          relation_type: Database['public']['Enums']['supplier_product_relation_type'];
          supplier_id: string;
          supplier_product_name: string | null;
          supplier_sku: string | null;
        };
        Insert: {
          created_at?: string;
          default_purchase_uom?: string | null;
          id?: string;
          org_id: string;
          product_id: string;
          relation_type?: Database['public']['Enums']['supplier_product_relation_type'];
          supplier_id: string;
          supplier_product_name?: string | null;
          supplier_sku?: string | null;
        };
        Update: {
          created_at?: string;
          default_purchase_uom?: string | null;
          id?: string;
          org_id?: string;
          product_id?: string;
          relation_type?: Database['public']['Enums']['supplier_product_relation_type'];
          supplier_id?: string;
          supplier_product_name?: string | null;
          supplier_sku?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'supplier_products_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_products_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'supplier_products_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'supplier_products_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_products_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'supplier_products_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'supplier_products_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_typeahead_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'supplier_products_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'suppliers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_products_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_detail_admin';
            referencedColumns: ['supplier_id'];
          },
          {
            foreignKeyName: 'supplier_products_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'v_suppliers_admin';
            referencedColumns: ['supplier_id'];
          },
        ];
      };
      suppliers: {
        Row: {
          accepts_cash: boolean;
          accepts_transfer: boolean;
          contact_name: string | null;
          created_at: string;
          email: string | null;
          id: string;
          is_active: boolean;
          name: string;
          notes: string | null;
          order_day: Database['public']['Enums']['weekday'] | null;
          order_frequency:
            | Database['public']['Enums']['order_frequency']
            | null;
          org_id: string;
          payment_note: string | null;
          payment_terms_days: number | null;
          phone: string | null;
          preferred_payment_method:
            | Database['public']['Enums']['payment_method']
            | null;
          receive_day: Database['public']['Enums']['weekday'] | null;
          updated_at: string;
        };
        Insert: {
          accepts_cash?: boolean;
          accepts_transfer?: boolean;
          contact_name?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          notes?: string | null;
          order_day?: Database['public']['Enums']['weekday'] | null;
          order_frequency?:
            | Database['public']['Enums']['order_frequency']
            | null;
          org_id: string;
          payment_note?: string | null;
          payment_terms_days?: number | null;
          phone?: string | null;
          preferred_payment_method?:
            | Database['public']['Enums']['payment_method']
            | null;
          receive_day?: Database['public']['Enums']['weekday'] | null;
          updated_at?: string;
        };
        Update: {
          accepts_cash?: boolean;
          accepts_transfer?: boolean;
          contact_name?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          notes?: string | null;
          order_day?: Database['public']['Enums']['weekday'] | null;
          order_frequency?:
            | Database['public']['Enums']['order_frequency']
            | null;
          org_id?: string;
          payment_note?: string | null;
          payment_terms_days?: number | null;
          phone?: string | null;
          preferred_payment_method?:
            | Database['public']['Enums']['payment_method']
            | null;
          receive_day?: Database['public']['Enums']['weekday'] | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'suppliers_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'suppliers_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'suppliers_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      user_active_orgs: {
        Row: {
          active_org_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active_org_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active_org_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_active_orgs_active_org_id_fkey';
            columns: ['active_org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_active_orgs_active_org_id_fkey';
            columns: ['active_org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'user_active_orgs_active_org_id_fkey';
            columns: ['active_org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
    };
    Views: {
      v_audit_log_admin: {
        Row: {
          action_key: string | null;
          actor_display_name: string | null;
          actor_role: Database['public']['Enums']['user_role'] | null;
          actor_user_id: string | null;
          branch_id: string | null;
          branch_name: string | null;
          created_at: string | null;
          entity_id: string | null;
          entity_type: string | null;
          id: string | null;
          metadata: Json | null;
          org_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_log_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_log_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'audit_log_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'audit_log_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'audit_log_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'audit_log_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_log_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'audit_log_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      v_branches_admin: {
        Row: {
          address: string | null;
          branch_id: string | null;
          created_at: string | null;
          is_active: boolean | null;
          members_count: number | null;
          name: string | null;
          org_id: string | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'branches_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'branches_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'branches_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      v_cashbox_session_current: {
        Row: {
          branch_id: string | null;
          cash_sales_amount: number | null;
          close_confirmed: boolean | null;
          close_note: string | null;
          closed_at: string | null;
          closed_by: string | null;
          closed_controlled_by_name: string | null;
          closing_drawer_amount: number | null;
          closing_reserve_amount: number | null;
          counted_cash_amount: number | null;
          created_at: string | null;
          difference_amount: number | null;
          expected_cash_amount: number | null;
          manual_expense_amount: number | null;
          manual_income_amount: number | null;
          movements_count: number | null;
          opened_at: string | null;
          opened_by: string | null;
          opening_cash_amount: number | null;
          opening_reserve_amount: number | null;
          org_id: string | null;
          period_type: string | null;
          session_id: string | null;
          session_label: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'cash_sessions_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cash_sessions_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'cash_sessions_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'cash_sessions_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'cash_sessions_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'cash_sessions_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cash_sessions_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'cash_sessions_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      v_dashboard_admin: {
        Row: {
          branch_id: string | null;
          cash_discount_today_total: number | null;
          cash_discounted_sales_today_count: number | null;
          cash_sales_today_count: number | null;
          cash_sales_today_total: number | null;
          client_orders_pending_count: number | null;
          expirations_critical_count: number | null;
          expirations_warning_count: number | null;
          org_id: string | null;
          sales_month_total: number | null;
          sales_today_count: number | null;
          sales_today_total: number | null;
          sales_week_total: number | null;
          supplier_orders_pending_count: number | null;
        };
        Relationships: [];
      };
      v_expiration_batch_detail: {
        Row: {
          batch_code: string | null;
          batch_id: string | null;
          branch_id: string | null;
          branch_name: string | null;
          created_at: string | null;
          days_left: number | null;
          expires_on: string | null;
          org_id: string | null;
          product_id: string | null;
          product_name: string | null;
          quantity: number | null;
          source_ref_id: string | null;
          source_type: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'expiration_batches_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expiration_batches_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_batches_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_batches_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_batches_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_batches_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expiration_batches_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'expiration_batches_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'expiration_batches_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expiration_batches_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'expiration_batches_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'expiration_batches_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_typeahead_admin';
            referencedColumns: ['product_id'];
          },
        ];
      };
      v_expiration_waste_detail: {
        Row: {
          branch_id: string | null;
          branch_name: string | null;
          created_at: string | null;
          org_id: string | null;
          product_id: string | null;
          product_name: string | null;
          quantity: number | null;
          total_amount: number | null;
          unit_price_snapshot: number | null;
          waste_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'expiration_waste_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expiration_waste_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_waste_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_waste_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_waste_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_waste_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expiration_waste_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'expiration_waste_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'expiration_waste_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expiration_waste_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'expiration_waste_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'expiration_waste_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_typeahead_admin';
            referencedColumns: ['product_id'];
          },
        ];
      };
      v_expiration_waste_summary: {
        Row: {
          branch_id: string | null;
          last_created_at: string | null;
          org_id: string | null;
          total_amount: number | null;
          total_quantity: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'expiration_waste_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expiration_waste_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_waste_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_waste_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_waste_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_waste_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expiration_waste_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'expiration_waste_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      v_expirations_due: {
        Row: {
          batch_code: string | null;
          batch_id: string | null;
          branch_id: string | null;
          branch_name: string | null;
          critical_days: number | null;
          days_left: number | null;
          expires_on: string | null;
          org_id: string | null;
          product_id: string | null;
          product_name: string | null;
          quantity: number | null;
          severity: string | null;
          total_value: number | null;
          unit_price: number | null;
          warning_days: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'expiration_batches_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expiration_batches_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_batches_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_batches_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_batches_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_batches_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expiration_batches_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'expiration_batches_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'expiration_batches_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expiration_batches_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'expiration_batches_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'expiration_batches_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_typeahead_admin';
            referencedColumns: ['product_id'];
          },
        ];
      };
      v_expirations_expired: {
        Row: {
          batch_code: string | null;
          batch_id: string | null;
          branch_id: string | null;
          branch_name: string | null;
          days_expired: number | null;
          expires_on: string | null;
          org_id: string | null;
          product_id: string | null;
          product_name: string | null;
          quantity: number | null;
          total_value: number | null;
          unit_price: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'expiration_batches_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expiration_batches_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_batches_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_batches_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_batches_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'expiration_batches_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expiration_batches_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'expiration_batches_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'expiration_batches_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expiration_batches_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'expiration_batches_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'expiration_batches_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_typeahead_admin';
            referencedColumns: ['product_id'];
          },
        ];
      };
      v_order_detail_admin: {
        Row: {
          branch_id: string | null;
          branch_name: string | null;
          controlled_by_name: string | null;
          controlled_by_user_id: string | null;
          controlled_by_user_name: string | null;
          created_at: string | null;
          diff_qty: number | null;
          expected_receive_on: string | null;
          notes: string | null;
          order_id: string | null;
          order_item_id: string | null;
          ordered_qty: number | null;
          org_id: string | null;
          product_id: string | null;
          product_name: string | null;
          received_at: string | null;
          received_qty: number | null;
          reconciled_at: string | null;
          sent_at: string | null;
          status: Database['public']['Enums']['supplier_order_status'] | null;
          supplier_id: string | null;
          supplier_name: string | null;
          unit_cost: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'supplier_order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'supplier_order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'supplier_order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_typeahead_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'supplier_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_orders_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_orders_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'supplier_orders_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'supplier_orders_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'suppliers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_orders_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_detail_admin';
            referencedColumns: ['supplier_id'];
          },
          {
            foreignKeyName: 'supplier_orders_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'v_suppliers_admin';
            referencedColumns: ['supplier_id'];
          },
        ];
      };
      v_orders_admin: {
        Row: {
          branch_id: string | null;
          branch_name: string | null;
          created_at: string | null;
          expected_receive_on: string | null;
          items_count: number | null;
          order_id: string | null;
          org_id: string | null;
          payable_due_on: string | null;
          payable_id: string | null;
          payable_outstanding_amount: number | null;
          payable_status: string | null;
          payment_state: string | null;
          received_at: string | null;
          reconciled_at: string | null;
          sent_at: string | null;
          status: Database['public']['Enums']['supplier_order_status'] | null;
          supplier_id: string | null;
          supplier_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'supplier_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_orders_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_orders_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'supplier_orders_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'supplier_orders_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'suppliers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_orders_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_detail_admin';
            referencedColumns: ['supplier_id'];
          },
          {
            foreignKeyName: 'supplier_orders_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'v_suppliers_admin';
            referencedColumns: ['supplier_id'];
          },
        ];
      };
      v_pos_product_catalog: {
        Row: {
          barcode: string | null;
          branch_id: string | null;
          internal_code: string | null;
          is_active: boolean | null;
          name: string | null;
          org_id: string | null;
          product_id: string | null;
          sell_unit_type: Database['public']['Enums']['sell_unit_type'] | null;
          stock_on_hand: number | null;
          unit_price: number | null;
          uom: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'products_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'products_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'products_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      v_products_admin: {
        Row: {
          barcode: string | null;
          created_at: string | null;
          internal_code: string | null;
          is_active: boolean | null;
          name: string | null;
          org_id: string | null;
          product_id: string | null;
          sell_unit_type: Database['public']['Enums']['sell_unit_type'] | null;
          shelf_life_days: number | null;
          stock_by_branch: Json | null;
          stock_total: number | null;
          unit_price: number | null;
          uom: string | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'products_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'products_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'products_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      v_products_typeahead_admin: {
        Row: {
          is_active: boolean | null;
          name: string | null;
          org_id: string | null;
          product_id: string | null;
        };
        Insert: {
          is_active?: boolean | null;
          name?: string | null;
          org_id?: string | null;
          product_id?: string | null;
        };
        Update: {
          is_active?: boolean | null;
          name?: string | null;
          org_id?: string | null;
          product_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'products_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'products_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'products_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      v_settings_users_admin: {
        Row: {
          branch_ids: string[] | null;
          created_at: string | null;
          display_name: string | null;
          email: string | null;
          is_active: boolean | null;
          org_id: string | null;
          role: Database['public']['Enums']['user_role'] | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'org_users_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'org_users_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'org_users_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      v_special_order_items_pending: {
        Row: {
          branch_id: string | null;
          client_id: string | null;
          client_name: string | null;
          fulfilled_qty: number | null;
          is_ordered: boolean | null;
          item_id: string | null;
          ordered_at: string | null;
          org_id: string | null;
          product_id: string | null;
          product_name: string | null;
          remaining_qty: number | null;
          requested_qty: number | null;
          special_order_id: string | null;
          special_order_status:
            | Database['public']['Enums']['special_order_status']
            | null;
          supplier_id: string | null;
          supplier_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'client_special_order_items_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_special_order_items_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'client_special_order_items_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'client_special_order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_special_order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'client_special_order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'client_special_order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_typeahead_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'client_special_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_special_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'client_special_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'client_special_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'client_special_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
        ];
      };
      v_staff_effective_modules: {
        Row: {
          branch_id: string | null;
          is_enabled: boolean | null;
          module_key: string | null;
          org_id: string | null;
          source_scope: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'branch_memberships_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'branch_memberships_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'branch_memberships_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'branch_memberships_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'branch_memberships_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'branch_memberships_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'branch_memberships_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'branch_memberships_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      v_stock_by_branch: {
        Row: {
          branch_id: string | null;
          org_id: string | null;
          product_id: string | null;
          quantity_on_hand: number | null;
          updated_at: string | null;
        };
        Insert: {
          branch_id?: string | null;
          org_id?: string | null;
          product_id?: string | null;
          quantity_on_hand?: number | null;
          updated_at?: string | null;
        };
        Update: {
          branch_id?: string | null;
          org_id?: string | null;
          product_id?: string | null;
          quantity_on_hand?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'stock_items_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_items_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'stock_items_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'stock_items_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'stock_items_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'stock_items_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_items_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'stock_items_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'stock_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'stock_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'stock_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_typeahead_admin';
            referencedColumns: ['product_id'];
          },
        ];
      };
      v_superadmin_org_detail: {
        Row: {
          branch_address: string | null;
          branch_created_at: string | null;
          branch_id: string | null;
          branch_is_active: boolean | null;
          branch_name: string | null;
          display_name: string | null;
          org_id: string | null;
          org_is_active: boolean | null;
          org_name: string | null;
          role: Database['public']['Enums']['user_role'] | null;
          timezone: string | null;
          user_created_at: string | null;
          user_id: string | null;
          user_is_active: boolean | null;
        };
        Relationships: [];
      };
      v_superadmin_orgs: {
        Row: {
          branches_count: number | null;
          created_at: string | null;
          is_active: boolean | null;
          org_id: string | null;
          org_name: string | null;
          timezone: string | null;
          users_count: number | null;
        };
        Relationships: [];
      };
      v_supplier_detail_admin: {
        Row: {
          accepts_cash: boolean | null;
          accepts_transfer: boolean | null;
          barcode: string | null;
          contact_name: string | null;
          created_at: string | null;
          email: string | null;
          internal_code: string | null;
          is_active: boolean | null;
          name: string | null;
          notes: string | null;
          order_day: Database['public']['Enums']['weekday'] | null;
          order_frequency:
            | Database['public']['Enums']['order_frequency']
            | null;
          org_id: string | null;
          payment_note: string | null;
          payment_terms_days: number | null;
          phone: string | null;
          preferred_payment_method:
            | Database['public']['Enums']['payment_method']
            | null;
          product_id: string | null;
          product_is_active: boolean | null;
          product_name: string | null;
          receive_day: Database['public']['Enums']['weekday'] | null;
          relation_type:
            | Database['public']['Enums']['supplier_product_relation_type']
            | null;
          supplier_id: string | null;
          supplier_product_name: string | null;
          supplier_sku: string | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'supplier_products_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_products_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'supplier_products_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'supplier_products_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_typeahead_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'suppliers_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'suppliers_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'suppliers_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      v_supplier_payables_admin: {
        Row: {
          branch_id: string | null;
          branch_name: string | null;
          created_at: string | null;
          due_in_days: number | null;
          due_on: string | null;
          estimated_amount: number | null;
          invoice_amount: number | null;
          invoice_note: string | null;
          invoice_photo_url: string | null;
          is_overdue: boolean | null;
          order_id: string | null;
          order_status:
            | Database['public']['Enums']['supplier_order_status']
            | null;
          org_id: string | null;
          outstanding_amount: number | null;
          paid_amount: number | null;
          paid_at: string | null;
          payable_id: string | null;
          payable_status: string | null;
          payment_state: string | null;
          payment_terms_days_snapshot: number | null;
          preferred_payment_method:
            | Database['public']['Enums']['payment_method']
            | null;
          selected_payment_method:
            | Database['public']['Enums']['payment_method']
            | null;
          supplier_id: string | null;
          supplier_name: string | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'supplier_payables_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_payables_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_payables_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_payables_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_payables_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'supplier_payables_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: true;
            referencedRelation: 'supplier_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_payables_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: true;
            referencedRelation: 'v_order_detail_admin';
            referencedColumns: ['order_id'];
          },
          {
            foreignKeyName: 'supplier_payables_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: true;
            referencedRelation: 'v_orders_admin';
            referencedColumns: ['order_id'];
          },
          {
            foreignKeyName: 'supplier_payables_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_payables_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'supplier_payables_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'supplier_payables_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'suppliers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_payables_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_detail_admin';
            referencedColumns: ['supplier_id'];
          },
          {
            foreignKeyName: 'supplier_payables_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'v_suppliers_admin';
            referencedColumns: ['supplier_id'];
          },
        ];
      };
      v_supplier_product_suggestions: {
        Row: {
          avg_daily_sales_30d: number | null;
          branch_id: string | null;
          cycle_days: number | null;
          org_id: string | null;
          product_id: string | null;
          product_name: string | null;
          relation_type:
            | Database['public']['Enums']['supplier_product_relation_type']
            | null;
          safety_stock: number | null;
          stock_on_hand: number | null;
          suggested_qty: number | null;
          supplier_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'supplier_products_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_products_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'supplier_products_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'supplier_products_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_products_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'supplier_products_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'supplier_products_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_typeahead_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'supplier_products_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'suppliers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_products_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_detail_admin';
            referencedColumns: ['supplier_id'];
          },
          {
            foreignKeyName: 'supplier_products_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'v_suppliers_admin';
            referencedColumns: ['supplier_id'];
          },
        ];
      };
      v_suppliers_admin: {
        Row: {
          accepts_cash: boolean | null;
          accepts_transfer: boolean | null;
          contact_name: string | null;
          created_at: string | null;
          email: string | null;
          is_active: boolean | null;
          name: string | null;
          notes: string | null;
          order_day: Database['public']['Enums']['weekday'] | null;
          order_frequency:
            | Database['public']['Enums']['order_frequency']
            | null;
          org_id: string | null;
          payment_accounts_count: number | null;
          payment_note: string | null;
          payment_terms_days: number | null;
          phone: string | null;
          preferred_payment_method:
            | Database['public']['Enums']['payment_method']
            | null;
          products_count: number | null;
          receive_day: Database['public']['Enums']['weekday'] | null;
          supplier_id: string | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'suppliers_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'suppliers_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'suppliers_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
    };
    Functions: {
      fn_recompute_supplier_payable: {
        Args: { p_actor_user_id?: string; p_payable_id: string };
        Returns: undefined;
      };
      fn_sync_supplier_payable_from_order: {
        Args: {
          p_actor_user_id?: string;
          p_order_id: string;
          p_org_id: string;
        };
        Returns: string;
      };
      is_org_admin: { Args: { check_org_id: string }; Returns: boolean };
      is_org_admin_or_superadmin: {
        Args: { check_org_id: string };
        Returns: boolean;
      };
      is_org_member: { Args: { check_org_id: string }; Returns: boolean };
      is_platform_admin: { Args: never; Returns: boolean };
      rpc_add_cash_session_movement: {
        Args: {
          p_amount: number;
          p_category_key: string;
          p_movement_at?: string;
          p_movement_type: string;
          p_note?: string;
          p_org_id: string;
          p_session_id: string;
        };
        Returns: {
          created_at: string;
          movement_id: string;
        }[];
      };
      rpc_adjust_expiration_batch: {
        Args: { p_batch_id: string; p_new_quantity: number; p_org_id: string };
        Returns: undefined;
      };
      rpc_adjust_stock_manual: {
        Args: {
          p_branch_id: string;
          p_new_quantity_on_hand: number;
          p_org_id: string;
          p_product_id: string;
          p_reason: string;
        };
        Returns: {
          movement_id: string;
          resulting_quantity_on_hand: number;
        }[];
      };
      rpc_bootstrap_platform_admin: { Args: never; Returns: undefined };
      rpc_close_cash_session: {
        Args: {
          p_close_confirmed?: boolean;
          p_close_note?: string;
          p_closed_controlled_by_name?: string;
          p_closing_drawer_count_lines?: Json;
          p_closing_reserve_count_lines?: Json;
          p_org_id: string;
          p_session_id: string;
        };
        Returns: {
          closed_at: string;
          counted_cash_amount: number;
          difference_amount: number;
          expected_cash_amount: number;
          session_id: string;
        }[];
      };
      rpc_create_expiration_batch_manual: {
        Args: {
          p_branch_id: string;
          p_expires_on: string;
          p_org_id: string;
          p_product_id: string;
          p_quantity: number;
          p_source_ref_id: string;
        };
        Returns: {
          batch_id: string;
        }[];
      };
      rpc_create_sale: {
        Args: {
          p_apply_cash_discount?: boolean;
          p_branch_id: string;
          p_cash_discount_pct?: number;
          p_close_special_order?: boolean;
          p_items: Json;
          p_org_id: string;
          p_payment_method: Database['public']['Enums']['payment_method'];
          p_payments?: Json;
          p_special_order_id?: string;
        };
        Returns: {
          created_at: string;
          sale_id: string;
          total: number;
        }[];
      };
      rpc_create_special_order: {
        Args: {
          p_branch_id: string;
          p_client_id: string;
          p_items: Json;
          p_notes: string;
          p_org_id: string;
        };
        Returns: {
          special_order_id: string;
        }[];
      };
      rpc_create_supplier_order: {
        Args: {
          p_branch_id: string;
          p_notes: string;
          p_org_id: string;
          p_supplier_id: string;
        };
        Returns: {
          order_id: string;
        }[];
      };
      rpc_get_active_org_id: { Args: never; Returns: string };
      rpc_get_cash_session_summary: {
        Args: { p_org_id: string; p_session_id: string };
        Returns: {
          branch_id: string;
          cash_sales_amount: number;
          close_confirmed: boolean;
          close_note: string;
          closed_at: string;
          closed_by: string;
          closed_controlled_by_name: string;
          closing_drawer_amount: number;
          closing_reserve_amount: number;
          counted_cash_amount: number;
          difference_amount: number;
          expected_cash_amount: number;
          manual_expense_amount: number;
          manual_income_amount: number;
          movements_count: number;
          opened_at: string;
          opened_by: string;
          opening_cash_amount: number;
          opening_reserve_amount: number;
          period_type: string;
          session_id: string;
          session_label: string;
          status: string;
        }[];
      };
      rpc_get_client_detail: {
        Args: { p_client_id: string; p_org_id: string };
        Returns: {
          client_id: string;
          email: string;
          fulfilled_qty: number;
          is_active: boolean;
          item_id: string;
          name: string;
          notes: string;
          phone: string;
          product_id: string;
          product_name: string;
          requested_qty: number;
          special_order_branch_id: string;
          special_order_created_at: string;
          special_order_id: string;
          special_order_notes: string;
          special_order_status: Database['public']['Enums']['special_order_status'];
          supplier_id: string;
          supplier_name: string;
        }[];
      };
      rpc_get_dashboard_admin: {
        Args: { p_branch_id: string; p_org_id: string };
        Returns: {
          branch_id: string;
          cash_discount_today_total: number;
          cash_discounted_sales_today_count: number;
          cash_sales_today_count: number;
          cash_sales_today_total: number;
          client_orders_pending_count: number;
          expirations_critical_count: number;
          expirations_warning_count: number;
          org_id: string;
          sales_month_total: number;
          sales_today_count: number;
          sales_today_total: number;
          sales_week_total: number;
          supplier_orders_pending_count: number;
        }[];
      };
      rpc_get_special_order_for_pos: {
        Args: { p_org_id: string; p_special_order_id: string };
        Returns: {
          branch_id: string;
          client_id: string;
          client_name: string;
          product_id: string;
          product_name: string;
          remaining_qty: number;
          sell_unit_type: Database['public']['Enums']['sell_unit_type'];
          special_order_id: string;
          unit_price: number;
          uom: string;
        }[];
      };
      rpc_get_staff_effective_modules: {
        Args: never;
        Returns: {
          branch_id: string;
          is_enabled: boolean;
          module_key: string;
          org_id: string;
          source_scope: string;
        }[];
      };
      rpc_get_staff_module_access: {
        Args: { p_branch_id: string; p_org_id: string };
        Returns: {
          is_enabled: boolean;
          module_key: string;
          source_scope: string;
        }[];
      };
      rpc_invite_user_to_org: {
        Args: {
          p_branch_ids: string[];
          p_email: string;
          p_org_id: string;
          p_role: Database['public']['Enums']['user_role'];
        };
        Returns: {
          user_id: string;
        }[];
      };
      rpc_list_clients: {
        Args: {
          p_branch_id: string;
          p_limit: number;
          p_offset: number;
          p_org_id: string;
          p_search: string;
        };
        Returns: {
          active_special_orders_count: number;
          client_id: string;
          email: string;
          name: string;
          phone: string;
        }[];
      };
      rpc_log_audit_event: {
        Args: {
          p_action_key: string;
          p_actor_user_id?: string;
          p_branch_id: string;
          p_entity_id: string;
          p_entity_type: string;
          p_metadata: Json;
          p_org_id: string;
        };
        Returns: undefined;
      };
      rpc_mark_special_order_items_ordered: {
        Args: {
          p_item_ids: string[];
          p_org_id: string;
          p_supplier_order_id: string;
        };
        Returns: undefined;
      };
      rpc_move_expiration_batch_to_waste: {
        Args: { p_batch_id: string; p_expected_qty: number; p_org_id: string };
        Returns: {
          total_amount: number;
          waste_id: string;
        }[];
      };
      rpc_open_cash_session: {
        Args: {
          p_branch_id: string;
          p_opening_drawer_count_lines?: Json;
          p_opening_reserve_count_lines?: Json;
          p_org_id: string;
          p_period_type?: string;
          p_session_label?: string;
        };
        Returns: {
          opened_at: string;
          session_id: string;
        }[];
      };
      rpc_receive_supplier_order:
        | {
            Args: { p_items: Json; p_order_id: string; p_org_id: string };
            Returns: undefined;
          }
        | {
            Args: {
              p_controlled_by_name?: string;
              p_controlled_by_user_id?: string;
              p_items: Json;
              p_order_id: string;
              p_org_id: string;
              p_received_at?: string;
            };
            Returns: undefined;
          };
      rpc_reconcile_supplier_order:
        | { Args: { p_order_id: string; p_org_id: string }; Returns: undefined }
        | {
            Args: {
              p_controlled_by_name?: string;
              p_controlled_by_user_id?: string;
              p_order_id: string;
              p_org_id: string;
            };
            Returns: undefined;
          };
      rpc_register_supplier_payment: {
        Args: {
          p_amount: number;
          p_note?: string;
          p_org_id: string;
          p_paid_at?: string;
          p_payable_id: string;
          p_payment_method: Database['public']['Enums']['payment_method'];
          p_reference?: string;
          p_transfer_account_id?: string;
        };
        Returns: {
          outstanding_amount: number;
          payable_status: string;
          payment_id: string;
        }[];
      };
      rpc_remove_supplier_order_item: {
        Args: { p_order_id: string; p_org_id: string; p_product_id: string };
        Returns: undefined;
      };
      rpc_remove_supplier_product: {
        Args: { p_org_id: string; p_product_id: string; p_supplier_id: string };
        Returns: undefined;
      };
      rpc_remove_supplier_product_relation: {
        Args: {
          p_org_id: string;
          p_product_id: string;
          p_relation_type: Database['public']['Enums']['supplier_product_relation_type'];
        };
        Returns: undefined;
      };
      rpc_set_safety_stock: {
        Args: {
          p_branch_id: string;
          p_org_id: string;
          p_product_id: string;
          p_safety_stock: number;
        };
        Returns: undefined;
      };
      rpc_set_special_order_status: {
        Args: {
          p_org_id: string;
          p_special_order_id: string;
          p_status: Database['public']['Enums']['special_order_status'];
        };
        Returns: undefined;
      };
      rpc_set_staff_module_access: {
        Args: {
          p_branch_id: string;
          p_is_enabled: boolean;
          p_module_key: string;
          p_org_id: string;
          p_role: Database['public']['Enums']['user_role'];
        };
        Returns: undefined;
      };
      rpc_set_supplier_order_expected_receive_on: {
        Args: {
          p_expected_receive_on: string;
          p_order_id: string;
          p_org_id: string;
        };
        Returns: undefined;
      };
      rpc_set_supplier_order_status: {
        Args: {
          p_order_id: string;
          p_org_id: string;
          p_status: Database['public']['Enums']['supplier_order_status'];
        };
        Returns: undefined;
      };
      rpc_set_supplier_payment_account_active: {
        Args: { p_account_id: string; p_is_active: boolean; p_org_id: string };
        Returns: undefined;
      };
      rpc_superadmin_create_org: {
        Args: {
          p_initial_branch_address?: string;
          p_initial_branch_name?: string;
          p_org_name: string;
          p_owner_display_name?: string;
          p_owner_user_id?: string;
          p_timezone?: string;
        };
        Returns: {
          branch_id: string;
          org_id: string;
          owner_user_id: string;
        }[];
      };
      rpc_superadmin_set_active_org: {
        Args: { p_org_id: string };
        Returns: undefined;
      };
      rpc_superadmin_upsert_branch: {
        Args: {
          p_address?: string;
          p_branch_id: string;
          p_is_active?: boolean;
          p_name: string;
          p_org_id: string;
        };
        Returns: {
          branch_id: string;
        }[];
      };
      rpc_sync_supplier_payable_from_order: {
        Args: { p_order_id: string; p_org_id: string };
        Returns: {
          payable_id: string;
        }[];
      };
      rpc_update_expiration_batch_date: {
        Args: {
          p_batch_id: string;
          p_new_expires_on: string;
          p_org_id: string;
          p_reason: string;
        };
        Returns: undefined;
      };
      rpc_update_supplier_payable: {
        Args: {
          p_due_on?: string;
          p_invoice_amount?: number;
          p_invoice_note?: string;
          p_invoice_photo_url?: string;
          p_org_id: string;
          p_payable_id: string;
          p_selected_payment_method?: Database['public']['Enums']['payment_method'];
        };
        Returns: {
          outstanding_amount: number;
          payable_id: string;
          status: string;
        }[];
      };
      rpc_update_user_membership: {
        Args: {
          p_branch_ids: string[];
          p_display_name: string;
          p_is_active: boolean;
          p_org_id: string;
          p_role: Database['public']['Enums']['user_role'];
          p_user_id: string;
        };
        Returns: undefined;
      };
      rpc_upsert_branch: {
        Args: {
          p_address: string;
          p_branch_id: string;
          p_is_active: boolean;
          p_name: string;
          p_org_id: string;
        };
        Returns: {
          branch_id: string;
        }[];
      };
      rpc_upsert_client: {
        Args: {
          p_client_id: string;
          p_email: string;
          p_is_active: boolean;
          p_name: string;
          p_notes: string;
          p_org_id: string;
          p_phone: string;
        };
        Returns: {
          client_id: string;
        }[];
      };
      rpc_upsert_product:
        | {
            Args: {
              p_barcode: string;
              p_internal_code: string;
              p_is_active: boolean;
              p_name: string;
              p_org_id: string;
              p_product_id: string;
              p_sell_unit_type: Database['public']['Enums']['sell_unit_type'];
              p_unit_price: number;
              p_uom: string;
            };
            Returns: {
              product_id: string;
            }[];
          }
        | {
            Args: {
              p_barcode: string;
              p_internal_code: string;
              p_is_active: boolean;
              p_name: string;
              p_org_id: string;
              p_product_id: string;
              p_sell_unit_type: Database['public']['Enums']['sell_unit_type'];
              p_shelf_life_days?: number;
              p_unit_price: number;
              p_uom: string;
            };
            Returns: {
              product_id: string;
            }[];
          };
      rpc_upsert_supplier:
        | {
            Args: {
              p_contact_name: string;
              p_email: string;
              p_is_active: boolean;
              p_name: string;
              p_notes: string;
              p_org_id: string;
              p_phone: string;
              p_supplier_id: string;
            };
            Returns: {
              supplier_id: string;
            }[];
          }
        | {
            Args: {
              p_contact_name: string;
              p_email: string;
              p_is_active: boolean;
              p_name: string;
              p_notes: string;
              p_order_day?: Database['public']['Enums']['weekday'];
              p_order_frequency?: Database['public']['Enums']['order_frequency'];
              p_org_id: string;
              p_phone: string;
              p_receive_day?: Database['public']['Enums']['weekday'];
              p_supplier_id: string;
            };
            Returns: {
              supplier_id: string;
            }[];
          }
        | {
            Args: {
              p_accepts_cash?: boolean;
              p_accepts_transfer?: boolean;
              p_contact_name: string;
              p_email: string;
              p_is_active: boolean;
              p_name: string;
              p_notes: string;
              p_order_day?: Database['public']['Enums']['weekday'];
              p_order_frequency?: Database['public']['Enums']['order_frequency'];
              p_org_id: string;
              p_payment_note?: string;
              p_payment_terms_days?: number;
              p_phone: string;
              p_preferred_payment_method?: Database['public']['Enums']['payment_method'];
              p_receive_day?: Database['public']['Enums']['weekday'];
              p_supplier_id: string;
            };
            Returns: {
              supplier_id: string;
            }[];
          };
      rpc_upsert_supplier_order_item: {
        Args: {
          p_order_id: string;
          p_ordered_qty: number;
          p_org_id: string;
          p_product_id: string;
          p_unit_cost: number;
        };
        Returns: {
          order_item_id: string;
        }[];
      };
      rpc_upsert_supplier_payment_account: {
        Args: {
          p_account_holder_name?: string;
          p_account_id?: string;
          p_account_identifier?: string;
          p_account_label?: string;
          p_bank_name?: string;
          p_is_active?: boolean;
          p_org_id: string;
          p_supplier_id: string;
        };
        Returns: {
          account_id: string;
        }[];
      };
      rpc_upsert_supplier_product:
        | {
            Args: {
              p_org_id: string;
              p_product_id: string;
              p_supplier_id: string;
              p_supplier_product_name: string;
              p_supplier_sku: string;
            };
            Returns: {
              id: string;
            }[];
          }
        | {
            Args: {
              p_org_id: string;
              p_product_id: string;
              p_relation_type?: Database['public']['Enums']['supplier_product_relation_type'];
              p_supplier_id: string;
              p_supplier_product_name: string;
              p_supplier_sku: string;
            };
            Returns: {
              id: string;
            }[];
          };
    };
    Enums: {
      order_frequency: 'weekly' | 'biweekly' | 'every_3_weeks' | 'monthly';
      payment_method:
        | 'cash'
        | 'debit'
        | 'credit'
        | 'transfer'
        | 'other'
        | 'mixed';
      sell_unit_type: 'unit' | 'weight' | 'bulk';
      special_order_status:
        | 'pending'
        | 'ordered'
        | 'received'
        | 'delivered'
        | 'partial'
        | 'cancelled';
      stock_movement_type:
        | 'sale'
        | 'purchase'
        | 'manual_adjustment'
        | 'expiration_adjustment';
      supplier_order_status: 'draft' | 'sent' | 'received' | 'reconciled';
      supplier_product_relation_type: 'primary' | 'secondary';
      user_role: 'superadmin' | 'org_admin' | 'staff';
      weekday: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      order_frequency: ['weekly', 'biweekly', 'every_3_weeks', 'monthly'],
      payment_method: ['cash', 'debit', 'credit', 'transfer', 'other', 'mixed'],
      sell_unit_type: ['unit', 'weight', 'bulk'],
      special_order_status: [
        'pending',
        'ordered',
        'received',
        'delivered',
        'partial',
        'cancelled',
      ],
      stock_movement_type: [
        'sale',
        'purchase',
        'manual_adjustment',
        'expiration_adjustment',
      ],
      supplier_order_status: ['draft', 'sent', 'received', 'reconciled'],
      supplier_product_relation_type: ['primary', 'secondary'],
      user_role: ['superadmin', 'org_admin', 'staff'],
      weekday: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    },
  },
} as const;
