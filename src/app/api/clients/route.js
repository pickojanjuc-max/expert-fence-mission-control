import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabaseServer';

// GET /api/clients — list user's clients
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: clients || [] });
}

// POST /api/clients — create new client
export async function POST(request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { name, company, email, phone, address, notes } = body;

  if (!name) {
    return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
  }

  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      user_id: user.id,
      name,
      company: company || '',
      email: email || '',
      phone: phone || '',
      address: address || '',
      notes: notes || '',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client });
}
