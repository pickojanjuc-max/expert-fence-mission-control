import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabaseServer';

// ─────────────────────────────────────────────────────────────────────
// Per-user, per-calculator settings.
//
// GET  /api/settings?calculator_type=balustrade
//   → { settings: { calculator_type, default_markup_pct } }
//   If the user has never saved settings for this calc, returns the
//   built-in fallback (40%) without inserting a row.
//
// PUT  /api/settings
//   body: { calculator_type, default_markup_pct }
//   → upserts the row for the current user.
//
// Markup is stored as a percent (40 = 40%) — matches what the user types.
// ─────────────────────────────────────────────────────────────────────

const FALLBACK_MARKUP_PCT = 40;

export async function GET(request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const calcType = new URL(request.url).searchParams.get('calculator_type');
  if (!calcType) {
    return NextResponse.json({ error: 'calculator_type required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('user_calculator_settings')
    .select('calculator_type, default_markup_pct')
    .eq('user_id', user.id)
    .eq('calculator_type', calcType)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    settings: data || {
      calculator_type: calcType,
      default_markup_pct: FALLBACK_MARKUP_PCT,
    },
  });
}

export async function PUT(request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { calculator_type, default_markup_pct } = body || {};
  if (!calculator_type) {
    return NextResponse.json({ error: 'calculator_type required' }, { status: 400 });
  }
  const pct = Number(default_markup_pct);
  if (!Number.isFinite(pct) || pct < 0 || pct > 1000) {
    return NextResponse.json({ error: 'default_markup_pct must be between 0 and 1000' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('user_calculator_settings')
    .upsert(
      {
        user_id: user.id,
        calculator_type,
        default_markup_pct: pct,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,calculator_type' }
    )
    .select('calculator_type, default_markup_pct')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
