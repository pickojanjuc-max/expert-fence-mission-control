import { createSupabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return redirect('/login');
  }

  try {
    const supabase = await createSupabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  } catch (error) {
    console.error('Auth callback error:', error);
    return redirect('/login');
  }

  return redirect('/dashboard');
}
