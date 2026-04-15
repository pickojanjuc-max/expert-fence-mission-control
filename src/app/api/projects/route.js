import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabaseServer';

// GET /api/projects — list user's projects with their calculations
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Fetch projects
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, status, client_name, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch all calculations for these projects
  const projectIds = projects.map((p) => p.id);
  let calculations = [];
  if (projectIds.length > 0) {
    const { data: calcs } = await supabase
      .from('project_calculations')
      .select('id, project_id, calculator_type, label, created_at, updated_at')
      .in('project_id', projectIds)
      .order('created_at', { ascending: true });
    calculations = calcs || [];
  }

  // Attach calculations to each project
  const result = projects.map((p) => ({
    ...p,
    calculations: calculations.filter((c) => c.project_id === p.id),
  }));

  return NextResponse.json({ projects: result });
}

// POST /api/projects — create or update project + calculation
//
// Modes:
//   1. New project + new calc:  { name, calculator_type, calculator_state, ... }
//   2. Add calc to existing:    { project_id, calculator_type, calculator_state, ... }
//   3. Update existing calc:    { project_id, calculation_id, calculator_type, calculator_state, ... }
//   4. Update project meta:     { project_id, name, status, client_name, ... }
export async function POST(request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const {
    project_id,       // existing project to add to / update
    calculation_id,   // existing calculation to update
    name,
    calculator_type,
    calculator_state,
    bom_snapshot,
    label,
    // project-level fields
    status,
    client_name,
    client_email,
    client_phone,
    notes,
  } = body;

  let finalProjectId = project_id;

  // If no project_id, create a new project
  if (!finalProjectId) {
    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }
    const { data: newProject, error: projErr } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name,
        status: status || 'draft',
        client_name: client_name || '',
        client_email: client_email || '',
        client_phone: client_phone || '',
        notes: notes || '',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 });
    finalProjectId = newProject.id;
  } else {
    // Update project meta if name or other fields provided
    const updates = { updated_at: new Date().toISOString() };
    if (name) updates.name = name;
    if (status) updates.status = status;
    if (client_name !== undefined) updates.client_name = client_name;
    if (client_email !== undefined) updates.client_email = client_email;
    if (client_phone !== undefined) updates.client_phone = client_phone;
    if (notes !== undefined) updates.notes = notes;

    await supabase
      .from('projects')
      .update(updates)
      .eq('id', finalProjectId)
      .eq('user_id', user.id);
  }

  // If calculator data provided, create or update a calculation
  let calculation = null;
  if (calculator_type && calculator_state) {
    const calcRow = {
      project_id: finalProjectId,
      calculator_type,
      label: label || '',
      calculator_state,
      bom_snapshot: bom_snapshot || null,
      updated_at: new Date().toISOString(),
    };

    if (calculation_id) {
      // Update existing calculation
      const { data, error } = await supabase
        .from('project_calculations')
        .update(calcRow)
        .eq('id', calculation_id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      calculation = data;
    } else {
      // Insert new calculation
      const { data, error } = await supabase
        .from('project_calculations')
        .insert(calcRow)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      calculation = data;
    }
  }

  // Return full project with all calculations
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', finalProjectId)
    .single();

  const { data: allCalcs } = await supabase
    .from('project_calculations')
    .select('*')
    .eq('project_id', finalProjectId)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    project: { ...project, calculations: allCalcs || [] },
    calculation,
  });
}
