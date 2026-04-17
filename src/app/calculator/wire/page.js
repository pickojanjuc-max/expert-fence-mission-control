import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabaseServer';
import WirePage from './WirePage';

export const metadata = {
  title: 'Stainless Wire Balustrade Calculator - Expert Fence',
};

export default async function WireCalculatorPage() {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .single();

  if (subError || !subscription || subscription.status !== 'active') {
    redirect('/pricing');
  }

  return <WirePage />;
}
