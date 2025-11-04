import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import EditRestaurantPage from '../../app/(main)/admin/restaurants/[restaurantId]/edit/page';
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock Navbar component
jest.mock('../../app/_components/navbar', () => {
  return function MockNavbar() {
    return <nav data-testid="navbar">Navigation</nav>;
  };
});

const mockPush = jest.fn();
const mockBack = jest.fn();

const mockRouter = {
  push: mockPush,
  back: mockBack,
};

const mockParams = {
  restaurantId: '1',
};

describe('EditRestaurantPage', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue(mockParams);
    jest.clearAllMocks();
  });

  const mockRestaurantData = {
    restaurant_id: 1,
    name: 'Test Restaurant',
    description: 'A great test restaurant',
    cuisine_type: 'Italian',
    address: '123 Test St',
    phone: '555-123-4567',
    email: 'test@restaurant.com',
    rating: 4.5,
    delivery_fee: 3.99,
    is_active: true,
  };

  it('renders edit restaurant page correctly', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRestaurantData,
    });

    render(<EditRestaurantPage />);

    expect(screen.getByTestId('navbar')).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Restaurant')).toBeInTheDocument();
    });

    expect(
      screen.getByDisplayValue('A great test restaurant')
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('Italian')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123 Test St')).toBeInTheDocument();
    expect(screen.getByDisplayValue('555-123-4567')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@restaurant.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3.99')).toBeInTheDocument();
  });

  it('shows loading skeleton initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<EditRestaurantPage />);

    // Should show skeleton loading elements
    expect(document.querySelectorAll('.MuiSkeleton-root')).toHaveLength(9);
  });

  it('handles fetch error and redirects to restaurants page', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<EditRestaurantPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin/restaurants');
    });
  });

  it('handles successful form submission', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRestaurantData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(<EditRestaurantPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Restaurant')).toBeInTheDocument();
    });

    const updateButton = screen.getByText('Update Restaurant');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenNthCalledWith(
        2, // Second call (first is for fetching data)
        'http://localhost:8000/api/restaurants/1',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Test Restaurant',
            description: 'A great test restaurant',
            address: '123 Test St',
            phone: '555-123-4567',
            email: 'test@restaurant.com',
            cuisine_type: 'Italian',
            delivery_fee: 3.99,
          }),
        })
      );
    });
  });

  it('handles form input changes', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRestaurantData,
    });

    render(<EditRestaurantPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Restaurant')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/restaurant name/i);
    fireEvent.change(nameInput, {
      target: { value: 'Updated Restaurant Name' },
    });

    expect(
      screen.getByDisplayValue('Updated Restaurant Name')
    ).toBeInTheDocument();
  });

  it('navigates back when back button is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRestaurantData,
    });

    render(<EditRestaurantPage />);

    await waitFor(() => {
      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    const backButton = screen.getByText('Back');
    fireEvent.click(backButton);

    expect(mockBack).toHaveBeenCalled();
  });

  it('handles form submission error', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRestaurantData,
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Update failed' }),
      });

    render(<EditRestaurantPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Restaurant')).toBeInTheDocument();
    });

    const updateButton = screen.getByText('Update Restaurant');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });

  it('redirects to restaurants page if no restaurant ID', () => {
    (useParams as jest.Mock).mockReturnValue({ restaurantId: null });

    render(<EditRestaurantPage />);

    expect(mockPush).toHaveBeenCalledWith('/admin/restaurants');
  });

  it('shows success message and redirects after successful update', async () => {
    jest.useFakeTimers();

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRestaurantData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(<EditRestaurantPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Restaurant')).toBeInTheDocument();
    });

    const updateButton = screen.getByText('Update Restaurant');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(
        screen.getByText('Restaurant updated successfully!')
      ).toBeInTheDocument();
    });

    // Fast forward timer to trigger redirect (wrap in act so state updates are flushed)
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin/restaurants');
    });

    jest.useRealTimers();
  });
});
