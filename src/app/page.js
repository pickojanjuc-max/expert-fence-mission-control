import { createSupabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

export default async function RootPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  redirect('/dashboard');
}
