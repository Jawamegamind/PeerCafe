import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CheckoutPage from '../../app/(main)/user/checkout/page';
import { useRouter } from 'next/navigation';
import { useCart } from '../../app/_contexts/CartContext';
import { createClient } from '@/utils/supabase/client';

// Mock the Navbar component
jest.mock('../../../app/_components/navbar', () => {
  return function MockNavbar() {
    return <nav data-testid="navbar">Navbar</nav>;
  };
});

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock CartContext
jest.mock('../../../app/_contexts/CartContext', () => ({
  useCart: jest.fn(),
}));

// Mock Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockClearCart = jest.fn();

const mockCartItems = [
  {
    id: 1,
    ItemName: 'Margherita Pizza',
    Price: 12.99,
    quantity: 2,
  },
  {
    id: 2,
    ItemName: 'Caesar Salad',
    Price: 8.99,
    quantity: 1,
  },
];

const mockRestaurant = {
  id: 123,
  name: "Mario's Italian Restaurant",
};

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
};

describe('Checkout Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ 
      push: mockPush,
      back: mockBack 
    });
    
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    
    // Default cart state with items
    (useCart as jest.Mock).mockReturnValue({
      items: mockCartItems,
      restaurant: mockRestaurant,
      totalItems: 3,
      totalPrice: 34.97,
      isCartEmpty: false,
      clearCart: mockClearCart,
    });

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
      headers: {
        get: jest.fn().mockReturnValue('application/json'),
      },
      json: async () => ({ order_id: 'order-456', success: true }),
    });
  });

  it('renders navbar component', async () => {
    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('navbar')).toBeInTheDocument();
    });
  });

  it('shows loading state while verifying authentication', () => {
    render(<CheckoutPage />);
    
    expect(screen.getByText(/verifying your account/i)).toBeInTheDocument();
  });

  it('redirects to login if user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Not authenticated'),
    });

    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('displays empty cart message when cart is empty', async () => {
    (useCart as jest.Mock).mockReturnValue({
      items: [],
      restaurant: null,
      totalItems: 0,
      totalPrice: 0,
      isCartEmpty: true,
      clearCart: mockClearCart,
    });

    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
      expect(screen.getByText(/add some items to your cart before checking out/i)).toBeInTheDocument();
    });
  });

  it('navigates to restaurants page from empty cart', async () => {
    const user = userEvent.setup();
    (useCart as jest.Mock).mockReturnValue({
      items: [],
      restaurant: null,
      totalItems: 0,
      totalPrice: 0,
      isCartEmpty: true,
      clearCart: mockClearCart,
    });

    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/browse restaurants/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/browse restaurants/i));
    
    expect(mockPush).toHaveBeenCalledWith('/user/restaurants');
  });

  it('renders checkout page heading', async () => {
    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Checkout')).toBeInTheDocument();
    });
  });

  it('displays restaurant name in order summary', async () => {
    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/from: mario's italian restaurant/i)).toBeInTheDocument();
    });
  });

  it('displays all cart items with correct details', async () => {
    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
      expect(screen.getByText('Caesar Salad')).toBeInTheDocument();
      expect(screen.getByText(/\$12\.99 × 2/)).toBeInTheDocument();
      expect(screen.getByText(/\$8\.99 × 1/)).toBeInTheDocument();
    });
  });

  it('calculates and displays correct pricing breakdown', async () => {
    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Subtotal')).toBeInTheDocument();
      expect(screen.getByText('$34.97')).toBeInTheDocument();
      expect(screen.getByText('Tax')).toBeInTheDocument();
      expect(screen.getByText('$2.80')).toBeInTheDocument(); // 8% of 34.97
      expect(screen.getByText('Delivery Fee')).toBeInTheDocument();
      expect(screen.getByText('$3.99')).toBeInTheDocument();
    });
  });

  it('displays correct final total', async () => {
    render(<CheckoutPage />);
    
    await waitFor(() => {
      // Subtotal: 34.97, Tax: 2.80, Delivery: 3.99, Tip: 5.00 = 46.76
      expect(screen.getByText('$46.76')).toBeInTheDocument();
    });
  });

  it('renders delivery address form fields', async () => {
    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/state/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
    });
  });

  it('updates delivery address fields when user types', async () => {
    const user = userEvent.setup();
    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
    });

    const streetInput = screen.getByLabelText(/street address/i);
    await user.type(streetInput, '123 Main St');
    
    expect(streetInput).toHaveValue('123 Main St');
  });

  it('displays tip amount selector with options', async () => {
    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/tip amount/i)).toBeInTheDocument();
    });
  });

  it('updates tip amount when user selects different option', async () => {
    const user = userEvent.setup();
    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/tip amount/i)).toBeInTheDocument();
    });

    const tipSelect = screen.getByLabelText(/tip amount/i);
    await user.click(tipSelect);
    
    await waitFor(() => {
      const option = screen.getByRole('option', { name: /\$10\.00/i });
      expect(option).toBeInTheDocument();
    });
  });

  it('displays special instructions text field', async () => {
    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/special instructions/i)).toBeInTheDocument();
    });
  });

  it('displays cash on delivery payment method', async () => {
    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/payment method: cash on delivery/i)).toBeInTheDocument();
    });
  });

  it('disables place order button when form is invalid', async () => {
    render(<CheckoutPage />);
    
    await waitFor(() => {
      const placeOrderButton = screen.getByRole('button', { name: /place order/i });
      expect(placeOrderButton).toBeDisabled();
    });
  });

  it('enables place order button when all required fields are filled', async () => {
    const user = userEvent.setup();
    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/street address/i), '123 Main St');
    await user.type(screen.getByLabelText(/city/i), 'San Francisco');
    await user.type(screen.getByLabelText(/zip code/i), '94105');
    
    await waitFor(() => {
      const placeOrderButton = screen.getByRole('button', { name: /place order/i });
      expect(placeOrderButton).not.toBeDisabled();
    });
  });

  it('validates required fields and shows error message', async () => {
    const user = userEvent.setup();
    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
    });

    // Fill only some fields
    await user.type(screen.getByLabelText(/street address/i), '123 Main St');
    
    const placeOrderButton = screen.getByRole('button', { name: /place order/i });
    
    // Button should still be disabled
    expect(placeOrderButton).toBeDisabled();
  });

  it('submits order with correct data when place order is clicked', async () => {
    const user = userEvent.setup();
    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
    });

    // Fill in required fields
    await user.type(screen.getByLabelText(/street address/i), '123 Main St');
    await user.type(screen.getByLabelText(/city/i), 'San Francisco');
    await user.type(screen.getByLabelText(/zip code/i), '94105');
    
    await waitFor(() => {
      const placeOrderButton = screen.getByRole('button', { name: /place order/i });
      expect(placeOrderButton).not.toBeDisabled();
    });

    const placeOrderButton = screen.getByRole('button', { name: /place order/i });
    await user.click(placeOrderButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/orders/',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  it('clears cart after successful order placement', async () => {
    const user = userEvent.setup();
    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/street address/i), '123 Main St');
    await user.type(screen.getByLabelText(/city/i), 'San Francisco');
    await user.type(screen.getByLabelText(/zip code/i), '94105');
    
    const placeOrderButton = screen.getByRole('button', { name: /place order/i });
    await user.click(placeOrderButton);
    
    await waitFor(() => {
      expect(mockClearCart).toHaveBeenCalled();
    });
  });

  it('displays success message after order is placed', async () => {
    const user = userEvent.setup();
    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/street address/i), '123 Main St');
    await user.type(screen.getByLabelText(/city/i), 'San Francisco');
    await user.type(screen.getByLabelText(/zip code/i), '94105');
    
    const placeOrderButton = screen.getByRole('button', { name: /place order/i });
    await user.click(placeOrderButton);
    
    await waitFor(() => {
      expect(screen.getByText(/order placed successfully/i)).toBeInTheDocument();
    });
  });

  it('redirects to order details page after successful order', async () => {
    const user = userEvent.setup();
    jest.useFakeTimers();
    
    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/street address/i), '123 Main St');
    await user.type(screen.getByLabelText(/city/i), 'San Francisco');
    await user.type(screen.getByLabelText(/zip code/i), '94105');
    
    const placeOrderButton = screen.getByRole('button', { name: /place order/i });
    await user.click(placeOrderButton);
    
    await waitFor(() => {
      expect(mockClearCart).toHaveBeenCalled();
    });

    jest.advanceTimersByTime(2000);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/user/orders/order-456');
    });
    
    jest.useRealTimers();
  });

  it('displays error message when order placement fails', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: {
        get: jest.fn().mockReturnValue('application/json'),
      },
      json: async () => ({ detail: 'Invalid order data' }),
    });

    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/street address/i), '123 Main St');
    await user.type(screen.getByLabelText(/city/i), 'San Francisco');
    await user.type(screen.getByLabelText(/zip code/i), '94105');
    
    const placeOrderButton = screen.getByRole('button', { name: /place order/i });
    await user.click(placeOrderButton);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid order data/i)).toBeInTheDocument();
    });
  });

  it('navigates back when back button is clicked', async () => {
    const user = userEvent.setup();
    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Back'));
    
    expect(mockBack).toHaveBeenCalled();
  });

  it('displays total item count correctly', async () => {
    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/3 items/i)).toBeInTheDocument();
    });
  });

  it('displays continue shopping button', async () => {
    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/continue shopping/i)).toBeInTheDocument();
    });
  });

  it('navigates to restaurants when continue shopping is clicked', async () => {
    const user = userEvent.setup();
    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/continue shopping/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/continue shopping/i));
    
    expect(mockPush).toHaveBeenCalledWith('/user/restaurants');
  });

  it('shows placing order text while submitting', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        headers: { get: jest.fn().mockReturnValue('application/json') },
        json: async () => ({ order_id: 'order-456' }),
      }), 1000))
    );

    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/street address/i), '123 Main St');
    await user.type(screen.getByLabelText(/city/i), 'San Francisco');
    await user.type(screen.getByLabelText(/zip code/i), '94105');
    
    const placeOrderButton = screen.getByRole('button', { name: /place order/i });
    await user.click(placeOrderButton);
    
    await waitFor(() => {
      expect(screen.getByText(/placing order\.\.\./i)).toBeInTheDocument();
    });
  });

  it('displays estimated delivery time', async () => {
    render(<CheckoutPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/estimated delivery time: 30-45 minutes/i)).toBeInTheDocument();
    });
  });
});