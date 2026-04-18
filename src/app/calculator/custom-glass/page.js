import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabaseServer';
import CustomGlassCalculatorPage from '@/components/custom-glass/CalculatorPage';

export const metadata = {
  title: 'Custom Glass Calculator - Expert Fence',
};

export default async function CustomGlassPage() {
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

  return <CustomGlassCalculatorPage />;
}
