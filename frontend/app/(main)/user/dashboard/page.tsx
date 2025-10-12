"use client"

import * as React from 'react';
import Navbar from "../../../_components/navbar";

export default function UserDashboard() {
  return (
    <>
      <Navbar />
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          fontSize: '3rem', 
          color: '#2563eb', 
          marginBottom: '20px' 
        }}>
          🎯 User Dashboard
        </h1>
        
        <p style={{ 
          fontSize: '1.5rem', 
          color: '#64748b', 
          marginBottom: '10px' 
        }}>
          ✅ Route verification successful!
        </p>
        
        <p style={{ 
          fontSize: '1.2rem', 
          color: '#475569',
          maxWidth: '600px'
        }}>
          You have successfully navigated to the user dashboard. 
          This confirms that your routing is working correctly and 
          you've reached the protected user area of PeerCafe.
        </p>
        
        <div style={{
          marginTop: '30px',
          padding: '15px',
          backgroundColor: '#f1f5f9',
          borderRadius: '8px',
          border: '2px solid #e2e8f0'
        }}>
          <strong>Current Route:</strong> /user/dashboard
        </div>
      </div>
    </>
  )
}