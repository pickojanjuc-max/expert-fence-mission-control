import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabaseServer';

// GET /api/projects/[id] — load a single project with all calculations
export async function GET(request, { params }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error || !project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  // Fetch calculations
  const { data: calculations } = await supabase
    .from('project_calculations')
    .select('*')
    .eq('project_id', project.id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ project: { ...project, calculations: calculations || [] } });
}

// DELETE /api/projects/[id] — delete a project (cascades to calculations)
export async function DELETE(request, { params }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
