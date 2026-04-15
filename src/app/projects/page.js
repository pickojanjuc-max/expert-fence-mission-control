import { createSupabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import ProjectsClient from './ProjectsClient';

export default async function ProjectsPage() {
  const supabase = await createSupabaseServer();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user || userError) {
    redirect('/login');
  }

  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('status, plan')
    .eq('user_id', user.id)
    .single();

  if (subError || !subscription || subscription.status !== 'active') {
    redirect('/pricing');
  }

  return <ProjectsClient email={user.email} />;
}
