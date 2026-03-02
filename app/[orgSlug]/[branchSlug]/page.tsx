import { notFound } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import StorefrontBranchClient from './StorefrontBranchClient';

type StorefrontProductRow = {
  org_name: string;
  org_slug: string;
  branch_name: string;
  branch_slug: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  stock_on_hand: number;
  image_url: string | null;
  is_available: boolean;
  whatsapp_phone: string | null;
  pickup_instructions: string | null;
};

type StorefrontBranchRow = {
  org_name: string;
  org_slug: string;
  branch_name: string;
  branch_slug: string;
  is_active: boolean;
  is_enabled: boolean;
  whatsapp_phone: string | null;
  pickup_instructions: string | null;
};

type BranchStorefrontPageProps = {
  params: Promise<{ orgSlug: string; branchSlug: string }>;
};

export default async function BranchStorefrontPage({
  params,
}: BranchStorefrontPageProps) {
  const { orgSlug, branchSlug } = await params;
  const supabase = await createServerSupabaseClient();
  const supabaseRpc = supabase as unknown as {
    rpc: (
      fnName: string,
      params?: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };

  const { data: productsData, error: productsError } = await supabaseRpc.rpc(
    'rpc_get_public_storefront_products',
    {
      p_org_slug: orgSlug,
      p_branch_slug: branchSlug,
    },
  );

  if (productsError) {
    notFound();
  }

  const productRows = (productsData ?? []) as StorefrontProductRow[];

  let orgName = '';
  let branchName = '';
  let whatsappPhone: string | null = null;
  let pickupInstructions: string | null = null;

  if (productRows.length > 0) {
    orgName = productRows[0].org_name;
    branchName = productRows[0].branch_name;
    whatsappPhone = productRows[0].whatsapp_phone;
    pickupInstructions = productRows[0].pickup_instructions;
  } else {
    const { data: branchesData, error: branchesError } = await supabaseRpc.rpc(
      'rpc_get_public_storefront_branches',
      {
        p_org_slug: orgSlug,
      },
    );

    if (branchesError) {
      notFound();
    }

    const branchRows = (branchesData ?? []) as StorefrontBranchRow[];
    const selectedBranch = branchRows.find((row) => row.branch_slug === branchSlug);

    if (!selectedBranch) {
      notFound();
    }

    orgName = selectedBranch.org_name;
    branchName = selectedBranch.branch_name;
    whatsappPhone = selectedBranch.whatsapp_phone;
    pickupInstructions = selectedBranch.pickup_instructions;
  }

  const products = productRows.map((row) => ({
    product_id: row.product_id,
    product_name: row.product_name,
    unit_price: Number(row.unit_price),
    stock_on_hand: Number(row.stock_on_hand),
    image_url: row.image_url,
    is_available: row.is_available,
  }));

  return (
    <StorefrontBranchClient
      orgSlug={orgSlug}
      branchSlug={branchSlug}
      orgName={orgName}
      branchName={branchName}
      whatsappPhone={whatsappPhone}
      pickupInstructions={pickupInstructions}
      products={products}
    />
  );
}
