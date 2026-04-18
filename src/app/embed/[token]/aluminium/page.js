// Public embed route for the aluminium calculator.
// Validates the token against Supabase, fetches the tenant's SKU mappings,
// then renders the stripped-down calculator inside an iframe-friendly shell.
//
// No auth required — this is designed to be loaded from third-party stores.
// The `[token]` in the URL is the embed_tokens.token value (data-key in the
// customer's script tag).

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import AluminiumEmbedClient from '@/components/embed/AluminiumEmbedClient';

export const dynamic = 'force-dynamic';

async function loadTenant(token) {
  const admin = getSupabaseAdmin();

  const { data: tokenRow, error: tokenErr } = await admin
    .from('embed_tokens')
    .select('id, name, status, calc_types, store_url')
    .eq('token', token)
    .maybeSingle();

  if (tokenErr || !tokenRow) return { ok: false, reason: 'not_found' };
  if (tokenRow.status !== 'active') return { ok: false, reason: 'inactive' };
  if (!Array.isArray(tokenRow.calc_types) || !tokenRow.calc_types.includes('aluminium')) {
    return { ok: false, reason: 'no_plan' };
  }

  const { data: mappings, error: mapErr } = await admin
    .from('sku_mappings')
    .select('calc_sku, store_product_id, store_sku, product_name')
    .eq('token_id', tokenRow.id);

  if (mapErr) return { ok: false, reason: 'mapping_load_failed' };

  // Shape as a lookup: calc_sku (uppercased) -> { product_id, product_name, store_sku }
  const skuMap = {};
  for (const row of mappings || []) {
    skuMap[String(row.calc_sku).toUpperCase()] = {
      product_id: row.store_product_id,
      product_name: row.product_name || '',
      store_sku: row.store_sku || '',
    };
  }

  return { ok: true, tokenRow, skuMap };
}

function Unavailable({ reason }) {
  const msg =
    reason === 'not_found'     ? 'This calculator link is invalid.'
  : reason === 'inactive'      ? 'This calculator is temporarily unavailable.'
  : reason === 'no_plan'       ? 'This store is not subscribed to the aluminium calculator.'
                               : 'Calculator could not be loaded.';
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: '#475569' }}>
      <div style={{ maxWidth: 520, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
          Calculator unavailable
        </div>
        <div style={{ fontSize: 14 }}>{msg}</div>
      </div>
    </div>
  );
}

export default async function EmbedAluminiumPage({ params }) {
  const { token } = params;
  const result = await loadTenant(token);

  if (!result.ok) return <Unavailable reason={result.reason} />;

  return (
    <AluminiumEmbedClient
      token={token}
      tenantName={result.tokenRow.name}
      skuMap={result.skuMap}
    />
  );
}
