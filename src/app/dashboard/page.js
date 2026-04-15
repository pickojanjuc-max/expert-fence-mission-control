import { createSupabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = await createSupabaseServer();

  // Get authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user || userError) {
    redirect('/login');
  }

  // Check subscription status
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('status, plan')
    .eq('user_id', user.id)
    .single();

  if (subError || !subscription || subscription.status !== 'active') {
    redirect('/pricing');
  }

  return (
    <DashboardClient
      email={user.email}
      plan={subscription.plan}
    />
  );
}
