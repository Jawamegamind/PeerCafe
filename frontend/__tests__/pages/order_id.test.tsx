import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import OrderDetailsPage from '../../app/(main)/user/orders/[orderId]/page';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

// Mock the Navbar component
jest.mock('../../../../app/_components/navbar', () => {
  return function MockNavbar() {
    return <nav data-testid="navbar">Navbar</nav>;
  };
});

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockPush = jest.fn();
const mockBack = jest.fn();

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
};

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
  tax_amount: 2.80,
  delivery_fee: 3.99,
  tip_amount: 5.00,
  discount_amount: 0,
  total_amount: 46.76,
  notes: 'No onions on pizza',
  estimated_delivery_time: '2025-01-15T18:30:00Z',
  created_at: '2025-01-15T17:00:00Z',
  updated_at: '2025-01-15T17:05:00Z',
};

describe('Order Details Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
    });
    
    (useParams as jest.Mock).mockReturnValue({
      orderId: 'order-123456789',
    });
    
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    
    // Default authenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { user_id: 'user-123', email: 'test@example.com' },
        error: null,
      }),
    });

    // Default successful fetch response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockOrder,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders navbar component', async () => {
    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('navbar')).toBeInTheDocument();
    });
  });

  it('shows loading state while verifying authentication', () => {
    render(<OrderDetailsPage />);
    
    expect(screen.getByText(/verifying your account/i)).toBeInTheDocument();
  });

  it('redirects to login if user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Not authenticated'),
    });

    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('displays loading state while fetching order', async () => {
    render(<OrderDetailsPage />);
    
    expect(screen.getByText(/loading order details/i)).toBeInTheDocument();
  });

  it('fetches order details with correct order ID', async () => {
    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/orders/order-123456789');
    });
  });

  it('displays order not found when order does not exist', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Order Not Found')).toBeInTheDocument();
      expect(screen.getByText(/the order you are looking for could not be found/i)).toBeInTheDocument();
    });
  });

  it('displays error when order belongs to different user', async () => {
    const differentUserOrder = { ...mockOrder, user_id: 'different-user' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => differentUserOrder,
    });

    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/you do not have permission to view this order/i)).toBeInTheDocument();
    });
  });

  it('renders order header with order ID and date', async () => {
    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/order #23456789/i)).toBeInTheDocument();
      expect(screen.getByText(/placed on/i)).toBeInTheDocument();
    });
  });

  it('displays order status with correct chip', async () => {
    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Order Confirmed')).toBeInTheDocument();
    });
  });

  it('displays progress bar for order status', async () => {
    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '25');
    });
  });

  it('displays estimated delivery time', async () => {
    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/estimated delivery:/i)).toBeInTheDocument();
    });
  });

  it('displays all order items with correct details', async () => {
    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
      expect(screen.getByText('Caesar Salad')).toBeInTheDocument();
      expect(screen.getByText(/\$12\.99 × 2/)).toBeInTheDocument();
      expect(screen.getByText(/\$8\.99 × 1/)).toBeInTheDocument();
    });
  });

  it('displays special instructions for items', async () => {
    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/note: extra cheese please/i)).toBeInTheDocument();
    });
  });

  it('displays correct pricing breakdown', async () => {
    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Subtotal')).toBeInTheDocument();
      expect(screen.getByText('$34.97')).toBeInTheDocument();
      expect(screen.getByText('Tax')).toBeInTheDocument();
      expect(screen.getByText('$2.80')).toBeInTheDocument();
      expect(screen.getByText('Delivery Fee')).toBeInTheDocument();
      expect(screen.getByText('$3.99')).toBeInTheDocument();
      expect(screen.getByText('Tip')).toBeInTheDocument();
      expect(screen.getByText('$5.00')).toBeInTheDocument();
    });
  });

  it('displays correct total amount', async () => {
    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('$46.76')).toBeInTheDocument();
    });
  });

  it('displays delivery address correctly', async () => {
    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('123 Main St, Apt 4B')).toBeInTheDocument();
      expect(screen.getByText(/san francisco, ca 94105/i)).toBeInTheDocument();
      expect(screen.getByText(/instructions: ring doorbell twice/i)).toBeInTheDocument();
    });
  });

  it('displays payment method', async () => {
    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/payment method: cash on delivery/i)).toBeInTheDocument();
    });
  });

  it('displays order notes when present', async () => {
    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Special Instructions:')).toBeInTheDocument();
      expect(screen.getByText('No onions on pizza')).toBeInTheDocument();
    });
  });

  it('displays delivery driver assigned status', async () => {
    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Delivery Driver')).toBeInTheDocument();
      expect(screen.getByText('Assigned')).toBeInTheDocument();
    });
  });

  it('displays full order ID in sidebar', async () => {
    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('order-123456789')).toBeInTheDocument();
    });
  });

  it('navigates back when back button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Back'));
    
    expect(mockBack).toHaveBeenCalled();
  });

  it('navigates to restaurants when order again is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Order Again')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Order Again'));
    
    expect(mockPush).toHaveBeenCalledWith('/user/restaurants');
  });

  it('displays cancel order button for pending orders', async () => {
    const pendingOrder = { ...mockOrder, status: 'pending' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => pendingOrder,
    });

    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      const cancelButton = screen.getByText('Cancel Order');
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).not.toBeDisabled();
    });
  });

  it('disables cancel order button for preparing orders', async () => {
    const preparingOrder = { ...mockOrder, status: 'preparing' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => preparingOrder,
    });

    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      const cancelButton = screen.getByText('Cancel Order');
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).toBeDisabled();
    });
  });

  it('does not show cancel button for delivered orders', async () => {
    const deliveredOrder = { ...mockOrder, status: 'delivered' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => deliveredOrder,
    });

    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.queryByText('Cancel Order')).not.toBeInTheDocument();
    });
  });

  it('displays correct status for delivered orders', async () => {
    const deliveredOrder = { ...mockOrder, status: 'delivered' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => deliveredOrder,
    });

    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Delivered')).toBeInTheDocument();
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });
  });

  it('displays correct status for cancelled orders', async () => {
    const cancelledOrder = { ...mockOrder, status: 'cancelled' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => cancelledOrder,
    });

    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });
  });

  it('displays correct status for en_route orders', async () => {
    const enRouteOrder = { ...mockOrder, status: 'en_route' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => enRouteOrder,
    });

    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('On the Way')).toBeInTheDocument();
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '90');
    });
  });

  it('auto-refreshes order status every 30 seconds for active orders', async () => {
    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Order Confirmed')).toBeInTheDocument();
    });

    // Initial fetch
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Fast-forward 30 seconds
    jest.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('does not auto-refresh for delivered orders', async () => {
    const deliveredOrder = { ...mockOrder, status: 'delivered' };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => deliveredOrder,
    });

    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Delivered')).toBeInTheDocument();
    });

    // Initial fetch
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Fast-forward 30 seconds
    jest.advanceTimersByTime(30000);

    // Should not make another fetch
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('displays discount when present', async () => {
    const discountedOrder = { ...mockOrder, discount_amount: 5.00 };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => discountedOrder,
    });

    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Discount')).toBeInTheDocument();
      expect(screen.getByText('-$5.00')).toBeInTheDocument();
    });
  });

  it('does not display discount when amount is zero', async () => {
    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.queryByText('Discount')).not.toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('navigates to restaurants from error state', async () => {
    const user = userEvent.setup({ delay: null });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Browse Restaurants')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Browse Restaurants'));
    
    expect(mockPush).toHaveBeenCalledWith('/user/restaurants');
  });

  it('formats order date correctly', async () => {
    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      const dateElement = screen.getByText(/placed on/i);
      expect(dateElement).toBeInTheDocument();
    });
  });

  it('displays item subtotals correctly', async () => {
    render(<OrderDetailsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('$25.98')).toBeInTheDocument();
      expect(screen.getByText('$8.99')).toBeInTheDocument();
    });
  });
});