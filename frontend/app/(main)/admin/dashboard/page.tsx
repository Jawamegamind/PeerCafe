'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '../../../_components/navbar';

// Component that uses useSearchParams - needs to be wrapped in Suspense
function AdminNotification() {
  const searchParams = useSearchParams();
  const info = searchParams.get('info');

  if (info !== 'admin_redirect') {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: '#dbeafe',
        border: '1px solid #93c5fd',
        borderRadius: '8px',
        padding: '12px 16px',
        margin: '20px auto',
        maxWidth: '600px',
        textAlign: 'center',
      }}
    >
      <div style={{ color: '#1e40af', fontSize: '1.1rem', fontWeight: 'bold' }}>
        ℹ️ Admin Access Notice
      </div>
      <div style={{ color: '#1e3a8a', marginTop: '4px' }}>
        You've been redirected to the admin dashboard. Admin accounts cannot
        access regular user areas.
      </div>
    </div>
  );
}

// Component for debug info that uses useSearchParams
function DebugInfo() {
  const searchParams = useSearchParams();

  return (
    <div
      style={{
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#f1f5f9',
        borderRadius: '8px',
        border: '2px solid #e2e8f0',
      }}
    >
      <strong>Current Route:</strong> /admin/dashboard
      <br />
      <small style={{ color: '#64748b' }}>
        URL Parameters: {searchParams.toString() || 'none'}
      </small>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <>
      <Navbar />

      {/* Show info message if admin was redirected from user routes */}
      <Suspense fallback={null}>
        <AdminNotification />
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
          🛠️ Admin Dashboard
        </h1>

        <p
          style={{
            fontSize: '1.5rem',
            color: '#64748b',
            marginBottom: '30px',
          }}
        >
          Welcome to the PeerCafe Administration Panel
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
            onClick={() => (window.location.href = '/admin/restaurants')}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🏪</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>
              Restaurant Management
            </h3>
            <p style={{ margin: '0', color: '#64748b', fontSize: '0.9rem' }}>
              Add, edit, and manage restaurants
            </p>
          </div>

          {/* Order Management quick action */}
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
            onClick={() => (window.location.href = '/admin/orders')}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }}
            role="button"
            aria-label="Go to Order Management"
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🧾</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>
              Order Management
            </h3>
            <p style={{ margin: '0', color: '#64748b', fontSize: '0.9rem' }}>
              View and manage customer orders
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
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>👥</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#757575' }}>
              User Management
            </h3>
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
              opacity: 0.6,
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📊</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#757575' }}>Analytics</h3>
            <p style={{ margin: '0', color: '#64748b', fontSize: '0.9rem' }}>
              Coming Soon...
            </p>
          </div>
        </div>

        <Suspense
          fallback={
            <div
              style={{
                marginTop: '30px',
                padding: '15px',
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                border: '2px solid #e2e8f0',
              }}
            >
              Loading debug info...
            </div>
          }
        >
          <DebugInfo />
        </Suspense>
      </div>
    </>
  );
}
