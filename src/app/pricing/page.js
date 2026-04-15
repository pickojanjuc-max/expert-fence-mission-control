'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleStartFreeTrial() {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/subscription/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to activate subscription');
        setIsLoading(false);
        return;
      }

      // Redirect to dashboard on success
      router.push('/dashboard');
    } catch (err) {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
      }}
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: '#1a1a1a',
          color: '#ffffff',
          padding: '20px',
          textAlign: 'center',
          borderBottom: '1px solid #333',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>EF</h1>
      </header>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '500px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '32px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <h2
              style={{
                margin: '0 0 8px',
                fontSize: '28px',
                fontWeight: 600,
                color: '#111827',
              }}
            >
              Expert Fence Pro
            </h2>

            <p
              style={{
                margin: '0 0 24px',
                fontSize: '16px',
                color: '#6b7280',
              }}
            >
              Start your 14-day free trial
            </p>

            <p
              style={{
                margin: '0 0 18px',
                fontSize: '15px',
                color: '#374151',
                lineHeight: 1.55,
              }}
            >
              Expert Fence is a fencing and balustrading workflow engine built for tradies
              and suppliers. Enter your job measurements and instantly get a complete bill
              of materials with pricing — no more missed components, quoting errors, or
              hours wasted on calculations.
            </p>

            <p
              style={{
                margin: '0 0 20px',
                fontSize: '15px',
                color: '#374151',
                lineHeight: 1.55,
              }}
            >
              Built from years of on-the-tools experience, the platform turns complex
              fencing systems into a simple "enter your job → get what to order" workflow.
              Layout previews, set-out plans and ordering tools are rolling out next.
            </p>

            <div
              style={{
                padding: '16px 18px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                marginBottom: '16px',
              }}
            >
              <p
                style={{
                  margin: '0 0 8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#1e3a8a',
                }}
              >
                Embed the calculators on your own website
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#1e3a8a',
                  lineHeight: 1.55,
                }}
              >
                Suppliers and manufacturers can plug these calculators straight into their
                ecommerce store (WooCommerce / WordPress) as a shortcode, so customers can
                size up a job and add the exact materials to cart in a single flow — no
                double-handling, no quoting guesswork, and every BOM tied to live product
                pricing.
              </p>
            </div>

            <div
              style={{
                padding: '16px 18px',
                backgroundColor: '#fefce8',
                border: '1px solid #fde68a',
                borderRadius: '6px',
                marginBottom: '24px',
              }}
            >
              <p
                style={{
                  margin: '0 0 8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#713f12',
                }}
              >
                What you see here is a sample
              </p>
              <p
                style={{
                  margin: '0 0 10px',
                  fontSize: '14px',
                  color: '#713f12',
                  lineHeight: 1.55,
                }}
              >
                The three calculators above are live examples powered by our core engine.
                The same engine can be tailored to your product range, SKUs, and install
                rules — whatever system you sell, we can generate a calculator for it.
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#713f12',
                  lineHeight: 1.55,
                }}
              >
                <strong>Packages from $4,000 onboarding + $100/month</strong> — tailored
                to your range and how many calculators you need. Get in touch for a quote
                sized to your business.
              </p>
            </div>

            <div
              style={{
                padding: '20px',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                marginBottom: '24px',
                borderLeft: '4px solid #2563eb',
              }}
            >
              <p
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#111827',
                }}
              >
                Full access included during your trial:
              </p>
              <ul
                style={{
                  margin: '0',
                  paddingLeft: '20px',
                  fontSize: '14px',
                  color: '#374151',
                }}
              >
                <li style={{ marginBottom: '8px' }}>
                  <strong>Glass pool fencing</strong> — panels, spigots, gates, hardware
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Aluminium fencing</strong> — Tubular and Finn Barr blade, surface or base-plate mount
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Glass balustrade</strong> — handrail, spigots, panels, colour-matched hardware
                </li>
                <li style={{ marginBottom: '8px' }}>Live layout previews and instant BOMs with pricing</li>
                <li>No credit card required</li>
              </ul>
            </div>

            {/* Error message */}
            {error && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#991b1b',
                }}
              >
                {error}
              </div>
            )}

            {/* Start Free Trial button */}
            <button
              onClick={handleStartFreeTrial}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: isLoading ? '#9ca3af' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.target.style.backgroundColor = '#1d4ed8';
              }}
              onMouseLeave={(e) => {
                if (!isLoading) e.target.style.backgroundColor = '#2563eb';
              }}
            >
              {isLoading ? 'Starting trial...' : 'Start Free Trial'}
            </button>

            {/* Disclaimer */}
            <p
              style={{
                marginTop: '16px',
                fontSize: '12px',
                color: '#9ca3af',
                textAlign: 'center',
              }}
            >
              Trial includes all Pro features. Upgrades available after trial period.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
