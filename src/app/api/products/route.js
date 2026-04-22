import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabaseServer';

// ─────────────────────────────────────────────────────────────────────
// Per-tenant product catalog
//
// GET  /api/products?calculator_type=balustrade
//   → list current user's products for that calculator. Used by the
//     calculator pages (via useUserCostMap) to overlay user pricing on
//     top of the built-in defaults.
//
// POST /api/products
//   body: { calculator_type, slot_key, ...fields }
//   → upsert one product row for current user. Used by the "My Products"
//     UI (not built yet).
// ─────────────────────────────────────────────────────────────────────

export async function GET(request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const calcType = new URL(request.url).searchParams.get('calculator_type');

  let q = supabase
    .from('products')
    .select('id, calculator_type, slot_key, category, display_name, supplier_name, supplier_sku, cost_price, unit, dimensions, image_url, active')
    .eq('user_id', user.id)
    .eq('active', true);

  if (calcType) q = q.eq('calculator_type', calcType);

  const { data, error } = await q.order('calculator_type').order('slot_key');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ products: data || [] });
}

export async function POST(request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const {
    calculator_type,
    slot_key,
    category,
    display_name,
    supplier_name,
    supplier_sku,
    cost_price,
    unit,
    dimensions,
    image_url,
    notes,
    active,
  } = body;

  if (!calculator_type || !slot_key) {
    return NextResponse.json({ error: 'calculator_type and slot_key required' }, { status: 400 });
  }

  const row = {
    user_id: user.id,
    calculator_type,
    slot_key,
    category: category ?? '',
    display_name: display_name ?? '',
    supplier_name: supplier_name ?? '',
    supplier_sku: supplier_sku ?? '',
    cost_price: Number(cost_price) || 0,
    unit: unit || 'each',
    dimensions: dimensions || {},
    image_url: image_url || null,
    notes: notes ?? '',
    active: active ?? true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('products')
    .upsert(row, { onConflict: 'user_id,calculator_type,slot_key' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}
