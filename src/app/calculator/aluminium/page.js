import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabaseServer';
import AluminiumPage from './AluminiumPage';

export const metadata = {
  title: 'Aluminium Calculator - Expert Fence',
};

export default async function AluminiumCalculatorPage() {
  const supabase = await createSupabaseServer();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check subscription status
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .single();

  if (subError || !subscription || subscription.status !== 'active') {
    redirect('/pricing');
  }

  return <AluminiumPage />;
}
