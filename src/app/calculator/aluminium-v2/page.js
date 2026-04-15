import { redirect } from 'next/navigation';

// V2 was promoted to /calculator/aluminium on 2026-04-15.
// This route stays as a permanent redirect so any bookmarks still work.
export default function AluminiumV2RedirectPage() {
  redirect('/calculator/aluminium');
}
