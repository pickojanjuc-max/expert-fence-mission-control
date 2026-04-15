import { createSupabaseServer } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request) {
  try {
    // Get authenticated user from server session
    const supabase = await createSupabaseServer();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Use admin client to upsert subscription
    const admin = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { data, error } = await admin
      .from('subscriptions')
      .upsert(
        {
          user_id: user.id,
          user_email: user.email,
          status: 'active',
          plan: 'pro',
          updated_at: now,
        },
        { onConflict: 'user_id' }
      )
      .select();

    if (error) {
      console.error('Subscription upsert error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to activate subscription' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        status: 'active',
        plan: 'pro',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Subscription activate error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
