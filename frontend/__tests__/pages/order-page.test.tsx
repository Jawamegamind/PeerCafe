import React from 'react';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import OrderDetailsPage from '../../app/(main)/user/orders/[orderId]/page';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

// Mock Navbar to avoid CartContext dependency
jest.mock('../../app/_components/navbar', () => ({
  __esModule: true,
  default: function MockNavbar() {
    return <nav data-testid="navbar">Navbar</nav>;
  },
}));

// Mock next/navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock supabase client factory
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}));

const mockPush = jest.fn();
const mockBack = jest.fn();

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
};

// Small deferred helper to create controllable promises from tests
function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject } as {
    promise: Promise<T>;
    resolve: (v: T) => void;
    reject: (e?: any) => void;
  };
}

let authDeferred: ReturnType<typeof deferred> | null = null;

const mockOrder = {
  order_id: 'order-123456789',
  user_id: 'user-123',
  restaurant_id: 1,
  delivery_user_id: 'driver-456',
  order_items: [
    {
      item_id: 1,
      item_name: 'Margherita Pizza',
      price: 12.99,
      quantity: 2,
      subtotal: 25.98,
      special_instructions: 'Extra cheese please',
    },
    {
      item_id: 2,
      item_name: 'Caesar Salad',
      price: 8.99,
      quantity: 1,
      subtotal: 8.99,
    },
  ],
  delivery_address: {
    street: '123 Main St, Apt 4B',
    city: 'San Francisco',
    state: 'CA',
    zip_code: '94105',
    instructions: 'Ring doorbell twice',
  },
  payment_method: 'cash',
  status: 'confirmed',
  subtotal: 34.97,
  tax_amount: 2.8,
  delivery_fee: 3.99,
  tip_amount: 5.0,
  discount_amount: 0,
  total_amount: 46.76,
  notes: 'No onions on pizza',
  estimated_delivery_time: '2025-01-15T18:30:00Z',
  created_at: '2025-01-15T17:00:00Z',
  updated_at: '2025-01-15T17:05:00Z',
};

const baseOrder = {
  order_id: 'order-123456789',
  user_id: 'user-123',
  restaurant_id: 1,
  delivery_user_id: null,
  order_items: [
    { item_id: 1, item_name: 'Test Item', price: 10.0, quantity: 1, subtotal: 10.0 },
  ],
  delivery_address: { street: '1 St', city: 'City', state: 'ST', zip_code: '00000' },
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

  (useRouter as jest.Mock).mockReturnValue({
    push: mockPush,
    back: mockBack,
  });

  (useParams as jest.Mock).mockReturnValue({ orderId: 'order-123456789' });

  (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);

  // Default authenticated user (use a controllable deferred promise)
  authDeferred = deferred<any>();
  mockSupabaseClient.auth.getUser.mockReturnValue(authDeferred.promise);

  mockSupabaseClient.from.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: { user_id: 'user-123', email: 'test@example.com' },
      error: null,
    }),
  });

  // Note: fetch will be controlled per-test using deferred promises when needed.
  // Provide a sensible default fetch mock so tests that don't override it won't fail
  (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => mockOrder });
});

afterEach(() => {
  jest.useRealTimers();
  cleanup();
});

test('shows verifying message while auth is loading', () => {
  render(<OrderDetailsPage />);
  expect(screen.getByText(/verifying your account/i)).toBeInTheDocument();
  expect(screen.getByTestId('navbar')).toBeInTheDocument();
  // Resolve auth to avoid leaving a pending update after the test (prevents act warnings)
  return act(async () => {
    authDeferred!.resolve({ data: { user: { id: 'user-123', email: 'test@example.com' } }, error: null });
  });
});

test('fetches order with correct order id and displays items & totals', async () => {
  render(<OrderDetailsPage />);

  // Resolve authentication so the component proceeds to fetch
  await act(async () => {
    authDeferred!.resolve({ data: { user: { id: 'user-123', email: 'test@example.com' } }, error: null });
  });

  // Wait for authentication flow to settle (auth loading -> fetch)
  await waitFor(() => expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled());
  await waitFor(() => expect((global as any).fetch).toHaveBeenCalled());

  expect((global as any).fetch).toHaveBeenCalledWith(
    'http://localhost:8000/api/orders/order-123456789'
  );

  // Items
  await waitFor(() => {
    expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
    expect(screen.getByText('Caesar Salad')).toBeInTheDocument();
  });

  // Pricing
  expect(screen.getByText('$34.97')).toBeInTheDocument();
  expect(screen.getByText('$46.76')).toBeInTheDocument();
});

test('redirects to login when user not authenticated', async () => {
  mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
    data: { user: null },
    error: new Error('Not authenticated'),
  });

  render(<OrderDetailsPage />);

  // Wait for auth to be called and component to react
  await waitFor(() => expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled());
  await waitFor(() => {
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});

test('shows order not found when fetch returns 404 and browse restaurants navigates', async () => {
  (global as any).fetch.mockResolvedValueOnce({ ok: false, status: 404 });

  render(<OrderDetailsPage />);

  // Resolve authentication so the component proceeds to fetch
  await act(async () => {
    authDeferred!.resolve({ data: { user: { id: 'user-123', email: 'test@example.com' } }, error: null });
  });

  // Wait for authentication to finish and the fetch to run
  await waitFor(() => expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled());
  await waitFor(() => {
    expect(screen.getByText('Order Not Found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse restaurants/i })).toBeInTheDocument();
  });

  await userEvent.click(screen.getByRole('button', { name: /browse restaurants/i }));
  expect(mockPush).toHaveBeenCalledWith('/user/restaurants');
});

test.each([
  ['pending', 'Order Pending', '10'],
  ['confirmed', 'Order Confirmed', '25'],
  ['preparing', 'Preparing Your Food', '50'],
  ['en_route', 'On the Way', '90'],
  ['delivered', 'Delivered', '100'],
  ['cancelled', 'Cancelled', '0'],
])('displays status label and progress for %s', async (status, label, progress) => {
  const order = { ...baseOrder, status };
  (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => order });

  render(<OrderDetailsPage />);

  // Resolve authentication so the component proceeds to fetch
  await act(async () => {
    authDeferred!.resolve({ data: { user: { id: 'user-123', email: 'test@example.com' } }, error: null });
  });

  // Wait for authentication to complete before asserting
  await waitFor(() => expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled());
  await waitFor(() => expect((global as any).fetch).toHaveBeenCalled());

  await waitFor(() => expect(screen.getByText(label)).toBeInTheDocument());

  const progressBar = screen.getByRole('progressbar');
  expect(progressBar).toHaveAttribute('aria-valuenow', progress);
});

test('auto-refreshes order status every 30 seconds', async () => {
  jest.useFakeTimers();

  const initial = { ...baseOrder, status: 'confirmed' };
  const updated = { ...baseOrder, status: 'en_route' };

  (global as any).fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => initial })
    .mockResolvedValueOnce({ ok: true, json: async () => updated });

  render(<OrderDetailsPage />);

  // Resolve authentication so the component proceeds to fetch
  await act(async () => {
    authDeferred!.resolve({ data: { user: { id: 'user-123', email: 'test@example.com' } }, error: null });
  });

  // initial fetch
  await waitFor(() => expect((global as any).fetch).toHaveBeenCalledTimes(1));
  expect(screen.getByText('Order Confirmed')).toBeInTheDocument();

  // advance timers 30s
  await act(async () => {
    jest.advanceTimersByTime(30000);
  });

  await waitFor(() => expect((global as any).fetch).toHaveBeenCalledTimes(2));

  await waitFor(() => expect(screen.getByText('On the Way')).toBeInTheDocument());
});

test('cancel button is enabled for pending orders', async () => {
  (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ...baseOrder, status: 'pending' }) });
  render(<OrderDetailsPage />);
  // Resolve authentication so the component proceeds to fetch
  await act(async () => {
    authDeferred!.resolve({ data: { user: { id: 'user-123', email: 'test@example.com' } }, error: null });
  });

  // Wait for auth and fetch to complete
  await waitFor(() => expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled());
  await waitFor(() => expect((global as any).fetch).toHaveBeenCalled());
  const btn = screen.getByText('Cancel Order');
  expect(btn).toBeInTheDocument();
  expect(btn).not.toBeDisabled();
});

test('cancel button is disabled for preparing orders', async () => {
  (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ...baseOrder, status: 'preparing' }) });
  render(<OrderDetailsPage />);
  // Resolve authentication so the component proceeds to fetch
  await act(async () => {
    authDeferred!.resolve({ data: { user: { id: 'user-123', email: 'test@example.com' } }, error: null });
  });
  // Wait for auth and fetch to complete
  await waitFor(() => expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled());
  await waitFor(() => expect((global as any).fetch).toHaveBeenCalled());
  const btn = screen.getByText('Cancel Order');
  expect(btn).toBeInTheDocument();
  expect(btn).toBeDisabled();
});

test('cancel button is not shown for delivered orders', async () => {
  (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ...baseOrder, status: 'delivered' }) });
  render(<OrderDetailsPage />);
  // Resolve authentication so the component proceeds to fetch
  await act(async () => {
    authDeferred!.resolve({ data: { user: { id: 'user-123', email: 'test@example.com' } }, error: null });
  });

  // Wait for auth and fetch to complete
  await waitFor(() => expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled());
  await waitFor(() => expect((global as any).fetch).toHaveBeenCalled());
  expect(screen.queryByText('Cancel Order')).not.toBeInTheDocument();
});

test('back button calls router.back', async () => {
  (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ...baseOrder, status: 'confirmed' }) });
    render(<OrderDetailsPage />);

  // Resolve authentication so the component proceeds to fetch
  await act(async () => {
    authDeferred!.resolve({ data: { user: { id: 'user-123', email: 'test@example.com' } }, error: null });
  });

  await waitFor(() => expect((global as any).fetch).toHaveBeenCalled());

  const backBtn = screen.getByText('Back');
  await userEvent.click(backBtn);
  expect(mockBack).toHaveBeenCalled();
});
