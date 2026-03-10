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
          fiscal_ticket_note_text: string | null;
          id: string;
          is_active: boolean;
          name: string;
          org_id: string;
          storefront_slug: string | null;
          storefront_whatsapp_phone: string | null;
          ticket_font_size_px: number;
          ticket_footer_text: string | null;
          ticket_header_text: string | null;
          ticket_line_height: number;
          ticket_margin_bottom_mm: number;
          ticket_margin_left_mm: number;
          ticket_margin_right_mm: number;
          ticket_margin_top_mm: number;
          ticket_paper_width_mm: number;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          fiscal_ticket_note_text?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          org_id: string;
          storefront_slug?: string | null;
          storefront_whatsapp_phone?: string | null;
          ticket_font_size_px?: number;
          ticket_footer_text?: string | null;
          ticket_header_text?: string | null;
          ticket_line_height?: number;
          ticket_margin_bottom_mm?: number;
          ticket_margin_left_mm?: number;
          ticket_margin_right_mm?: number;
          ticket_margin_top_mm?: number;
          ticket_paper_width_mm?: number;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          fiscal_ticket_note_text?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          org_id?: string;
          storefront_slug?: string | null;
          storefront_whatsapp_phone?: string | null;
          ticket_font_size_px?: number;
          ticket_footer_text?: string | null;
          ticket_header_text?: string | null;
          ticket_line_height?: number;
          ticket_margin_bottom_mm?: number;
          ticket_margin_left_mm?: number;
          ticket_margin_right_mm?: number;
          ticket_margin_top_mm?: number;
          ticket_paper_width_mm?: number;
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
          supplier_payment_id: string | null;
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
          supplier_payment_id?: string | null;
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
          supplier_payment_id?: string | null;
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
          {
            foreignKeyName: 'cash_session_movements_supplier_payment_id_fkey';
            columns: ['supplier_payment_id'];
            isOneToOne: false;
            referencedRelation: 'supplier_payments';
            referencedColumns: ['id'];
          },
        ];
      };
      cash_session_reconciliation_inputs: {
        Row: {
          branch_id: string;
          created_at: string;
          created_by: string;
          id: string;
          org_id: string;
          reported_amount: number;
          row_key: string;
          session_id: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          branch_id: string;
          created_at?: string;
          created_by: string;
          id?: string;
          org_id: string;
          reported_amount: number;
          row_key: string;
          session_id: string;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          branch_id?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          org_id?: string;
          reported_amount?: number;
          row_key?: string;
          session_id?: string;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cash_session_reconciliation_inputs_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cash_session_reconciliation_inputs_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'cash_session_reconciliation_inputs_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'cash_session_reconciliation_inputs_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'cash_session_reconciliation_inputs_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'cash_session_reconciliation_inputs_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cash_session_reconciliation_inputs_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'cash_session_reconciliation_inputs_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'cash_session_reconciliation_inputs_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'cash_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cash_session_reconciliation_inputs_session_id_fkey';
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
          opened_controlled_by_name: string | null;
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
          opened_controlled_by_name?: string | null;
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
          opened_controlled_by_name?: string | null;
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
            referencedRelation: 'v_products_incomplete_admin';
            referencedColumns: ['id'];
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
      data_import_jobs: {
        Row: {
          applied_rows: number;
          created_at: string;
          created_by: string;
          errors_summary: Json | null;
          id: string;
          invalid_rows: number;
          org_id: string;
          source_file_name: string;
          source_file_path: string | null;
          status: string;
          template_key: string;
          total_rows: number;
          updated_at: string;
          valid_rows: number;
        };
        Insert: {
          applied_rows?: number;
          created_at?: string;
          created_by: string;
          errors_summary?: Json | null;
          id?: string;
          invalid_rows?: number;
          org_id: string;
          source_file_name: string;
          source_file_path?: string | null;
          status?: string;
          template_key: string;
          total_rows?: number;
          updated_at?: string;
          valid_rows?: number;
        };
        Update: {
          applied_rows?: number;
          created_at?: string;
          created_by?: string;
          errors_summary?: Json | null;
          id?: string;
          invalid_rows?: number;
          org_id?: string;
          source_file_name?: string;
          source_file_path?: string | null;
          status?: string;
          template_key?: string;
          total_rows?: number;
          updated_at?: string;
          valid_rows?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'data_import_jobs_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'data_import_jobs_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'data_import_jobs_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      data_import_rows: {
        Row: {
          applied_at: string | null;
          created_at: string;
          id: string;
          is_valid: boolean;
          job_id: string;
          normalized_payload: Json | null;
          org_id: string;
          raw_payload: Json;
          row_number: number;
          updated_at: string;
          validation_errors: Json | null;
        };
        Insert: {
          applied_at?: string | null;
          created_at?: string;
          id?: string;
          is_valid?: boolean;
          job_id: string;
          normalized_payload?: Json | null;
          org_id: string;
          raw_payload: Json;
          row_number: number;
          updated_at?: string;
          validation_errors?: Json | null;
        };
        Update: {
          applied_at?: string | null;
          created_at?: string;
          id?: string;
          is_valid?: boolean;
          job_id?: string;
          normalized_payload?: Json | null;
          org_id?: string;
          raw_payload?: Json;
          row_number?: number;
          updated_at?: string;
          validation_errors?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'data_import_rows_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'data_import_jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'data_import_rows_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'data_import_rows_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'data_import_rows_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      employee_accounts: {
        Row: {
          branch_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          org_id: string;
          updated_at: string;
        };
        Insert: {
          branch_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          org_id: string;
          updated_at?: string;
        };
        Update: {
          branch_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          org_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'employee_accounts_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employee_accounts_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'employee_accounts_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'employee_accounts_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'employee_accounts_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'employee_accounts_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employee_accounts_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'employee_accounts_org_id_fkey';
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
            referencedRelation: 'v_products_incomplete_admin';
            referencedColumns: ['id'];
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
            referencedRelation: 'v_products_incomplete_admin';
            referencedColumns: ['id'];
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
      fiscal_credentials: {
        Row: {
          alias: string | null;
          certificate_pem: string;
          created_at: string;
          encrypted_private_key: string;
          encryption_key_reference: string;
          environment: string;
          id: string;
          last_ta_obtained_at: string | null;
          status: string;
          ta_expires_at: string | null;
          taxpayer_cuit: string;
          tenant_id: string;
          updated_at: string;
          wsaa_service_name: string;
          wsfe_service_name: string;
        };
        Insert: {
          alias?: string | null;
          certificate_pem: string;
          created_at?: string;
          encrypted_private_key: string;
          encryption_key_reference: string;
          environment: string;
          id?: string;
          last_ta_obtained_at?: string | null;
          status?: string;
          ta_expires_at?: string | null;
          taxpayer_cuit: string;
          tenant_id: string;
          updated_at?: string;
          wsaa_service_name?: string;
          wsfe_service_name?: string;
        };
        Update: {
          alias?: string | null;
          certificate_pem?: string;
          created_at?: string;
          encrypted_private_key?: string;
          encryption_key_reference?: string;
          environment?: string;
          id?: string;
          last_ta_obtained_at?: string | null;
          status?: string;
          ta_expires_at?: string | null;
          taxpayer_cuit?: string;
          tenant_id?: string;
          updated_at?: string;
          wsaa_service_name?: string;
          wsfe_service_name?: string;
        };
        Relationships: [];
      };
      fiscal_sequences: {
        Row: {
          cbte_tipo: number;
          created_at: string;
          environment: string;
          id: string;
          last_arca_confirmed: number;
          last_local_reserved: number;
          last_reconciled_at: string | null;
          pto_vta: number;
          status: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          cbte_tipo: number;
          created_at?: string;
          environment: string;
          id?: string;
          last_arca_confirmed?: number;
          last_local_reserved?: number;
          last_reconciled_at?: string | null;
          pto_vta: number;
          status?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          cbte_tipo?: number;
          created_at?: string;
          environment?: string;
          id?: string;
          last_arca_confirmed?: number;
          last_local_reserved?: number;
          last_reconciled_at?: string | null;
          pto_vta?: number;
          status?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      invoice_events: {
        Row: {
          created_at: string;
          event_payload_json: Json | null;
          event_type: string;
          id: string;
          invoice_job_id: string;
          tenant_id: string;
        };
        Insert: {
          created_at?: string;
          event_payload_json?: Json | null;
          event_type: string;
          id?: string;
          invoice_job_id: string;
          tenant_id: string;
        };
        Update: {
          created_at?: string;
          event_payload_json?: Json | null;
          event_type?: string;
          id?: string;
          invoice_job_id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invoice_events_invoice_job_id_fkey';
            columns: ['invoice_job_id'];
            isOneToOne: false;
            referencedRelation: 'invoice_jobs';
            referencedColumns: ['id'];
          },
        ];
      };
      invoice_jobs: {
        Row: {
          attempt_count: number;
          authorized_at: string | null;
          cbte_nro: number | null;
          cbte_tipo: number;
          correlation_id: string;
          created_at: string;
          environment: string;
          id: string;
          job_status: string;
          last_error_code: string | null;
          last_error_message: string | null;
          point_of_sale_id: string | null;
          pto_vta: number;
          requested_payload_json: Json | null;
          response_payload_json: Json | null;
          sale_document_id: string;
          sale_id: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          attempt_count?: number;
          authorized_at?: string | null;
          cbte_nro?: number | null;
          cbte_tipo: number;
          correlation_id?: string;
          created_at?: string;
          environment: string;
          id?: string;
          job_status?: string;
          last_error_code?: string | null;
          last_error_message?: string | null;
          point_of_sale_id?: string | null;
          pto_vta: number;
          requested_payload_json?: Json | null;
          response_payload_json?: Json | null;
          sale_document_id: string;
          sale_id: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          attempt_count?: number;
          authorized_at?: string | null;
          cbte_nro?: number | null;
          cbte_tipo?: number;
          correlation_id?: string;
          created_at?: string;
          environment?: string;
          id?: string;
          job_status?: string;
          last_error_code?: string | null;
          last_error_message?: string | null;
          point_of_sale_id?: string | null;
          pto_vta?: number;
          requested_payload_json?: Json | null;
          response_payload_json?: Json | null;
          sale_document_id?: string;
          sale_id?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invoice_jobs_point_of_sale_id_fkey';
            columns: ['point_of_sale_id'];
            isOneToOne: false;
            referencedRelation: 'points_of_sale';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoice_jobs_sale_document_id_fkey';
            columns: ['sale_document_id'];
            isOneToOne: false;
            referencedRelation: 'sale_documents';
            referencedColumns: ['id'];
          },
        ];
      };
      invoices: {
        Row: {
          afip_events_json: Json | null;
          afip_observations_json: Json | null;
          cae: string | null;
          cae_expires_at: string | null;
          cbte_nro: number;
          cbte_tipo: number;
          created_at: string;
          currency: string;
          currency_rate: number;
          doc_nro: number;
          doc_tipo: number;
          environment: string;
          id: string;
          imp_iva: number;
          imp_neto: number;
          imp_op_ex: number;
          imp_tot_conc: number;
          imp_total: number;
          imp_trib: number;
          invoice_job_id: string;
          pdf_storage_path: string | null;
          point_of_sale_id: string | null;
          pto_vta: number;
          qr_payload_json: Json | null;
          raw_request_json: Json | null;
          raw_response_json: Json | null;
          result_status: string;
          sale_id: string;
          tenant_id: string;
          ticket_storage_path: string | null;
          updated_at: string;
        };
        Insert: {
          afip_events_json?: Json | null;
          afip_observations_json?: Json | null;
          cae?: string | null;
          cae_expires_at?: string | null;
          cbte_nro: number;
          cbte_tipo: number;
          created_at?: string;
          currency?: string;
          currency_rate?: number;
          doc_nro?: number;
          doc_tipo: number;
          environment: string;
          id?: string;
          imp_iva?: number;
          imp_neto?: number;
          imp_op_ex?: number;
          imp_tot_conc?: number;
          imp_total: number;
          imp_trib?: number;
          invoice_job_id: string;
          pdf_storage_path?: string | null;
          point_of_sale_id?: string | null;
          pto_vta: number;
          qr_payload_json?: Json | null;
          raw_request_json?: Json | null;
          raw_response_json?: Json | null;
          result_status?: string;
          sale_id: string;
          tenant_id: string;
          ticket_storage_path?: string | null;
          updated_at?: string;
        };
        Update: {
          afip_events_json?: Json | null;
          afip_observations_json?: Json | null;
          cae?: string | null;
          cae_expires_at?: string | null;
          cbte_nro?: number;
          cbte_tipo?: number;
          created_at?: string;
          currency?: string;
          currency_rate?: number;
          doc_nro?: number;
          doc_tipo?: number;
          environment?: string;
          id?: string;
          imp_iva?: number;
          imp_neto?: number;
          imp_op_ex?: number;
          imp_tot_conc?: number;
          imp_total?: number;
          imp_trib?: number;
          invoice_job_id?: string;
          pdf_storage_path?: string | null;
          point_of_sale_id?: string | null;
          pto_vta?: number;
          qr_payload_json?: Json | null;
          raw_request_json?: Json | null;
          raw_response_json?: Json | null;
          result_status?: string;
          sale_id?: string;
          tenant_id?: string;
          ticket_storage_path?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invoices_invoice_job_id_fkey';
            columns: ['invoice_job_id'];
            isOneToOne: false;
            referencedRelation: 'invoice_jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_point_of_sale_id_fkey';
            columns: ['point_of_sale_id'];
            isOneToOne: false;
            referencedRelation: 'points_of_sale';
            referencedColumns: ['id'];
          },
        ];
      };
      online_order_items: {
        Row: {
          created_at: string;
          id: string;
          line_total: number;
          online_order_id: string;
          org_id: string;
          product_id: string;
          product_name_snapshot: string;
          quantity: number;
          unit_price_snapshot: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          line_total: number;
          online_order_id: string;
          org_id: string;
          product_id: string;
          product_name_snapshot: string;
          quantity: number;
          unit_price_snapshot: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          line_total?: number;
          online_order_id?: string;
          org_id?: string;
          product_id?: string;
          product_name_snapshot?: string;
          quantity?: number;
          unit_price_snapshot?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'online_order_items_online_order_id_fkey';
            columns: ['online_order_id'];
            isOneToOne: false;
            referencedRelation: 'online_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'online_order_items_online_order_id_fkey';
            columns: ['online_order_id'];
            isOneToOne: false;
            referencedRelation: 'v_online_orders_admin';
            referencedColumns: ['online_order_id'];
          },
          {
            foreignKeyName: 'online_order_items_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'online_order_items_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'online_order_items_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'online_order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'online_order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'online_order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_admin';
            referencedColumns: ['product_id'];
          },
          {
            foreignKeyName: 'online_order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_incomplete_admin';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'online_order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_typeahead_admin';
            referencedColumns: ['product_id'];
          },
        ];
      };
      online_order_payment_proofs: {
        Row: {
          id: string;
          online_order_id: string;
          org_id: string;
          review_note: string | null;
          review_status: Database['public']['Enums']['online_proof_review_status'];
          reviewed_at: string | null;
          reviewed_by_user_id: string | null;
          storage_path: string;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          online_order_id: string;
          org_id: string;
          review_note?: string | null;
          review_status?: Database['public']['Enums']['online_proof_review_status'];
          reviewed_at?: string | null;
          reviewed_by_user_id?: string | null;
          storage_path: string;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          online_order_id?: string;
          org_id?: string;
          review_note?: string | null;
          review_status?: Database['public']['Enums']['online_proof_review_status'];
          reviewed_at?: string | null;
          reviewed_by_user_id?: string | null;
          storage_path?: string;
          uploaded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'online_order_payment_proofs_online_order_id_fkey';
            columns: ['online_order_id'];
            isOneToOne: false;
            referencedRelation: 'online_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'online_order_payment_proofs_online_order_id_fkey';
            columns: ['online_order_id'];
            isOneToOne: false;
            referencedRelation: 'v_online_orders_admin';
            referencedColumns: ['online_order_id'];
          },
          {
            foreignKeyName: 'online_order_payment_proofs_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'online_order_payment_proofs_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'online_order_payment_proofs_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      online_order_status_history: {
        Row: {
          changed_at: string;
          changed_by_user_id: string | null;
          customer_note: string | null;
          id: string;
          internal_note: string | null;
          new_status: Database['public']['Enums']['online_order_status'];
          old_status: Database['public']['Enums']['online_order_status'] | null;
          online_order_id: string;
          org_id: string;
        };
        Insert: {
          changed_at?: string;
          changed_by_user_id?: string | null;
          customer_note?: string | null;
          id?: string;
          internal_note?: string | null;
          new_status: Database['public']['Enums']['online_order_status'];
          old_status?:
            | Database['public']['Enums']['online_order_status']
            | null;
          online_order_id: string;
          org_id: string;
        };
        Update: {
          changed_at?: string;
          changed_by_user_id?: string | null;
          customer_note?: string | null;
          id?: string;
          internal_note?: string | null;
          new_status?: Database['public']['Enums']['online_order_status'];
          old_status?:
            | Database['public']['Enums']['online_order_status']
            | null;
          online_order_id?: string;
          org_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'online_order_status_history_online_order_id_fkey';
            columns: ['online_order_id'];
            isOneToOne: false;
            referencedRelation: 'online_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'online_order_status_history_online_order_id_fkey';
            columns: ['online_order_id'];
            isOneToOne: false;
            referencedRelation: 'v_online_orders_admin';
            referencedColumns: ['online_order_id'];
          },
          {
            foreignKeyName: 'online_order_status_history_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'online_order_status_history_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'online_order_status_history_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      online_order_tracking_tokens: {
        Row: {
          created_at: string;
          expires_at: string | null;
          id: string;
          is_active: boolean;
          online_order_id: string;
          org_id: string;
          token: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          online_order_id: string;
          org_id: string;
          token: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          online_order_id?: string;
          org_id?: string;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'online_order_tracking_tokens_online_order_id_fkey';
            columns: ['online_order_id'];
            isOneToOne: false;
            referencedRelation: 'online_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'online_order_tracking_tokens_online_order_id_fkey';
            columns: ['online_order_id'];
            isOneToOne: false;
            referencedRelation: 'v_online_orders_admin';
            referencedColumns: ['online_order_id'];
          },
          {
            foreignKeyName: 'online_order_tracking_tokens_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'online_order_tracking_tokens_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'online_order_tracking_tokens_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      online_orders: {
        Row: {
          branch_id: string;
          cancelled_at: string | null;
          confirmed_at: string | null;
          created_at: string;
          created_by_user_id: string | null;
          customer_address: string | null;
          customer_name: string;
          customer_notes: string | null;
          customer_phone: string;
          delivered_at: string | null;
          id: string;
          order_code: string;
          org_id: string;
          payment_intent: Database['public']['Enums']['online_payment_intent'];
          ready_for_pickup_at: string | null;
          staff_notes: string | null;
          status: Database['public']['Enums']['online_order_status'];
          subtotal_amount: number;
          total_amount: number;
          updated_at: string;
        };
        Insert: {
          branch_id: string;
          cancelled_at?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          customer_address?: string | null;
          customer_name: string;
          customer_notes?: string | null;
          customer_phone: string;
          delivered_at?: string | null;
          id?: string;
          order_code: string;
          org_id: string;
          payment_intent?: Database['public']['Enums']['online_payment_intent'];
          ready_for_pickup_at?: string | null;
          staff_notes?: string | null;
          status?: Database['public']['Enums']['online_order_status'];
          subtotal_amount?: number;
          total_amount?: number;
          updated_at?: string;
        };
        Update: {
          branch_id?: string;
          cancelled_at?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          customer_address?: string | null;
          customer_name?: string;
          customer_notes?: string | null;
          customer_phone?: string;
          delivered_at?: string | null;
          id?: string;
          order_code?: string;
          org_id?: string;
          payment_intent?: Database['public']['Enums']['online_payment_intent'];
          ready_for_pickup_at?: string | null;
          staff_notes?: string | null;
          status?: Database['public']['Enums']['online_order_status'];
          subtotal_amount?: number;
          total_amount?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'online_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'online_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'online_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'online_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'online_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'online_orders_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'online_orders_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'online_orders_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
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
          default_supplier_markup_pct: number;
          employee_discount_combinable_with_cash_discount: boolean;
          employee_discount_default_pct: number;
          employee_discount_enabled: boolean;
          fiscal_prod_enqueue_enabled: boolean;
          fiscal_prod_live_enabled: boolean;
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
          default_supplier_markup_pct?: number;
          employee_discount_combinable_with_cash_discount?: boolean;
          employee_discount_default_pct?: number;
          employee_discount_enabled?: boolean;
          fiscal_prod_enqueue_enabled?: boolean;
          fiscal_prod_live_enabled?: boolean;
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
          default_supplier_markup_pct?: number;
          employee_discount_combinable_with_cash_discount?: boolean;
          employee_discount_default_pct?: number;
          employee_discount_enabled?: boolean;
          fiscal_prod_enqueue_enabled?: boolean;
          fiscal_prod_live_enabled?: boolean;
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
          storefront_slug: string | null;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          storefront_slug?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          storefront_slug?: string | null;
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
      points_of_sale: {
        Row: {
          created_at: string;
          description: string | null;
          environment: string;
          id: string;
          invoice_mode: string;
          location_id: string | null;
          pto_vta: number;
          status: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          environment: string;
          id?: string;
          invoice_mode?: string;
          location_id?: string | null;
          pto_vta: number;
          status?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          environment?: string;
          id?: string;
          invoice_mode?: string;
          location_id?: string | null;
          pto_vta?: number;
          status?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pos_payment_devices: {
        Row: {
          branch_id: string;
          created_at: string;
          created_by: string | null;
          device_name: string;
          id: string;
          is_active: boolean;
          org_id: string;
          provider: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          branch_id: string;
          created_at?: string;
          created_by?: string | null;
          device_name: string;
          id?: string;
          is_active?: boolean;
          org_id: string;
          provider?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          branch_id?: string;
          created_at?: string;
          created_by?: string | null;
          device_name?: string;
          id?: string;
          is_active?: boolean;
          org_id?: string;
          provider?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pos_payment_devices_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pos_payment_devices_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'pos_payment_devices_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'pos_payment_devices_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'pos_payment_devices_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'pos_payment_devices_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pos_payment_devices_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'pos_payment_devices_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      print_jobs: {
        Row: {
          attempt_count: number;
          created_at: string;
          format: string;
          id: string;
          invoice_id: string;
          last_error: string | null;
          printer_target: string | null;
          status: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          attempt_count?: number;
          created_at?: string;
          format?: string;
          id?: string;
          invoice_id: string;
          last_error?: string | null;
          printer_target?: string | null;
          status?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          attempt_count?: number;
          created_at?: string;
          format?: string;
          id?: string;
          invoice_id?: string;
          last_error?: string | null;
          printer_target?: string | null;
          status?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'print_jobs_invoice_id_fkey';
            columns: ['invoice_id'];
            isOneToOne: false;
            referencedRelation: 'invoices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'print_jobs_invoice_id_fkey';
            columns: ['invoice_id'];
            isOneToOne: false;
            referencedRelation: 'v_sale_fiscal_invoice_admin';
            referencedColumns: ['invoice_id'];
          },
        ];
      };
      products: {
        Row: {
          barcode: string | null;
          barcode_normalized: string | null;
          brand: string | null;
          created_at: string;
          id: string;
          image_url: string | null;
          internal_code: string | null;
          is_active: boolean;
          name: string;
          name_normalized: string | null;
          org_id: string;
          purchase_by_pack: boolean;
          sell_unit_type: Database['public']['Enums']['sell_unit_type'];
          shelf_life_days: number | null;
          unit_price: number;
          units_per_pack: number | null;
          uom: string;
          updated_at: string;
        };
        Insert: {
          barcode?: string | null;
          barcode_normalized?: string | null;
          brand?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          internal_code?: string | null;
          is_active?: boolean;
          name: string;
          name_normalized?: string | null;
          org_id: string;
          purchase_by_pack?: boolean;
          sell_unit_type: Database['public']['Enums']['sell_unit_type'];
          shelf_life_days?: number | null;
          unit_price?: number;
          units_per_pack?: number | null;
          uom: string;
          updated_at?: string;
        };
        Update: {
          barcode?: string | null;
          barcode_normalized?: string | null;
          brand?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          internal_code?: string | null;
          is_active?: boolean;
          name?: string;
          name_normalized?: string | null;
          org_id?: string;
          purchase_by_pack?: boolean;
          sell_unit_type?: Database['public']['Enums']['sell_unit_type'];
          shelf_life_days?: number | null;
          unit_price?: number;
          units_per_pack?: number | null;
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
      sale_delivery_events: {
        Row: {
          actor_user_id: string | null;
          channel: string | null;
          created_at: string;
          document_kind: Database['public']['Enums']['sale_delivery_document_kind'];
          event_kind: string;
          id: string;
          metadata: Json;
          org_id: string;
          sale_delivery_link_id: string | null;
          sale_id: string;
        };
        Insert: {
          actor_user_id?: string | null;
          channel?: string | null;
          created_at?: string;
          document_kind: Database['public']['Enums']['sale_delivery_document_kind'];
          event_kind: string;
          id?: string;
          metadata?: Json;
          org_id: string;
          sale_delivery_link_id?: string | null;
          sale_id: string;
        };
        Update: {
          actor_user_id?: string | null;
          channel?: string | null;
          created_at?: string;
          document_kind?: Database['public']['Enums']['sale_delivery_document_kind'];
          event_kind?: string;
          id?: string;
          metadata?: Json;
          org_id?: string;
          sale_delivery_link_id?: string | null;
          sale_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sale_delivery_events_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sale_delivery_events_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'sale_delivery_events_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'sale_delivery_events_sale_delivery_link_id_fkey';
            columns: ['sale_delivery_link_id'];
            isOneToOne: false;
            referencedRelation: 'sale_delivery_links';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sale_delivery_events_sale_id_fkey';
            columns: ['sale_id'];
            isOneToOne: false;
            referencedRelation: 'sales';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sale_delivery_events_sale_id_fkey';
            columns: ['sale_id'];
            isOneToOne: false;
            referencedRelation: 'v_sale_detail_admin';
            referencedColumns: ['sale_id'];
          },
          {
            foreignKeyName: 'sale_delivery_events_sale_id_fkey';
            columns: ['sale_id'];
            isOneToOne: false;
            referencedRelation: 'v_sales_admin';
            referencedColumns: ['sale_id'];
          },
          {
            foreignKeyName: 'sale_delivery_events_sale_id_fkey';
            columns: ['sale_id'];
            isOneToOne: false;
            referencedRelation: 'v_sales_statistics_items';
            referencedColumns: ['sale_id'];
          },
        ];
      };
      sale_delivery_links: {
        Row: {
          created_at: string;
          created_by_user_id: string | null;
          document_kind: Database['public']['Enums']['sale_delivery_document_kind'];
          expires_at: string | null;
          id: string;
          last_shared_at: string | null;
          last_shared_channel: string | null;
          org_id: string;
          sale_id: string;
          share_count: number;
          status: Database['public']['Enums']['sale_delivery_link_status'];
          token: string;
        };
        Insert: {
          created_at?: string;
          created_by_user_id?: string | null;
          document_kind: Database['public']['Enums']['sale_delivery_document_kind'];
          expires_at?: string | null;
          id?: string;
          last_shared_at?: string | null;
          last_shared_channel?: string | null;
          org_id: string;
          sale_id: string;
          share_count?: number;
          status?: Database['public']['Enums']['sale_delivery_link_status'];
          token: string;
        };
        Update: {
          created_at?: string;
          created_by_user_id?: string | null;
          document_kind?: Database['public']['Enums']['sale_delivery_document_kind'];
          expires_at?: string | null;
          id?: string;
          last_shared_at?: string | null;
          last_shared_channel?: string | null;
          org_id?: string;
          sale_id?: string;
          share_count?: number;
          status?: Database['public']['Enums']['sale_delivery_link_status'];
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sale_delivery_links_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sale_delivery_links_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'sale_delivery_links_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'sale_delivery_links_sale_id_fkey';
            columns: ['sale_id'];
            isOneToOne: false;
            referencedRelation: 'sales';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sale_delivery_links_sale_id_fkey';
            columns: ['sale_id'];
            isOneToOne: false;
            referencedRelation: 'v_sale_detail_admin';
            referencedColumns: ['sale_id'];
          },
          {
            foreignKeyName: 'sale_delivery_links_sale_id_fkey';
            columns: ['sale_id'];
            isOneToOne: false;
            referencedRelation: 'v_sales_admin';
            referencedColumns: ['sale_id'];
          },
          {
            foreignKeyName: 'sale_delivery_links_sale_id_fkey';
            columns: ['sale_id'];
            isOneToOne: false;
            referencedRelation: 'v_sales_statistics_items';
            referencedColumns: ['sale_id'];
          },
        ];
      };
      sale_documents: {
        Row: {
          created_at: string;
          document_kind: string;
          id: string;
          requested_by_user_id: string | null;
          sale_id: string;
          status: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          document_kind: string;
          id?: string;
          requested_by_user_id?: string | null;
          sale_id: string;
          status?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          document_kind?: string;
          id?: string;
          requested_by_user_id?: string | null;
          sale_id?: string;
          status?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [];
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
            referencedRelation: 'v_products_incomplete_admin';
            referencedColumns: ['id'];
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
          {
            foreignKeyName: 'sale_items_sale_id_fkey';
            columns: ['sale_id'];
            isOneToOne: false;
            referencedRelation: 'v_sale_detail_admin';
            referencedColumns: ['sale_id'];
          },
          {
            foreignKeyName: 'sale_items_sale_id_fkey';
            columns: ['sale_id'];
            isOneToOne: false;
            referencedRelation: 'v_sales_admin';
            referencedColumns: ['sale_id'];
          },
          {
            foreignKeyName: 'sale_items_sale_id_fkey';
            columns: ['sale_id'];
            isOneToOne: false;
            referencedRelation: 'v_sales_statistics_items';
            referencedColumns: ['sale_id'];
          },
        ];
      };
      sale_payments: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          org_id: string;
          payment_device_id: string | null;
          payment_method: Database['public']['Enums']['payment_method'];
          sale_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          org_id: string;
          payment_device_id?: string | null;
          payment_method: Database['public']['Enums']['payment_method'];
          sale_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          org_id?: string;
          payment_device_id?: string | null;
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
            foreignKeyName: 'sale_payments_payment_device_id_fkey';
            columns: ['payment_device_id'];
            isOneToOne: false;
            referencedRelation: 'pos_payment_devices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sale_payments_sale_id_fkey';
            columns: ['sale_id'];
            isOneToOne: false;
            referencedRelation: 'sales';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sale_payments_sale_id_fkey';
            columns: ['sale_id'];
            isOneToOne: false;
            referencedRelation: 'v_sale_detail_admin';
            referencedColumns: ['sale_id'];
          },
          {
            foreignKeyName: 'sale_payments_sale_id_fkey';
            columns: ['sale_id'];
            isOneToOne: false;
            referencedRelation: 'v_sales_admin';
            referencedColumns: ['sale_id'];
          },
          {
            foreignKeyName: 'sale_payments_sale_id_fkey';
            columns: ['sale_id'];
            isOneToOne: false;
            referencedRelation: 'v_sales_statistics_items';
            referencedColumns: ['sale_id'];
          },
        ];
      };
      sales: {
        Row: {
          branch_id: string;
          cash_discount_amount: number;
          cash_discount_pct: number;
          client_id: string | null;
          created_at: string;
          created_by: string;
          discount_amount: number;
          discount_pct: number;
          employee_account_id: string | null;
          employee_discount_amount: number;
          employee_discount_applied: boolean;
          employee_discount_pct: number;
          employee_name_snapshot: string | null;
          id: string;
          invoiced_at: string | null;
          is_invoiced: boolean;
          org_id: string;
          payment_method: Database['public']['Enums']['payment_method'];
          subtotal_amount: number;
          total_amount: number;
        };
        Insert: {
          branch_id: string;
          cash_discount_amount?: number;
          cash_discount_pct?: number;
          client_id?: string | null;
          created_at?: string;
          created_by: string;
          discount_amount?: number;
          discount_pct?: number;
          employee_account_id?: string | null;
          employee_discount_amount?: number;
          employee_discount_applied?: boolean;
          employee_discount_pct?: number;
          employee_name_snapshot?: string | null;
          id?: string;
          invoiced_at?: string | null;
          is_invoiced?: boolean;
          org_id: string;
          payment_method: Database['public']['Enums']['payment_method'];
          subtotal_amount?: number;
          total_amount: number;
        };
        Update: {
          branch_id?: string;
          cash_discount_amount?: number;
          cash_discount_pct?: number;
          client_id?: string | null;
          created_at?: string;
          created_by?: string;
          discount_amount?: number;
          discount_pct?: number;
          employee_account_id?: string | null;
          employee_discount_amount?: number;
          employee_discount_applied?: boolean;
          employee_discount_pct?: number;
          employee_name_snapshot?: string | null;
          id?: string;
          invoiced_at?: string | null;
          is_invoiced?: boolean;
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
            foreignKeyName: 'sales_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sales_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'v_special_order_items_pending';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'sales_employee_account_id_fkey';
            columns: ['employee_account_id'];
            isOneToOne: false;
            referencedRelation: 'employee_accounts';
            referencedColumns: ['id'];
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
            referencedRelation: 'v_products_incomplete_admin';
            referencedColumns: ['id'];
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
            referencedRelation: 'v_products_incomplete_admin';
            referencedColumns: ['id'];
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
      storefront_domains: {
        Row: {
          created_at: string;
          hostname: string;
          id: string;
          is_active: boolean;
          is_primary: boolean;
          org_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          hostname: string;
          id?: string;
          is_active?: boolean;
          is_primary?: boolean;
          org_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          hostname?: string;
          id?: string;
          is_active?: boolean;
          is_primary?: boolean;
          org_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'storefront_domains_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'storefront_domains_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'storefront_domains_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
          },
        ];
      };
      storefront_settings: {
        Row: {
          allow_out_of_stock_order: boolean;
          created_at: string;
          is_enabled: boolean;
          org_id: string;
          pickup_instructions: string | null;
          updated_at: string;
          whatsapp_phone: string | null;
        };
        Insert: {
          allow_out_of_stock_order?: boolean;
          created_at?: string;
          is_enabled?: boolean;
          org_id: string;
          pickup_instructions?: string | null;
          updated_at?: string;
          whatsapp_phone?: string | null;
        };
        Update: {
          allow_out_of_stock_order?: boolean;
          created_at?: string;
          is_enabled?: boolean;
          org_id?: string;
          pickup_instructions?: string | null;
          updated_at?: string;
          whatsapp_phone?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'storefront_settings_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: true;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'storefront_settings_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: true;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'storefront_settings_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: true;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
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
            referencedRelation: 'v_products_incomplete_admin';
            referencedColumns: ['id'];
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
          invoice_reference: string | null;
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
          invoice_reference?: string | null;
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
          invoice_reference?: string | null;
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
          supplier_price: number | null;
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
          supplier_price?: number | null;
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
          supplier_price?: number | null;
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
            referencedRelation: 'v_products_incomplete_admin';
            referencedColumns: ['id'];
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
          default_markup_pct: number;
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
          default_markup_pct?: number;
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
          default_markup_pct?: number;
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
          fiscal_ticket_note_text: string | null;
          is_active: boolean | null;
          members_count: number | null;
          name: string | null;
          org_id: string | null;
          storefront_slug: string | null;
          storefront_whatsapp_phone: string | null;
          ticket_font_size_px: number | null;
          ticket_footer_text: string | null;
          ticket_header_text: string | null;
          ticket_line_height: number | null;
          ticket_margin_bottom_mm: number | null;
          ticket_margin_left_mm: number | null;
          ticket_margin_right_mm: number | null;
          ticket_margin_top_mm: number | null;
          ticket_paper_width_mm: number | null;
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
          card_sales_amount: number | null;
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
          mercadopago_sales_amount: number | null;
          movements_count: number | null;
          opened_at: string | null;
          opened_by: string | null;
          opened_controlled_by_name: string | null;
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
          invoiced_sales_today_count: number | null;
          invoiced_sales_today_total: number | null;
          non_invoiced_sales_today_count: number | null;
          non_invoiced_sales_today_total: number | null;
          org_id: string | null;
          sales_month_total: number | null;
          sales_today_count: number | null;
          sales_today_total: number | null;
          sales_week_total: number | null;
          supplier_orders_pending_count: number | null;
        };
        Relationships: [];
      };
      v_data_onboarding_tasks: {
        Row: {
          last_calculated_at: string | null;
          org_id: string | null;
          pending_count: number | null;
          task_key: string | null;
          task_label: string | null;
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
            referencedRelation: 'v_products_incomplete_admin';
            referencedColumns: ['id'];
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
            referencedRelation: 'v_products_incomplete_admin';
            referencedColumns: ['id'];
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
            referencedRelation: 'v_products_incomplete_admin';
            referencedColumns: ['id'];
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
            referencedRelation: 'v_products_incomplete_admin';
            referencedColumns: ['id'];
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
      v_online_orders_admin: {
        Row: {
          branch_id: string | null;
          branch_name: string | null;
          cancelled_at: string | null;
          confirmed_at: string | null;
          created_at: string | null;
          customer_address: string | null;
          customer_name: string | null;
          customer_notes: string | null;
          customer_phone: string | null;
          delivered_at: string | null;
          has_payment_proof: boolean | null;
          online_order_id: string | null;
          order_code: string | null;
          org_id: string | null;
          payment_intent:
            | Database['public']['Enums']['online_payment_intent']
            | null;
          payment_proof_review_status:
            | Database['public']['Enums']['online_proof_review_status']
            | null;
          ready_for_pickup_at: string | null;
          staff_notes: string | null;
          status: Database['public']['Enums']['online_order_status'] | null;
          subtotal_amount: number | null;
          total_amount: number | null;
          tracking_token: string | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'online_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'online_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_branches_admin';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'online_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_pos_product_catalog';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'online_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'online_orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'v_supplier_product_suggestions';
            referencedColumns: ['branch_id'];
          },
          {
            foreignKeyName: 'online_orders_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'online_orders_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_org_detail';
            referencedColumns: ['org_id'];
          },
          {
            foreignKeyName: 'online_orders_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'v_superadmin_orgs';
            referencedColumns: ['org_id'];
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
          purchase_by_pack: boolean | null;
          received_at: string | null;
          received_qty: number | null;
          reconciled_at: string | null;
          sent_at: string | null;
          status: Database['public']['Enums']['supplier_order_status'] | null;
          supplier_id: string | null;
          supplier_name: string | null;
          unit_cost: number | null;
          units_per_pack: number | null;
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
            referencedRelation: 'v_products_incomplete_admin';
            referencedColumns: ['id'];
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
          brand: string | null;
          created_at: string | null;
          image_url: string | null;
          internal_code: string | null;
          is_active: boolean | null;
          name: string | null;
          org_id: string | null;
          product_id: string | null;
          purchase_by_pack: boolean | null;
          sell_unit_type: Database['public']['Enums']['sell_unit_type'] | null;
          shelf_life_days: number | null;
          stock_by_branch: Json | null;
          stock_total: number | null;
          unit_price: number | null;
          units_per_pack: number | null;
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
      v_products_incomplete_admin: {
        Row: {
          barcode: string | null;
          brand: string | null;
          has_primary_supplier: boolean | null;
          id: string | null;
          internal_code: string | null;
          missing_identifier: boolean | null;
          missing_primary_supplier: boolean | null;
          missing_shelf_life: boolean | null;
          name: string | null;
          org_id: string | null;
          purchase_by_pack: boolean | null;
          sell_unit_type: Database['public']['Enums']['sell_unit_type'] | null;
          shelf_life_days: number | null;
          unit_price: number | null;
          units_per_pack: number | null;
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
      v_sale_detail_admin: {
        Row: {
          branch_id: string | null;
          branch_name: string | null;
          cash_discount_amount: number | null;
          cash_discount_pct: number | null;
          client_id: string | null;
          client_name: string | null;
          client_phone: string | null;
          created_at: string | null;
          created_by: string | null;
          created_by_name: string | null;
          discount_amount: number | null;
          discount_pct: number | null;
          employee_account_id: string | null;
          employee_discount_amount: number | null;
          employee_discount_applied: boolean | null;
          employee_discount_pct: number | null;
          employee_name_snapshot: string | null;
          invoiced_at: string | null;
          is_invoiced: boolean | null;
          items: Json | null;
          org_id: string | null;
          payment_method_summary:
            | Database['public']['Enums']['payment_method']
            | null;
          payments: Json | null;
          sale_id: string | null;
          subtotal_amount: number | null;
          total_amount: number | null;
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
            foreignKeyName: 'sales_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sales_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'v_special_order_items_pending';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'sales_employee_account_id_fkey';
            columns: ['employee_account_id'];
            isOneToOne: false;
            referencedRelation: 'employee_accounts';
            referencedColumns: ['id'];
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
      v_sale_fiscal_invoice_admin: {
        Row: {
          cae: string | null;
          cae_expires_at: string | null;
          cbte_nro: number | null;
          cbte_tipo: number | null;
          created_at: string | null;
          currency: string | null;
          currency_rate: number | null;
          doc_nro: number | null;
          doc_tipo: number | null;
          environment: string | null;
          imp_total: number | null;
          invoice_id: string | null;
          invoice_job_id: string | null;
          org_id: string | null;
          pdf_storage_path: string | null;
          pto_vta: number | null;
          qr_payload_json: Json | null;
          render_status: string | null;
          result_status: string | null;
          sale_id: string | null;
          ticket_storage_path: string | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'invoices_invoice_job_id_fkey';
            columns: ['invoice_job_id'];
            isOneToOne: false;
            referencedRelation: 'invoice_jobs';
            referencedColumns: ['id'];
          },
        ];
      };
      v_sales_admin: {
        Row: {
          branch_id: string | null;
          branch_name: string | null;
          card_amount: number | null;
          cash_amount: number | null;
          cash_discount_amount: number | null;
          cash_discount_pct: number | null;
          client_id: string | null;
          client_name: string | null;
          client_phone: string | null;
          created_at: string | null;
          created_by: string | null;
          created_by_name: string | null;
          discount_amount: number | null;
          discount_pct: number | null;
          employee_account_id: string | null;
          employee_discount_amount: number | null;
          employee_discount_applied: boolean | null;
          employee_discount_pct: number | null;
          employee_name_snapshot: string | null;
          invoiced_at: string | null;
          is_invoiced: boolean | null;
          item_names_search: string | null;
          item_names_summary: string | null;
          items_count: number | null;
          items_qty_total: number | null;
          mercadopago_amount: number | null;
          org_id: string | null;
          other_amount: number | null;
          payment_method_summary:
            | Database['public']['Enums']['payment_method']
            | null;
          payment_methods: string[] | null;
          sale_id: string | null;
          subtotal_amount: number | null;
          total_amount: number | null;
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
            foreignKeyName: 'sales_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sales_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'v_special_order_items_pending';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'sales_employee_account_id_fkey';
            columns: ['employee_account_id'];
            isOneToOne: false;
            referencedRelation: 'employee_accounts';
            referencedColumns: ['id'];
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
      v_sales_statistics_items: {
        Row: {
          branch_id: string | null;
          branch_name: string | null;
          created_at: string | null;
          line_total: number | null;
          org_id: string | null;
          product_id: string | null;
          product_name: string | null;
          quantity: number | null;
          sale_id: string | null;
          supplier_id: string | null;
          supplier_name: string | null;
          unit_price: number | null;
        };
        Relationships: [
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
            referencedRelation: 'v_products_incomplete_admin';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sale_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'v_products_typeahead_admin';
            referencedColumns: ['product_id'];
          },
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
            referencedRelation: 'v_products_incomplete_admin';
            referencedColumns: ['id'];
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
            referencedRelation: 'v_products_incomplete_admin';
            referencedColumns: ['id'];
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
          default_markup_pct: number | null;
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
          supplier_price: number | null;
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
            referencedRelation: 'v_products_incomplete_admin';
            referencedColumns: ['id'];
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
          invoice_reference: string | null;
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
          purchase_by_pack: boolean | null;
          relation_type:
            | Database['public']['Enums']['supplier_product_relation_type']
            | null;
          safety_stock: number | null;
          stock_on_hand: number | null;
          suggested_qty: number | null;
          supplier_id: string | null;
          units_per_pack: number | null;
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
            referencedRelation: 'v_products_incomplete_admin';
            referencedColumns: ['id'];
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
          default_markup_pct: number | null;
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
      fn_fiscal_append_event: {
        Args: {
          p_event_payload_json?: Json;
          p_event_type: string;
          p_invoice_job_id: string;
          p_tenant_id: string;
        };
        Returns: string;
      };
      fn_fiscal_assert_job_exists: {
        Args: { p_invoice_job_id: string };
        Returns: {
          attempt_count: number;
          authorized_at: string | null;
          cbte_nro: number | null;
          cbte_tipo: number;
          correlation_id: string;
          created_at: string;
          environment: string;
          id: string;
          job_status: string;
          last_error_code: string | null;
          last_error_message: string | null;
          point_of_sale_id: string | null;
          pto_vta: number;
          requested_payload_json: Json | null;
          response_payload_json: Json | null;
          sale_document_id: string;
          sale_id: string;
          tenant_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'invoice_jobs';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_fiscal_block_sequence: {
        Args: {
          p_cbte_tipo: number;
          p_environment: string;
          p_pto_vta: number;
          p_reason?: string;
          p_tenant_id: string;
        };
        Returns: {
          cbte_tipo: number;
          created_at: string;
          environment: string;
          id: string;
          last_arca_confirmed: number;
          last_local_reserved: number;
          last_reconciled_at: string | null;
          pto_vta: number;
          status: string;
          tenant_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'fiscal_sequences';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_fiscal_mark_job_authorized: {
        Args: {
          p_afip_events_json?: Json;
          p_afip_observations_json?: Json;
          p_cae: string;
          p_cae_expires_at: string;
          p_currency: string;
          p_currency_rate: number;
          p_doc_nro: number;
          p_doc_tipo: number;
          p_imp_iva: number;
          p_imp_neto: number;
          p_imp_op_ex: number;
          p_imp_tot_conc: number;
          p_imp_total: number;
          p_imp_trib: number;
          p_invoice_job_id: string;
          p_raw_request_json?: Json;
          p_raw_response_json?: Json;
          p_response_payload_json?: Json;
        };
        Returns: string;
      };
      fn_fiscal_mark_job_authorizing: {
        Args: {
          p_attempt_count?: number;
          p_invoice_job_id: string;
          p_requested_payload_json?: Json;
        };
        Returns: {
          attempt_count: number;
          authorized_at: string | null;
          cbte_nro: number | null;
          cbte_tipo: number;
          correlation_id: string;
          created_at: string;
          environment: string;
          id: string;
          job_status: string;
          last_error_code: string | null;
          last_error_message: string | null;
          point_of_sale_id: string | null;
          pto_vta: number;
          requested_payload_json: Json | null;
          response_payload_json: Json | null;
          sale_document_id: string;
          sale_id: string;
          tenant_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'invoice_jobs';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_fiscal_mark_job_failed: {
        Args: {
          p_invoice_job_id: string;
          p_last_error_code?: string;
          p_last_error_message?: string;
          p_response_payload_json?: Json;
        };
        Returns: {
          attempt_count: number;
          authorized_at: string | null;
          cbte_nro: number | null;
          cbte_tipo: number;
          correlation_id: string;
          created_at: string;
          environment: string;
          id: string;
          job_status: string;
          last_error_code: string | null;
          last_error_message: string | null;
          point_of_sale_id: string | null;
          pto_vta: number;
          requested_payload_json: Json | null;
          response_payload_json: Json | null;
          sale_document_id: string;
          sale_id: string;
          tenant_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'invoice_jobs';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_fiscal_mark_job_pending_reconcile: {
        Args: {
          p_invoice_job_id: string;
          p_last_error_code?: string;
          p_last_error_message?: string;
          p_response_payload_json?: Json;
        };
        Returns: {
          attempt_count: number;
          authorized_at: string | null;
          cbte_nro: number | null;
          cbte_tipo: number;
          correlation_id: string;
          created_at: string;
          environment: string;
          id: string;
          job_status: string;
          last_error_code: string | null;
          last_error_message: string | null;
          point_of_sale_id: string | null;
          pto_vta: number;
          requested_payload_json: Json | null;
          response_payload_json: Json | null;
          sale_document_id: string;
          sale_id: string;
          tenant_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'invoice_jobs';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_fiscal_mark_job_rejected: {
        Args: {
          p_afip_events_json?: Json;
          p_afip_observations_json?: Json;
          p_invoice_job_id: string;
          p_last_error_code?: string;
          p_last_error_message?: string;
          p_response_payload_json?: Json;
        };
        Returns: {
          attempt_count: number;
          authorized_at: string | null;
          cbte_nro: number | null;
          cbte_tipo: number;
          correlation_id: string;
          created_at: string;
          environment: string;
          id: string;
          job_status: string;
          last_error_code: string | null;
          last_error_message: string | null;
          point_of_sale_id: string | null;
          pto_vta: number;
          requested_payload_json: Json | null;
          response_payload_json: Json | null;
          sale_document_id: string;
          sale_id: string;
          tenant_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'invoice_jobs';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_fiscal_mark_render_completed: {
        Args: {
          p_invoice_id: string;
          p_invoice_job_id: string;
          p_pdf_storage_path?: string;
          p_qr_payload_json?: Json;
          p_ticket_storage_path?: string;
        };
        Returns: {
          attempt_count: number;
          authorized_at: string | null;
          cbte_nro: number | null;
          cbte_tipo: number;
          correlation_id: string;
          created_at: string;
          environment: string;
          id: string;
          job_status: string;
          last_error_code: string | null;
          last_error_message: string | null;
          point_of_sale_id: string | null;
          pto_vta: number;
          requested_payload_json: Json | null;
          response_payload_json: Json | null;
          sale_document_id: string;
          sale_id: string;
          tenant_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'invoice_jobs';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_fiscal_reserve_sequence: {
        Args: { p_invoice_job_id: string };
        Returns: {
          cbte_nro: number;
          cbte_tipo: number;
          environment: string;
          invoice_job_id: string;
          pto_vta: number;
          tenant_id: string;
        }[];
      };
      fn_next_branch_storefront_slug: {
        Args: {
          p_exclude_branch_id?: string;
          p_org_id: string;
          p_slug_base: string;
        };
        Returns: string;
      };
      fn_next_org_storefront_slug: {
        Args: { p_exclude_org_id?: string; p_slug_base: string };
        Returns: string;
      };
      fn_recompute_supplier_payable: {
        Args: { p_actor_user_id?: string; p_payable_id: string };
        Returns: undefined;
      };
      fn_sync_platform_admin_memberships_for_org: {
        Args: { p_org_id: string };
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
      normalize_product_catalog_text: {
        Args: { p_value: string };
        Returns: string;
      };
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
      rpc_append_sale_delivery_event: {
        Args: {
          p_channel?: string;
          p_document_kind: Database['public']['Enums']['sale_delivery_document_kind'];
          p_event_kind: string;
          p_metadata?: Json;
          p_sale_id: string;
        };
        Returns: string;
      };
      rpc_apply_data_import_job: {
        Args: { p_apply_mode?: string; p_job_id: string; p_org_id: string };
        Returns: {
          applied_rows: number;
          skipped_rows: number;
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
      rpc_correct_sale_payment_method: {
        Args: {
          p_org_id: string;
          p_payment_device_id?: string;
          p_payment_method: Database['public']['Enums']['payment_method'];
          p_reason?: string;
          p_sale_payment_id: string;
        };
        Returns: {
          payment_method: Database['public']['Enums']['payment_method'];
          previous_payment_method: Database['public']['Enums']['payment_method'];
          sale_id: string;
          sale_payment_id: string;
        }[];
      };
      rpc_create_data_import_job: {
        Args: {
          p_org_id: string;
          p_source_file_name: string;
          p_source_file_path?: string;
          p_template_key: string;
        };
        Returns: {
          job_id: string;
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
      rpc_create_online_order: {
        Args: {
          p_branch_slug: string;
          p_customer_address: string;
          p_customer_name: string;
          p_customer_notes?: string;
          p_customer_phone: string;
          p_items: Json;
          p_org_slug: string;
        };
        Returns: {
          online_order_id: string;
          order_code: string;
          tracking_token: string;
        }[];
      };
      rpc_create_sale: {
        Args: {
          p_apply_cash_discount?: boolean;
          p_apply_employee_discount?: boolean;
          p_branch_id: string;
          p_cash_discount_pct?: number;
          p_client_id?: string;
          p_close_special_order?: boolean;
          p_employee_account_id?: string;
          p_employee_discount_pct?: number;
          p_items: Json;
          p_org_id: string;
          p_payment_device_id?: string;
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
      rpc_enqueue_sale_fiscal_invoice: {
        Args: {
          p_cbte_tipo?: number;
          p_doc_nro?: number;
          p_doc_tipo?: number;
          p_environment?: string;
          p_org_id: string;
          p_sale_id: string;
          p_source?: string;
        };
        Returns: {
          already_existed: boolean;
          invoice_job_id: string;
          job_status: string;
          sale_document_id: string;
        }[];
      };
      rpc_get_active_org_id: { Args: never; Returns: string };
      rpc_get_cash_session_payment_breakdown: {
        Args: { p_org_id: string; p_session_id: string };
        Returns: {
          payment_device_id: string;
          payment_device_name: string;
          payment_device_provider: string;
          payment_method: Database['public']['Enums']['payment_method'];
          payments_count: number;
          total_amount: number;
        }[];
      };
      rpc_get_cash_session_reconciliation_rows: {
        Args: { p_org_id: string; p_session_id: string };
        Returns: {
          difference_amount: number;
          payment_device_id: string;
          payment_device_name: string;
          payment_device_provider: string;
          payment_method: Database['public']['Enums']['payment_method'];
          payments_count: number;
          reported_amount: number;
          row_group: string;
          row_key: string;
          system_amount: number;
        }[];
      };
      rpc_get_cash_session_summary: {
        Args: { p_org_id: string; p_session_id: string };
        Returns: {
          branch_id: string;
          card_sales_amount: number;
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
          mercadopago_sales_amount: number;
          movements_count: number;
          opened_at: string;
          opened_by: string;
          opened_controlled_by_name: string;
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
      rpc_get_client_sales_history: {
        Args: {
          p_branch_id?: string;
          p_client_id: string;
          p_limit?: number;
          p_org_id: string;
        };
        Returns: {
          branch_id: string;
          branch_name: string;
          client_phone: string;
          created_at: string;
          invoice_ready: boolean;
          invoice_render_status: string;
          invoice_result_status: string;
          invoiced_at: string;
          is_invoiced: boolean;
          payment_method_summary: Database['public']['Enums']['payment_method'];
          sale_id: string;
          total_amount: number;
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
          invoiced_sales_today_count: number;
          invoiced_sales_today_total: number;
          non_invoiced_sales_today_count: number;
          non_invoiced_sales_today_total: number;
          org_id: string;
          sales_month_total: number;
          sales_today_count: number;
          sales_today_total: number;
          sales_week_total: number;
          supplier_orders_pending_count: number;
        }[];
      };
      rpc_get_online_order_tracking: {
        Args: { p_tracking_token: string };
        Returns: {
          branch_name: string;
          created_at: string;
          customer_address: string;
          customer_name: string;
          customer_notes: string;
          customer_phone: string;
          items: Json;
          last_status_at: string;
          order_code: string;
          payment_intent: Database['public']['Enums']['online_payment_intent'];
          status: Database['public']['Enums']['online_order_status'];
          store_name: string;
          timeline: Json;
          total_amount: number;
          whatsapp_phone: string;
        }[];
      };
      rpc_get_or_create_sale_delivery_link: {
        Args: {
          p_document_kind?: Database['public']['Enums']['sale_delivery_document_kind'];
          p_expires_at?: string;
          p_sale_id: string;
        };
        Returns: {
          created_at: string;
          document_kind: Database['public']['Enums']['sale_delivery_document_kind'];
          expires_at: string;
          sale_delivery_link_id: string;
          sale_id: string;
          status: Database['public']['Enums']['sale_delivery_link_status'];
          token: string;
        }[];
      };
      rpc_get_public_storefront_branches: {
        Args: { p_org_slug: string };
        Returns: {
          branch_name: string;
          branch_slug: string;
          is_active: boolean;
          is_enabled: boolean;
          org_name: string;
          org_slug: string;
          pickup_instructions: string;
          whatsapp_phone: string;
        }[];
      };
      rpc_get_public_storefront_products: {
        Args: { p_branch_slug: string; p_org_slug: string };
        Returns: {
          branch_name: string;
          branch_slug: string;
          image_url: string;
          is_available: boolean;
          org_name: string;
          org_slug: string;
          pickup_instructions: string;
          product_id: string;
          product_name: string;
          stock_on_hand: number;
          unit_price: number;
          whatsapp_phone: string;
        }[];
      };
      rpc_get_sale_invoice_delivery: {
        Args: { p_token: string };
        Returns: {
          branch_id: string;
          branch_name: string;
          cae: string;
          cae_expires_at: string;
          cbte_nro: number;
          cbte_tipo: number;
          created_at: string;
          created_by: string;
          created_by_name: string;
          currency: string;
          currency_rate: number;
          discount_amount: number;
          doc_nro: number;
          doc_tipo: number;
          environment: string;
          fiscal_ticket_note_text: string;
          imp_total: number;
          invoice_id: string;
          invoice_job_id: string;
          issuer_display_name: string;
          issuer_role: string;
          items: Json;
          org_id: string;
          org_name: string;
          pdf_storage_path: string;
          pto_vta: number;
          qr_payload_json: Json;
          render_status: string;
          result_status: string;
          sale_id: string;
          subtotal_amount: number;
          ticket_font_size_px: number;
          ticket_footer_text: string;
          ticket_header_text: string;
          ticket_line_height: number;
          ticket_margin_bottom_mm: number;
          ticket_margin_left_mm: number;
          ticket_margin_right_mm: number;
          ticket_margin_top_mm: number;
          ticket_paper_width_mm: number;
          ticket_storage_path: string;
          total_amount: number;
          updated_at: string;
        }[];
      };
      rpc_get_sale_ticket_delivery: {
        Args: { p_token: string };
        Returns: {
          branch_name: string;
          client_name: string;
          client_phone: string;
          created_at: string;
          created_by_name: string;
          discount_amount: number;
          fiscal_ticket_note_text: string;
          is_invoiced: boolean;
          items: Json;
          org_name: string;
          sale_id: string;
          subtotal_amount: number;
          ticket_font_size_px: number;
          ticket_footer_text: string;
          ticket_header_text: string;
          ticket_line_height: number;
          ticket_margin_bottom_mm: number;
          ticket_margin_left_mm: number;
          ticket_margin_right_mm: number;
          ticket_margin_top_mm: number;
          ticket_paper_width_mm: number;
          total_amount: number;
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
          invited_user_id: string;
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
      rpc_list_sale_delivery_events: {
        Args: { p_limit?: number; p_sale_id: string };
        Returns: {
          actor_display_name: string;
          actor_user_id: string;
          channel: string;
          created_at: string;
          document_kind: Database['public']['Enums']['sale_delivery_document_kind'];
          event_kind: string;
          metadata: Json;
          sale_delivery_event_id: string;
          sale_delivery_link_id: string;
          sale_id: string;
        }[];
      };
      rpc_list_sale_delivery_links: {
        Args: { p_sale_id: string };
        Returns: {
          created_at: string;
          document_kind: Database['public']['Enums']['sale_delivery_document_kind'];
          expires_at: string;
          last_shared_at: string;
          last_shared_channel: string;
          sale_delivery_link_id: string;
          sale_id: string;
          share_count: number;
          status: Database['public']['Enums']['sale_delivery_link_status'];
          token: string;
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
      rpc_mark_sale_delivery_link_shared: {
        Args: {
          p_channel?: string;
          p_document_kind: Database['public']['Enums']['sale_delivery_document_kind'];
          p_sale_id: string;
        };
        Returns: undefined;
      };
      rpc_mark_sale_invoiced: {
        Args: { p_org_id: string; p_sale_id: string; p_source?: string };
        Returns: {
          invoiced_at: string;
          is_invoiced: boolean;
          sale_id: string;
        }[];
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
          p_opened_controlled_by_name?: string;
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
      rpc_regenerate_sale_delivery_link: {
        Args: {
          p_document_kind?: Database['public']['Enums']['sale_delivery_document_kind'];
          p_expires_at?: string;
          p_sale_id: string;
        };
        Returns: {
          created_at: string;
          document_kind: Database['public']['Enums']['sale_delivery_document_kind'];
          expires_at: string;
          last_shared_at: string;
          last_shared_channel: string;
          sale_delivery_link_id: string;
          sale_id: string;
          share_count: number;
          status: Database['public']['Enums']['sale_delivery_link_status'];
          token: string;
        }[];
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
      rpc_revoke_sale_delivery_link: {
        Args: {
          p_document_kind: Database['public']['Enums']['sale_delivery_document_kind'];
          p_sale_id: string;
        };
        Returns: number;
      };
      rpc_set_online_order_status: {
        Args: {
          p_customer_note?: string;
          p_internal_note?: string;
          p_new_status: Database['public']['Enums']['online_order_status'];
          p_online_order_id: string;
        };
        Returns: {
          changed_at: string;
          new_status: Database['public']['Enums']['online_order_status'];
          old_status: Database['public']['Enums']['online_order_status'];
          online_order_id: string;
        }[];
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
      rpc_transfer_stock_between_branches: {
        Args: {
          p_from_branch_id: string;
          p_items: Json;
          p_org_id: string;
          p_reason?: string;
          p_to_branch_id: string;
        };
        Returns: {
          moved_items_count: number;
          total_quantity_moved: number;
          transfer_id: string;
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
          p_invoice_reference?: string;
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
      rpc_upsert_cash_session_reconciliation_inputs: {
        Args: { p_entries: Json; p_org_id: string; p_session_id: string };
        Returns: {
          updated_count: number;
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
      rpc_upsert_data_import_row: {
        Args: {
          p_job_id: string;
          p_normalized_payload?: Json;
          p_org_id: string;
          p_raw_payload: Json;
          p_row_number: number;
        };
        Returns: {
          row_id: string;
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
          }
        | {
            Args: {
              p_accepts_cash?: boolean;
              p_accepts_transfer?: boolean;
              p_contact_name: string;
              p_default_markup_pct?: number;
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
      rpc_upsert_supplier_product: {
        Args: {
          p_org_id: string;
          p_product_id: string;
          p_relation_type?: Database['public']['Enums']['supplier_product_relation_type'];
          p_supplier_id: string;
          p_supplier_price?: number;
          p_supplier_product_name: string;
          p_supplier_sku: string;
        };
        Returns: {
          id: string;
        }[];
      };
      rpc_validate_data_import_job: {
        Args: { p_job_id: string; p_org_id: string };
        Returns: {
          invalid_rows: number;
          total_rows: number;
          valid_rows: number;
        }[];
      };
      slugify_text: { Args: { p_input: string }; Returns: string };
    };
    Enums: {
      online_order_status:
        | 'pending'
        | 'confirmed'
        | 'ready_for_pickup'
        | 'delivered'
        | 'cancelled';
      online_payment_intent: 'pay_on_pickup' | 'transfer' | 'qr';
      online_proof_review_status: 'pending' | 'approved' | 'rejected';
      order_frequency: 'weekly' | 'biweekly' | 'every_3_weeks' | 'monthly';
      payment_method:
        | 'cash'
        | 'debit'
        | 'credit'
        | 'transfer'
        | 'other'
        | 'mixed'
        | 'card'
        | 'mercadopago';
      sale_delivery_document_kind: 'sale_ticket' | 'sale_invoice';
      sale_delivery_link_status: 'active' | 'revoked' | 'expired';
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
        | 'expiration_adjustment'
        | 'branch_transfer';
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
      online_order_status: [
        'pending',
        'confirmed',
        'ready_for_pickup',
        'delivered',
        'cancelled',
      ],
      online_payment_intent: ['pay_on_pickup', 'transfer', 'qr'],
      online_proof_review_status: ['pending', 'approved', 'rejected'],
      order_frequency: ['weekly', 'biweekly', 'every_3_weeks', 'monthly'],
      payment_method: [
        'cash',
        'debit',
        'credit',
        'transfer',
        'other',
        'mixed',
        'card',
        'mercadopago',
      ],
      sale_delivery_document_kind: ['sale_ticket', 'sale_invoice'],
      sale_delivery_link_status: ['active', 'revoked', 'expired'],
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
        'branch_transfer',
      ],
      supplier_order_status: ['draft', 'sent', 'received', 'reconciled'],
      supplier_product_relation_type: ['primary', 'secondary'],
      user_role: ['superadmin', 'org_admin', 'staff'],
      weekday: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    },
  },
} as const;
