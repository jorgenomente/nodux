import type { OrgSession } from '@/lib/auth/org-session';

type BranchOption = {
  id: string;
  name: string;
};

type SessionSummary = {
  session_id: string;
  branch_id: string;
  status: 'open' | 'closed';
  period_type: 'shift' | 'day';
  session_label: string | null;
  opening_cash_amount: number;
  opening_reserve_amount: number;
  closing_drawer_amount: number | null;
  closing_reserve_amount: number | null;
  cash_sales_amount: number;
  card_sales_amount: number;
  mercadopago_sales_amount: number;
  manual_income_amount: number;
  manual_expense_amount: number;
  expected_cash_amount: number;
  counted_cash_amount: number | null;
  difference_amount: number | null;
  movements_count: number;
  opened_by: string;
  opened_controlled_by_name: string | null;
  closed_by: string | null;
  opened_at: string;
  closed_at: string | null;
  close_note: string | null;
};

type MovementRow = {
  id: string;
  movement_type: 'expense' | 'income';
  category_key: string;
  amount: number;
  note: string | null;
  movement_at: string;
  created_at: string;
  created_by: string;
};

type SessionReconciliationRow = {
  row_key: string;
  row_group: 'cash_expected_total' | 'device' | 'mercadopago_total';
  payment_method:
    | 'cash'
    | 'card'
    | 'mercadopago'
    | 'debit'
    | 'credit'
    | 'transfer'
    | 'other';
  payment_device_id: string | null;
  payment_device_name: string | null;
  payment_device_provider: string | null;
  system_amount: number;
  payments_count: number;
  reported_amount: number | null;
  difference_amount: number | null;
};

type CashSessionRow = {
  id: string;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at: string | null;
};

const formatMovementCategory = (categoryKey: string) => {
  if (categoryKey === 'supplier_payment_cash') {
    return 'Pago proveedor (efectivo)';
  }
  if (categoryKey === 'delivery') return 'Delivery';
  if (categoryKey === 'libreria') return 'Libreria';
  if (categoryKey === 'limpieza') return 'Limpieza';
  if (categoryKey === 'servicios') return 'Servicios';
  if (categoryKey === 'otros') return 'Otros';
  return categoryKey;
};

const formatPaymentMethod = (method: string) => {
  switch (method) {
    case 'cash':
      return 'Efectivo';
    case 'card':
      return 'Tarjeta';
    case 'mercadopago':
      return 'MercadoPago';
    case 'debit':
      return 'Debito';
    case 'credit':
      return 'Credito';
    case 'transfer':
      return 'Transferencia';
    case 'other':
      return 'Otro';
    default:
      return method;
  }
};

export type CashboxReportData = {
  orgId: string;
  branchId: string;
  branchName: string;
  generatedAt: string;
  session: SessionSummary | null;
  movements: MovementRow[];
  reconciliationRows: SessionReconciliationRow[];
  expectedBreakdown: {
    openingCash: number;
    openingReserve: number;
    cashSales: number;
    manualIncome: number;
    supplierPaymentCashExpense: number;
    otherManualExpense: number;
    totalManualExpense: number;
    composedExpected: number;
  } | null;
  details: {
    supplierPaymentMovements: MovementRow[];
    otherExpenseMovements: MovementRow[];
    manualIncomeMovements: MovementRow[];
  } | null;
  helpers: {
    formatMovementCategory: (categoryKey: string) => string;
    formatPaymentMethod: (method: string) => string;
  };
};

const getAllowedBranches = async (
  orgSession: OrgSession,
): Promise<BranchOption[]> => {
  const { supabase, orgId, effectiveRole, userId } = orgSession;
  if (!orgId) return [];

  if (effectiveRole === 'staff') {
    const { data: memberships } = await supabase
      .from('branch_memberships')
      .select('branch_id')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('is_active', true);

    const branchIds = (memberships ?? [])
      .map((row) => row.branch_id)
      .filter(Boolean);

    if (branchIds.length === 0) return [];

    const { data: branches } = await supabase
      .from('branches')
      .select('id, name')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .in('id', branchIds)
      .order('name');

    return (branches ?? []) as BranchOption[];
  }

  const { data: branches } = await supabase
    .from('branches')
    .select('id, name')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('name');

  return (branches ?? []) as BranchOption[];
};

const getTargetSession = async (
  orgSession: OrgSession,
  branchId: string,
  explicitSessionId?: string,
): Promise<CashSessionRow | null> => {
  const { supabase, orgId } = orgSession;
  if (!orgId) return null;

  if (explicitSessionId) {
    const { data: explicitSession } = await supabase
      .from('cash_sessions')
      .select('id, status, opened_at, closed_at')
      .eq('org_id', orgId)
      .eq('branch_id', branchId)
      .eq('id', explicitSessionId)
      .eq('status', 'closed')
      .maybeSingle();

    return (explicitSession as CashSessionRow | null) ?? null;
  }

  const { data: closedSession } = await supabase
    .from('cash_sessions')
    .select('id, status, opened_at, closed_at')
    .eq('org_id', orgId)
    .eq('branch_id', branchId)
    .eq('status', 'closed')
    .order('closed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (closedSession as CashSessionRow | null) ?? null;
};

export const getCashboxReportData = async (params: {
  orgSession: OrgSession;
  branchIdRaw?: string;
  sessionIdRaw?: string;
}): Promise<CashboxReportData | null> => {
  const { orgSession, branchIdRaw, sessionIdRaw } = params;
  const { supabase, orgId } = orgSession;
  if (!orgId || !orgSession.effectiveRole) return null;

  const branches = await getAllowedBranches(orgSession);
  if (branches.length === 0) return null;

  const branchIds = new Set(branches.map((branch) => branch.id));
  const branchId =
    branchIdRaw && branchIds.has(branchIdRaw) ? branchIdRaw : branches[0].id;
  const branchName =
    branches.find((branch) => branch.id === branchId)?.name ?? 'Sucursal';

  const targetSession = await getTargetSession(
    orgSession,
    branchId,
    sessionIdRaw,
  );
  if (!targetSession) {
    return {
      orgId,
      branchId,
      branchName,
      generatedAt: new Date().toISOString(),
      session: null,
      movements: [],
      reconciliationRows: [],
      expectedBreakdown: null,
      details: null,
      helpers: {
        formatMovementCategory,
        formatPaymentMethod,
      },
    };
  }

  const { data: summaryData } = await supabase.rpc(
    'rpc_get_cash_session_summary',
    {
      p_org_id: orgId,
      p_session_id: targetSession.id,
    },
  );
  const summary =
    ((summaryData as SessionSummary[] | null)?.[0] as
      | SessionSummary
      | undefined) ?? null;
  if (!summary) return null;

  const { data: movementsData } = await supabase
    .from('cash_session_movements')
    .select(
      'id, movement_type, category_key, amount, note, movement_at, created_at, created_by',
    )
    .eq('org_id', orgId)
    .eq('session_id', targetSession.id)
    .order('movement_at', { ascending: true });
  const movements = (movementsData ?? []) as MovementRow[];

  const { data: reconciliationRowsData } = await supabase.rpc(
    'rpc_get_cash_session_reconciliation_rows' as never,
    {
      p_org_id: orgId,
      p_session_id: targetSession.id,
    } as never,
  );
  const reconciliationRows = (reconciliationRowsData ?? []) as
    | SessionReconciliationRow[]
    | [];

  const supplierPaymentCashExpense = movements.reduce(
    (sum, movement) =>
      movement.movement_type === 'expense' &&
      movement.category_key === 'supplier_payment_cash'
        ? sum + Number(movement.amount ?? 0)
        : sum,
    0,
  );
  const allExpense = movements.reduce(
    (sum, movement) =>
      movement.movement_type === 'expense'
        ? sum + Number(movement.amount ?? 0)
        : sum,
    0,
  );
  const allIncome = movements.reduce(
    (sum, movement) =>
      movement.movement_type === 'income'
        ? sum + Number(movement.amount ?? 0)
        : sum,
    0,
  );
  const otherManualExpense = Math.max(
    allExpense - supplierPaymentCashExpense,
    0,
  );
  const composedExpected =
    Number(summary.opening_cash_amount ?? 0) +
    Number(summary.opening_reserve_amount ?? 0) +
    Number(summary.cash_sales_amount ?? 0) +
    allIncome -
    allExpense;

  return {
    orgId,
    branchId,
    branchName,
    generatedAt: new Date().toISOString(),
    session: summary,
    movements,
    reconciliationRows,
    expectedBreakdown: {
      openingCash: Number(summary.opening_cash_amount ?? 0),
      openingReserve: Number(summary.opening_reserve_amount ?? 0),
      cashSales: Number(summary.cash_sales_amount ?? 0),
      manualIncome: allIncome,
      supplierPaymentCashExpense,
      otherManualExpense,
      totalManualExpense: allExpense,
      composedExpected,
    },
    details: {
      supplierPaymentMovements: movements.filter(
        (movement) =>
          movement.movement_type === 'expense' &&
          movement.category_key === 'supplier_payment_cash',
      ),
      otherExpenseMovements: movements.filter(
        (movement) =>
          movement.movement_type === 'expense' &&
          movement.category_key !== 'supplier_payment_cash',
      ),
      manualIncomeMovements: movements.filter(
        (movement) => movement.movement_type === 'income',
      ),
    },
    helpers: {
      formatMovementCategory,
      formatPaymentMethod,
    },
  };
};
