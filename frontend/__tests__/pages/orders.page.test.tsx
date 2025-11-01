import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Set backend URL for tests
process.env.NEXT_PUBLIC_BACKEND_API_URL = 'http://localhost:8000';

// Mock Navbar to keep tests focused
jest.mock('../../app/_components/navbar', () => ({
  __esModule: true,
  default: function MockNavbar() {
    return <div>Navbar Mock</div>;
  },
}));

// Mock Supabase client used by the page
const mockSupabase = {
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'token-abc' } } }),
  },
};

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

// Mock fetch for backend call
const mockOrders = [
  {
    order_id: 'order-1111-aaaa',
    restaurant_id: 5,
    user_id: 'user-1',
    status: 'preparing',
    total_amount: 28.45,
    created_at: '2025-10-31T10:00:00Z',
    updated_at: '2025-10-31T10:05:00Z',
  },
  {
    order_id: 'order-2222-bbbb',
    restaurant_id: 7,
    user_id: 'user-1',
    status: 'delivered',
    total_amount: 16.00,
    created_at: '2025-10-30T12:00:00Z',
    updated_at: '2025-10-30T12:45:00Z',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  // @ts-ignore
  global.fetch = jest.fn(async (url: string, init?: any) => {
    if (url.includes('/api/orders/me')) {
      return {
        ok: true,
        json: async () => mockOrders,
        text: async () => JSON.stringify(mockOrders),
      } as any;
    }
    return { ok: false, json: async () => ({}), text: async () => '' } as any;
  });
});

afterAll(() => {
  // @ts-ignore
  delete global.fetch;
});

import MyOrdersPage from '../../app/(main)/user/orders/page';

describe('My Orders Page', () => {
  it('renders a list of orders and status chips', async () => {
    render(<MyOrdersPage />);

    // Shows loading first
    expect(await screen.findByText(/Loading your orders/i)).toBeInTheDocument();

    // Wait for an order to render
    await waitFor(() => {
      expect(screen.getByText(/My Orders/i)).toBeInTheDocument();
    });

  // Verify items
  expect((await screen.findAllByText(/Order #/i)).length).toBeGreaterThan(0);
    
    // By default, filter is set to 'active', so we should see the preparing order
    expect(screen.getByText('$28.45')).toBeInTheDocument();
    expect(screen.getByText(/Preparing/i)).toBeInTheDocument();
    
    // The delivered order should NOT be visible initially
    expect(screen.queryByText('$16.00')).not.toBeInTheDocument();
    expect(screen.queryByText(/Delivered/i)).not.toBeInTheDocument();
    
    // Switch to "Completed" filter
    const completedButton = screen.getByRole('button', { name: /Completed/i });
    fireEvent.click(completedButton);
    
    // Now the delivered order should be visible
    expect(screen.getByText('$16.00')).toBeInTheDocument();
    expect(screen.getByText(/Delivered/i)).toBeInTheDocument();
    
    // And the preparing order should NOT be visible
    expect(screen.queryByText('$28.45')).not.toBeInTheDocument();
  });
});
