'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Navbar from '../../../_components/navbar';
import { useSearchParams } from 'next/navigation';

function DashboardContent() {
  const searchParams = useSearchParams();
  const errorParam = searchParams?.get('error');

  const showAccessDenied = errorParam === 'insufficient_permissions';

  return (
    <>
      <Navbar />
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

        {/* Access control message (e.g., redirected from admin area) */}
        {showAccessDenied && (
          <div
            style={{
              maxWidth: '720px',
              marginBottom: '20px',
              padding: '16px',
              borderRadius: '8px',
              border: '2px solid #e2e8f0',
              backgroundColor: '#fff7f7',
              color: '#b91c1c',
            }}
          >
            <div
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                marginBottom: '6px',
              }}
            >
              🚫 Access Denied
            </div>
            <div>
              You don't have permission to access admin areas. Contact an
              administrator if you believe this is an error.
            </div>
          </div>
        )}

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
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onClick={() => (window.location.href = '/user/orders')}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📋</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>My Orders</h3>
            <p style={{ margin: '0', color: '#64748b', fontSize: '0.9rem' }}>
              View your recent and active orders
            </p>
            <p
              style={{
                margin: '6px 0 0',
                color: '#9aa4b2',
                fontSize: '0.85rem',
              }}
            >
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
              // opacity: 0.6
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
            <h3 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>
              Delivery Tracking
            </h3>
            <p style={{ margin: '0', color: '#64748b', fontSize: '0.9rem' }}>
              Discover nearby orders and deliver them to earn awesome rewards!
            </p>
            <p
              style={{
                margin: '6px 0 0',
                color: '#9aa4b2',
                fontSize: '0.85rem',
              }}
            >
              Coming Soon...
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
            color: '#757575',
          }}
        >
          <strong>Current Route:</strong> /user/dashboard
        </div>
      </div>
    </>
  );
}

export default function UserDashboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
