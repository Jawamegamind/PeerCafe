'use client';

import * as React from 'react';
import Navbar from '../../../_components/navbar';

export default function AdminDashboard() {
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
        </div>
      </div>
    </>
  );
}
