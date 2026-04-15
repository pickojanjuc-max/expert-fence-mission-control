import { calculateQuoteV5 } from '@/lib/calculationEngine';
import { COST_MAP } from '@/lib/costData';

export async function POST(request) {
  try {
    const body = await request.json();

    // Call the calculation engine with cost data
    const result = calculateQuoteV5(body, COST_MAP);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Quote calculation error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to calculate quote', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
