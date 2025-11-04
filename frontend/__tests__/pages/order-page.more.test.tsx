import React from 'react';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import OrderDetailsPage from '../../app/(main)/user/orders/[orderId]/page';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

jest.mock('../../app/_components/navbar', () => ({
  __esModule: true,
  default: function MockNavbar() {
    return <nav data-testid="navbar">Navbar</nav>;
  },
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}));

const mockPush = jest.fn();
const mockBack = jest.fn();

const mockSupabaseClient = {
  auth: { getUser: jest.fn() },
  from: jest.fn(),
};

const baseOrder = {
  order_id: 'order-123456789',
  user_id: 'user-123',
  restaurant_id: 1,
  delivery_user_id: null,
  order_items: [
    {
      item_id: 1,
      item_name: 'Test Item',
      price: 10.0,
      quantity: 1,
      subtotal: 10.0,
    },
  ],
  delivery_address: {
    street: '1 St',
    city: 'City',
    state: 'ST',
    zip_code: '00000',
  },
  payment_method: 'cash',
  subtotal: 10.0,
  tax_amount: 1.0,
  delivery_fee: 2.0,
  tip_amount: 0,
  discount_amount: 0,
  total_amount: 13.0,
  notes: '',
  created_at: '2025-01-01T12:00:00Z',
  updated_at: '2025-01-01T12:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue({ push: mockPush, back: mockBack });
  (useParams as jest.Mock).mockReturnValue({ orderId: 'order-123456789' });
  (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);

  mockSupabaseClient.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-123' } },
    error: null,
  });
  mockSupabaseClient.from.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest
      .fn()
      .mockResolvedValue({ data: { user_id: 'user-123' }, error: null }),
  });
});

afterEach(() => {
  jest.useRealTimers();
});

test.each([
  ['pending', 'Order Pending', '10'],
  ['confirmed', 'Order Confirmed', '25'],
  ['preparing', 'Preparing Your Food', '50'],
  ['en_route', 'On the Way', '90'],
  ['delivered', 'Delivered', '100'],
  ['cancelled', 'Cancelled', '0'],
])(
  'displays status label and progress for %s',
  async (status, label, progress) => {
    const order = { ...baseOrder, status };
    (global as any).fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => order });

    render(<OrderDetailsPage />);

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalled());

    // Chip label
    await waitFor(() => expect(screen.getByText(label)).toBeInTheDocument());

    // progress bar value
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', progress);
  }
);

test('auto-refreshes order status every 30 seconds', async () => {
  jest.useFakeTimers();

  const initial = { ...baseOrder, status: 'confirmed' };
  const updated = { ...baseOrder, status: 'en_route' };

  (global as any).fetch = jest
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => initial })
    .mockResolvedValueOnce({ ok: true, json: async () => updated });

  render(<OrderDetailsPage />);

  // initial fetch
  await waitFor(() => expect((global as any).fetch).toHaveBeenCalledTimes(1));
  expect(screen.getByText('Order Confirmed')).toBeInTheDocument();

  // advance timers 30s
  await act(async () => {
    jest.advanceTimersByTime(30000);
  });

  await waitFor(() => expect((global as any).fetch).toHaveBeenCalledTimes(2));

  // updated label should appear
  await waitFor(() =>
    expect(screen.getByText('On the Way')).toBeInTheDocument()
  );
});

test('cancel button is enabled for pending orders', async () => {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ...baseOrder, status: 'pending' }),
  });
  render(<OrderDetailsPage />);
  await waitFor(() => expect((global as any).fetch).toHaveBeenCalled());
  const btn = screen.getByText('Cancel Order');
  expect(btn).toBeInTheDocument();
  expect(btn).not.toBeDisabled();
  cleanup();
});

test('cancel button is disabled for preparing orders', async () => {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ...baseOrder, status: 'preparing' }),
  });
  render(<OrderDetailsPage />);
  await waitFor(() => expect((global as any).fetch).toHaveBeenCalled());
  const btn = screen.getByText('Cancel Order');
  expect(btn).toBeInTheDocument();
  expect(btn).toBeDisabled();
  cleanup();
});

test('cancel button is not shown for delivered orders', async () => {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ...baseOrder, status: 'delivered' }),
  });
  render(<OrderDetailsPage />);
  await waitFor(() => expect((global as any).fetch).toHaveBeenCalled());
  expect(screen.queryByText('Cancel Order')).not.toBeInTheDocument();
  cleanup();
});

test('back button calls router.back', async () => {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ...baseOrder, status: 'confirmed' }),
  });
  render(<OrderDetailsPage />);
  await waitFor(() => expect((global as any).fetch).toHaveBeenCalled());

  const backBtn = screen.getByText('Back');
  await userEvent.click(backBtn);
  expect(mockBack).toHaveBeenCalled();
});
