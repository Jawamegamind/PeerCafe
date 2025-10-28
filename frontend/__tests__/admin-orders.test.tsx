import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock the Navbar (and any heavy components) to avoid importing server-only Next internals
jest.mock('../app/_components/navbar', () => {
  return function MockNavbar() {
    return React.createElement('div', null, 'Mock Navbar');
  };
});

import AdminOrdersPage from '../app/(main)/admin/orders/page';

describe('AdminOrdersPage', () => {
  beforeEach(() => {
    // Mock fetch for orders and restaurants
    (global as any).fetch = jest.fn((input: RequestInfo) => {
      const url = String(input);
      if (url.endsWith('/orders')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              order_id: 'test-1',
              restaurant_id: 1,
              order_items: [],
              subtotal: 10,
              tax_amount: 0,
              delivery_fee: 0,
              tip_amount: 0,
              discount_amount: 0,
              total_amount: 10,
              status: 'pending',
              created_at: new Date().toISOString(),
              delivery_address: {},
            },
          ],
        });
      }

      if (url.endsWith('/restaurants')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ restaurant_id: 1, name: 'Test Restaurant' }],
        });
      }

      return Promise.resolve({ ok: false, status: 404 });
    });
  });

  it('renders orders and restaurant names', async () => {
    render(<AdminOrdersPage />);

    await waitFor(() =>
      expect(screen.getByText('Order Management')).toBeInTheDocument()
    );

    // restaurant chip should be visible
    await waitFor(() =>
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument()
    );
    // order id should appear
    expect(screen.getByText(/test-1/)).toBeInTheDocument();
  });
});
