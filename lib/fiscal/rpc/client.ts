import { createAdminSupabaseClient } from '@/lib/supabase/admin';

type RpcError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

const formatRpcError = (name: string, error: RpcError) => {
  const code = error.code ? ` [${error.code}]` : '';
  throw new Error(`RPC ${name} failed${code}: ${error.message}`);
};

export const callFiscalRpc = async <TResult>(
  name: string,
  args?: Record<string, unknown>,
): Promise<TResult> => {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc(name as never, (args ?? {}) as never);

  if (error) {
    formatRpcError(name, error);
  }

  return data as TResult;
};

export const getFiscalAdminClient = () => createAdminSupabaseClient();
