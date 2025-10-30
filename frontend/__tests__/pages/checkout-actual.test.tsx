/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import '@testing-library/jest-dom';
import CheckoutPage from '../../app/(main)/user/checkout/page';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
};

jest.mock('../../utils/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

// Mock Cart Context with items
const mockCartContext = {
  addItem: jest.fn(),
  updateItemQuantity: jest.fn(),
  removeItem: jest.fn(),
  items: [
    {
      id: 1,
      ItemName: 'Margherita Pizza',
      Price: 18.99,
      quantity: 2,
    },
    {
      id: 2,
      ItemName: 'Caesar Salad',
      Price: 12.50,
      quantity: 1,
    },
  ],
  restaurant: {
    id: 1,
    name: 'Pizza Palace',
  },
  setRestaurant: jest.fn(),
  totalItems: 3,
  totalPrice: 50.48, // (18.99 * 2) + 12.50
  isCartEmpty: false,
  clearCart: jest.fn(),
};

const mockEmptyCartContext = {
  addItem: jest.fn(),
  updateItemQuantity: jest.fn(),
  removeItem: jest.fn(),
  items: [],
  restaurant: null,
  setRestaurant: jest.fn(),
  totalItems: 0,
  totalPrice: 0,
  isCartEmpty: true,
  clearCart: jest.fn(),
};

jest.mock('../../app/_contexts/CartContext', () => ({
  useCart: jest.fn(() => mockCartContext),
}));

// Mock Navbar component
jest.mock('../../app/_components/navbar', () => {
  return function MockNavbar() {
    return <div data-testid="navbar">Navbar</div>;
  };
});

const mockPush = jest.fn();
const mockBack = jest.fn();

describe('CheckoutPage', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
    });

    // Reset all mocks
    jest.clearAllMocks();

    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { user_id: 'user-123', name: 'Test User' },
            error: null,
          }),
        }),
      }),
    });
  });

  describe('Authentication and Loading', () => {
    it('shows loading state while verifying account', () => {
      // Mock never-resolving auth check
      mockSupabase.auth.getUser.mockImplementation(() => new Promise(() => {}));

      render(<CheckoutPage />);

      expect(screen.getByTestId('navbar')).toBeInTheDocument();
    });

    it('redirects to login when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      render(<CheckoutPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('Checkout Page Rendering', () => {
    beforeEach(async () => {
      const { useCart } = require('../../app/_contexts/CartContext');
      useCart.mockReturnValue(mockCartContext);

      render(<CheckoutPage />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Checkout')).toBeInTheDocument();
      });
    });

    it('renders checkout page with cart items', () => {
      expect(screen.getByText('Checkout')).toBeInTheDocument();
      expect(screen.getAllByText('Order Summary')).toHaveLength(2); // One in main section, one in sidebar
      expect(screen.getByText('From: Pizza Palace')).toBeInTheDocument();
    });

    it('displays cart items correctly', () => {
      expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
      expect(screen.getByText('Caesar Salad')).toBeInTheDocument();
      expect(screen.getByText('$18.99 × 2')).toBeInTheDocument();
      expect(screen.getByText('$12.50 × 1')).toBeInTheDocument();
    });

    it('shows order totals section', () => {
      // Check if pricing section exists
      expect(screen.getByText('Subtotal')).toBeInTheDocument();
      expect(screen.getByText('Tax')).toBeInTheDocument(); // Just "Tax", not "Tax (8%)"
      expect(screen.getByText('Delivery Fee')).toBeInTheDocument();
      expect(screen.getByText('Tip')).toBeInTheDocument();
    });

    it('has back navigation button', () => {
      const backButton = screen.getByRole('button', { name: /Back/ });
      expect(backButton).toBeInTheDocument();
    });
  });

  describe('Empty Cart State', () => {
    it('shows empty cart message when cart is empty', async () => {
      const { useCart } = require('../../app/_contexts/CartContext');
      useCart.mockReturnValue(mockEmptyCartContext);

      render(<CheckoutPage />);

      await waitFor(() => {
        expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
        expect(screen.getByText('Add some items to your cart before checking out.')).toBeInTheDocument();
      });
    });

    it('shows browse restaurants button when cart is empty', async () => {
      const { useCart } = require('../../app/_contexts/CartContext');
      useCart.mockReturnValue(mockEmptyCartContext);

      render(<CheckoutPage />);

      await waitFor(() => {
        const browseButton = screen.getByText('Browse Restaurants');
        expect(browseButton).toBeInTheDocument();
      });
    });

    it('navigates to restaurants page when browse button is clicked', async () => {
      const { useCart } = require('../../app/_contexts/CartContext');
      useCart.mockReturnValue(mockEmptyCartContext);

      render(<CheckoutPage />);

      await waitFor(() => {
        const browseButton = screen.getByText('Browse Restaurants');
        fireEvent.click(browseButton);
        expect(mockPush).toHaveBeenCalledWith('/user/restaurants');
      });
    });
  });

  describe('Navigation', () => {
    beforeEach(async () => {
      const { useCart } = require('../../app/_contexts/CartContext');
      useCart.mockReturnValue(mockCartContext);

      render(<CheckoutPage />);

      await waitFor(() => {
        expect(screen.getByText('Checkout')).toBeInTheDocument();
      });
    });

    it('navigates back when back button is clicked', () => {
      const backButton = screen.getByRole('button', { name: /Back/ });
      fireEvent.click(backButton);

      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      const { useCart } = require('../../app/_contexts/CartContext');
      useCart.mockReturnValue(mockCartContext);

      render(<CheckoutPage />);

      await waitFor(() => {
        expect(screen.getByText('Checkout')).toBeInTheDocument();
      });
    });

    it('has proper heading structure', () => {
      expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { name: 'Order Summary' })).toHaveLength(2); // Two "Order Summary" headings
    });

    it('has accessible buttons', () => {
      const backButton = screen.getByRole('button', { name: /Back/ });
      expect(backButton).toBeInTheDocument();
    });
  });

  describe('Cart Integration', () => {
    it('displays correct item quantities', async () => {
      const { useCart } = require('../../app/_contexts/CartContext');
      useCart.mockReturnValue(mockCartContext);

      render(<CheckoutPage />);

      await waitFor(() => {
        expect(screen.getByText('$18.99 × 2')).toBeInTheDocument();
        expect(screen.getByText('$12.50 × 1')).toBeInTheDocument();
      });
    });

    it('shows restaurant information', async () => {
      const { useCart } = require('../../app/_contexts/CartContext');
      useCart.mockReturnValue(mockCartContext);

      render(<CheckoutPage />);

      await waitFor(() => {
        expect(screen.getByText('From: Pizza Palace')).toBeInTheDocument();
      });
    });
  });
});