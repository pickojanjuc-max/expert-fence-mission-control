import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabaseServer';

// GET /api/clients/[id] — get single client + their projects
export async function GET(request, { params }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Fetch projects linked to this client
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status, client_name, client_email, client_phone, created_at, updated_at')
    .eq('client_id', params.id)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  return NextResponse.json({ client, projects: projects || [] });
}

// PATCH /api/clients/[id] — update client
export async function PATCH(request, { params }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { name, company, email, phone, address, notes } = body;

  const updates = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (company !== undefined) updates.company = company;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (address !== undefined) updates.address = address;
  if (notes !== undefined) updates.notes = notes;

  const { data: client, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client });
}

// DELETE /api/clients/[id] — delete client (projects keep inline client data)
export async function DELETE(request, { params }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
