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
              Free Trial
            </p>

            <div
              style={{
                padding: '20px',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                marginBottom: '24px',
                borderLeft: '4px solid #2563eb',
              }}
            >
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#374151' }}>
                Get full access to all fencing calculators for 14 days.
              </p>
              <ul
                style={{
                  margin: '0',
                  paddingLeft: '20px',
                  fontSize: '14px',
                  color: '#374151',
                }}
              >
                <li style={{ marginBottom: '8px' }}>Aluminium fencing calculator</li>
                <li style={{ marginBottom: '8px' }}>Glass pool fencing</li>
                <li style={{ marginBottom: '8px' }}>Stainless wire balustrade</li>
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
