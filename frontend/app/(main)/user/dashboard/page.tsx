'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '../../../_components/navbar';

// Component that uses useSearchParams - needs to be wrapped in Suspense
function UserErrorNotification() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  if (error !== 'insufficient_permissions') {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: '#fee2e2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        padding: '12px 16px',
        margin: '20px auto',
        maxWidth: '600px',
        textAlign: 'center',
      }}
    >
      <div style={{ color: '#dc2626', fontSize: '1.1rem', fontWeight: 'bold' }}>
        🚫 Access Denied
      </div>
      <div style={{ color: '#7f1d1d', marginTop: '4px' }}>
        You don't have permission to access admin areas. Contact an
        administrator if you believe this is an error.
      </div>
    </div>
  );
}

export default function UserDashboard() {
  return (
    <>
      <Navbar />

      {/* Show error message if user was redirected due to insufficient permissions */}
      <Suspense fallback={null}>
        <UserErrorNotification />
      </Suspense>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '3rem',
            color: '#2563eb',
            marginBottom: '20px',
          }}
        >
          �️ Welcome to PeerCafe
        </h1>

        <p
          style={{
            fontSize: '1.5rem',
            color: '#64748b',
            marginBottom: '30px',
          }}
        >
          Your gateway to delicious local restaurants
        </p>

        {/* Quick Actions */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            maxWidth: '800px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              padding: '24px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '2px solid #e2e8f0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onClick={() => (window.location.href = '/user/restaurants')}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🍽️</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>
              Browse Restaurants
            </h3>
            <p style={{ margin: '0', color: '#64748b', fontSize: '0.9rem' }}>
              Discover amazing local restaurants and cuisines
            </p>
          </div>

          <div
            style={{
              padding: '24px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '2px solid #e2e8f0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center',
              opacity: 0.6,
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📋</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#757575' }}>My Orders</h3>
            <p style={{ margin: '0', color: '#64748b', fontSize: '0.9rem' }}>
              Coming Soon...
            </p>
          </div>

          <div
            style={{
              padding: '24px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '2px solid #e2e8f0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onClick={() => (window.location.href = '/user/delivery')}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🚚</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#757575' }}>
              Delivery Tracking
            </h3>
            <p style={{ margin: '0', color: '#64748b', fontSize: '0.9rem' }}>
              Discover nearby orders and deliver them to earn awesome rewards!
            </p>
          </div>
        </div>

        <div
          style={{
            marginTop: '30px',
            padding: '15px',
            backgroundColor: '#f1f5f9',
            borderRadius: '8px',
            border: '2px solid #e2e8f0',
          }}
        >
          <strong>Current Route:</strong> /user/dashboard
        </div>
      </div>
    </>
  );
}
