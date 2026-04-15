import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabaseServer';
import GlassPage from './GlassPage';

export const metadata = {
  title: 'Glass Pool Fencing Calculator - Expert Fence',
};

export default async function GlassCalculatorPage() {
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

  return <GlassPage />;
}
