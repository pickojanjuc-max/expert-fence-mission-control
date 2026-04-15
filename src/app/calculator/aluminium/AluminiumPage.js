'use client';
import AluminiumV2Client from '@/components/AluminiumV2Client';

// Promoted 2026-04-15: the canonical /calculator/aluminium route now serves
// the V2 UI (matching glass + balustrade layout). The old single-file
// AluminiumCalculator component at src/calculators/AluminiumCalculator.jsx
// is kept unreferenced for rollback — delete once V2 has been in production
// for a while with no issues.
export default function AluminiumPage() {
  return <AluminiumV2Client />;
}
