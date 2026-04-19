import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabaseServer';

// GET /api/calculations/[id] — load a single calculation with its parent project
export async function GET(request, { params }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: calc, error } = await supabase
    .from('project_calculations')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !calc) return NextResponse.json({ error: 'Calculation not found' }, { status: 404 });

  // Verify ownership via parent project
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, status, client_name')
    .eq('id', calc.project_id)
    .eq('user_id', user.id)
    .single();

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ calculation: calc, project });
}

// DELETE /api/calculations/[id] — remove a single calculation from its project
export async function DELETE(request, { params }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Look up the calculation to find its parent project
  const { data: calc, error: fetchErr } = await supabase
    .from('project_calculations')
    .select('id, project_id')
    .eq('id', params.id)
    .single();

  if (fetchErr || !calc) return NextResponse.json({ error: 'Calculation not found' }, { status: 404 });

  // Verify ownership of the parent project before deleting
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', calc.project_id)
    .eq('user_id', user.id)
    .single();

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error: delErr } = await supabase
    .from('project_calculations')
    .delete()
    .eq('id', params.id);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
