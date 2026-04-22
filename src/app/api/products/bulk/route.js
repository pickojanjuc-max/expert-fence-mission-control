import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabaseServer';

// ─────────────────────────────────────────────────────────────────────
// POST /api/products/bulk
//
// Bulk-upsert products for the current user. Body:
//   {
//     calculator_type: "balustrade",
//     products: [
//       { slot_key, cost_price, display_name?, category?, image_url? },
//       ...
//     ]
//   }
//
// Used by the My Products CSV import. One round-trip instead of N.
// Returns: { upserted: N, errors: [...] }
// ─────────────────────────────────────────────────────────────────────

export async function POST(request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { calculator_type, products } = body || {};
  if (!calculator_type || !Array.isArray(products)) {
    return NextResponse.json({ error: 'calculator_type and products[] required' }, { status: 400 });
  }

  const errors = [];
  const rows = [];
  const now = new Date().toISOString();

  for (const p of products) {
    if (!p?.slot_key) {
      errors.push({ slot_key: null, reason: 'Missing slot_key' });
      continue;
    }
    const cost = Number(p.cost_price);
    if (!Number.isFinite(cost) || cost < 0) {
      errors.push({ slot_key: p.slot_key, reason: 'Invalid cost_price' });
      continue;
    }
    rows.push({
      user_id: user.id,
      calculator_type,
      slot_key: String(p.slot_key).toUpperCase(),
      category: p.category ?? '',
      display_name: p.display_name ?? '',
      supplier_name: p.supplier_name ?? '',
      supplier_sku: p.supplier_sku ?? '',
      cost_price: cost,
      unit: p.unit || 'each',
      dimensions: p.dimensions || {},
      image_url: p.image_url || null,
      notes: p.notes ?? '',
      active: p.active ?? true,
      updated_at: now,
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ upserted: 0, errors });
  }

  const { data, error } = await supabase
    .from('products')
    .upsert(rows, { onConflict: 'user_id,calculator_type,slot_key' })
    .select('id, slot_key, cost_price');

  if (error) {
    return NextResponse.json({ error: error.message, errors }, { status: 500 });
  }

  return NextResponse.json({ upserted: (data || []).length, errors });
}
