import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
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

beforeEach(() => {
  jest.clearAllMocks();

  (useRouter as jest.Mock).mockReturnValue({
    push: mockPush,
    back: mockBack,
  });

  (useParams as jest.Mock).mockReturnValue({ orderId: 'order-123456789' });

  (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);

  // Default authenticated user (use a controllable deferred promise so tests
  // can resolve it inside act() to avoid act warnings)
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

  // Default successful fetch response
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => mockOrder,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

test('shows verifying message while auth is loading', async () => {
  // initial render shows verifying message while useEffect runs
  render(<OrderDetailsPage />);
  expect(screen.getByText(/verifying your account/i)).toBeInTheDocument();
  expect(screen.getByTestId('navbar')).toBeInTheDocument();

  // resolve auth inside act so subsequent state updates are wrapped
  await act(async () => {
    authDeferred!.resolve({ data: { user: { id: 'user-123' } }, error: null });
  });
});

test('fetches order with correct order id and displays items & totals', async () => {
  render(<OrderDetailsPage />);

  // resolve auth so the page proceeds to fetch
  await act(async () => {
    authDeferred!.resolve({ data: { user: { id: 'user-123' } }, error: null });
  });

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

  await waitFor(() => {
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});

test('shows order not found when fetch returns 404 and browse restaurants navigates', async () => {
  (global as any).fetch.mockResolvedValueOnce({ ok: false, status: 404 });

  render(<OrderDetailsPage />);

  // resolve auth so the component proceeds to fetch
  await act(async () => {
    authDeferred!.resolve({ data: { user: { id: 'user-123' } }, error: null });
  });

  await waitFor(() => {
    expect(screen.getByText('Order Not Found')).toBeInTheDocument();
    // shorter fallback text appears in the DOM
    expect(
      screen.getByRole('button', { name: /browse restaurants/i })
    ).toBeInTheDocument();
  });

  await userEvent.click(
    screen.getByRole('button', { name: /browse restaurants/i })
  );
  expect(mockPush).toHaveBeenCalledWith('/user/restaurants');
});
