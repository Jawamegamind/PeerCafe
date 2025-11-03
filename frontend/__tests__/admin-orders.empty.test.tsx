import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock the Navbar to avoid heavy Next internals
jest.mock('../app/_components/navbar', () => {
  return function MockNavbar() {
    return React.createElement('div', null, 'Mock Navbar');
  };
});

import AdminOrdersPage from '../app/(main)/admin/orders/page';

describe('AdminOrdersPage empty state', () => {
  beforeEach(() => {
    // orders empty, restaurants empty
    (global as any).fetch = jest.fn((input: RequestInfo) => {
      const url = String(input);
      if (url.endsWith('/orders')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (url.endsWith('/restaurants')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
  });

  it('shows No orders found when there are no orders', async () => {
    render(<AdminOrdersPage />);

    // wait for the page to render and for the fetches to resolve
    await waitFor(() =>
      expect(screen.getByText('Order Management')).toBeInTheDocument()
    );

    // The No orders found message should be displayed
    await waitFor(() =>
      expect(screen.getByText('No orders found.')).toBeInTheDocument()
    );
  });
});
