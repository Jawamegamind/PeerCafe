/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import '@testing-library/jest-dom';
import RestaurantsPage from '../../app/(main)/user/restaurants/page';
import { getRestaurants } from '../../app/(main)/user/restaurants/actions';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the restaurants actions
jest.mock('../../app/(main)/user/restaurants/actions', () => ({
  getRestaurants: jest.fn(),
}));

// Mock Navbar component
jest.mock('../../app/_components/navbar', () => {
  return function MockNavbar() {
    return <div data-testid="navbar">Navbar</div>;
  };
});

const mockPush = jest.fn();

const mockRestaurants = [
  {
    restaurant_id: 1,
    name: 'Pizza Palace',
    description: 'Authentic Italian pizza with fresh ingredients',
    address: '123 Main St, San Francisco, CA',
    phone: '(555) 123-4567',
    email: 'info@pizzapalace.com',
    cuisine_type: 'Italian',
    is_active: true,
    rating: 4.5,
    delivery_fee: 2.99,
  },
  {
    restaurant_id: 2,
    name: 'Dragon Wok',
    description: 'Traditional Chinese cuisine with modern twist',
    address: '456 Oak Ave, San Francisco, CA',
    phone: '(555) 987-6543',
    email: 'contact@dragonwok.com',
    cuisine_type: 'Chinese',
    is_active: true,
    rating: 4.2,
    delivery_fee: 3.50,
  },
  {
    restaurant_id: 3,
    name: 'Taco Fiesta',
    description: 'Fresh Mexican food made daily',
    address: '789 Pine St, San Francisco, CA',
    phone: '(555) 456-7890',
    email: 'hello@tacofiesta.com',
    cuisine_type: 'Mexican',
    is_active: true,
    rating: 3.8,
    delivery_fee: 1.99,
  },
];

describe('RestaurantsPage', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    jest.clearAllMocks();
  });

  describe('Rendering and Loading States', () => {
    it('renders loading skeletons initially', () => {
      (getRestaurants as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<RestaurantsPage />);

      expect(screen.getByTestId('navbar')).toBeInTheDocument();
      expect(screen.getByText('🍽️ Discover Restaurants')).toBeInTheDocument();
      expect(screen.getByText(/Explore amazing local restaurants/)).toBeInTheDocument();

      // Should show search and filter inputs even while loading
      expect(screen.getByPlaceholderText('Search restaurants, cuisines...')).toBeInTheDocument();
      expect(screen.getAllByText('Cuisine Type')[0]).toBeInTheDocument();
    });

    it('renders restaurants after loading', async () => {
      (getRestaurants as jest.Mock).mockResolvedValue(mockRestaurants);

      render(<RestaurantsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
        expect(screen.getByText('Dragon Wok')).toBeInTheDocument();
        expect(screen.getByText('Taco Fiesta')).toBeInTheDocument();
      });

      expect(screen.getByText('3 restaurants found')).toBeInTheDocument();
    });

    it('filters out inactive restaurants', async () => {
      const restaurantsWithInactive = [
        ...mockRestaurants,
        {
          restaurant_id: 4,
          name: 'Closed Restaurant',
          description: 'This is closed',
          address: '999 Closed St',
          phone: '(555) 000-0000',
          email: 'closed@restaurant.com',
          cuisine_type: 'Other',
          is_active: false,
          rating: 2.0,
          delivery_fee: 5.00,
        },
      ];

      (getRestaurants as jest.Mock).mockResolvedValue(restaurantsWithInactive);

      render(<RestaurantsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
      });

      expect(screen.queryByText('Closed Restaurant')).not.toBeInTheDocument();
      expect(screen.getByText('3 restaurants found')).toBeInTheDocument();
    });
  });

  describe('Search and Filtering', () => {
    beforeEach(async () => {
      (getRestaurants as jest.Mock).mockResolvedValue(mockRestaurants);
      render(<RestaurantsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
      });
    });

    it('filters restaurants by search term', async () => {
      const searchInput = screen.getByPlaceholderText('Search restaurants, cuisines...');
      
      fireEvent.change(searchInput, { target: { value: 'pizza' } });

      await waitFor(() => {
        expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
        expect(screen.queryByText('Dragon Wok')).not.toBeInTheDocument();
        expect(screen.queryByText('Taco Fiesta')).not.toBeInTheDocument();
      });

      expect(screen.getByText('1 restaurant found')).toBeInTheDocument();
    });

    it('filters restaurants by cuisine type', async () => {
      // Find the select component by its container or button role
      const cuisineSelect = screen.getByRole('combobox');
      
      fireEvent.mouseDown(cuisineSelect);
      
      await waitFor(() => {
        const italianOption = screen.getByRole('option', { name: 'Italian' });
        fireEvent.click(italianOption);
      });

      await waitFor(() => {
        expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
        expect(screen.queryByText('Burger Barn')).not.toBeInTheDocument();
      });
    });

    it('shows clear filters button when filters are applied', async () => {
      const searchInput = screen.getByPlaceholderText('Search restaurants, cuisines...');
      
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText('No restaurants match your search criteria')).toBeInTheDocument();
        expect(screen.getByText('Clear Filters')).toBeInTheDocument();
      });
    });

    it('clears filters when clear button is clicked', async () => {
      const searchInput = screen.getByPlaceholderText('Search restaurants, cuisines...');
      
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText('Clear Filters')).toBeInTheDocument();
      });

      const clearButton = screen.getByText('Clear Filters');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
        expect(screen.getByText('3 restaurants found')).toBeInTheDocument();
      });
    });
  });

  describe('Restaurant Card Interactions', () => {
    beforeEach(async () => {
      (getRestaurants as jest.Mock).mockResolvedValue(mockRestaurants);
      render(<RestaurantsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
      });
    });

    it('navigates to restaurant detail page when View Menu is clicked', async () => {
      const viewMenuButtons = screen.getAllByText('View Menu');
      
      fireEvent.click(viewMenuButtons[0]); // Click first restaurant's button

      expect(mockPush).toHaveBeenCalledWith('/user/restaurants/1');
    });

    it('displays restaurant information correctly', () => {
      // Check Pizza Palace details
      expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
      expect(screen.getByText('Authentic Italian pizza with fresh ingredients')).toBeInTheDocument();
      expect(screen.getByText('123 Main St, San Francisco, CA')).toBeInTheDocument();
      expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
      expect(screen.getByText('$2.99')).toBeInTheDocument();

      // Check cuisine chips
      expect(screen.getByText('Italian')).toBeInTheDocument();
      expect(screen.getByText('Chinese')).toBeInTheDocument();
      expect(screen.getByText('Mexican')).toBeInTheDocument();
    });

    it('handles missing or null rating values', async () => {
      const restaurantsWithNullRating = mockRestaurants.map(r => ({
        ...r,
        rating: r.name === 'Pizza Palace' ? null : r.rating,
      }));

      (getRestaurants as jest.Mock).mockResolvedValue(restaurantsWithNullRating);

      render(<RestaurantsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Pizza Palace')[0]).toBeInTheDocument();
        expect(screen.getByText('(N/A)')).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no restaurants are available', async () => {
      (getRestaurants as jest.Mock).mockResolvedValue([]);

      render(<RestaurantsPage />);

      await waitFor(() => {
        expect(screen.getByText('No restaurants available at the moment')).toBeInTheDocument();
      });
    });

    it('shows search empty state when no results match filters', async () => {
      (getRestaurants as jest.Mock).mockResolvedValue(mockRestaurants);
      
      render(<RestaurantsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search restaurants, cuisines...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent restaurant' } });

      await waitFor(() => {
        expect(screen.getByText('No restaurants match your search criteria')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      (getRestaurants as jest.Mock).mockRejectedValue(new Error('API Error'));

      render(<RestaurantsPage />);

      await waitFor(() => {
        // Should still show the page structure even if API fails
        expect(screen.getByText('🍽️ Discover Restaurants')).toBeInTheDocument();
        expect(screen.getByText('No restaurants available at the moment')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      (getRestaurants as jest.Mock).mockResolvedValue(mockRestaurants);
      render(<RestaurantsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
      });
    });

    it('has proper heading structure', () => {
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('🍽️ Discover Restaurants');
    });

    it('has accessible form controls', () => {
      const searchInput = screen.getByPlaceholderText('Search restaurants, cuisines...');
      expect(searchInput).toBeInTheDocument();

      const cuisineSelect = screen.getByRole('combobox');
      expect(cuisineSelect).toBeInTheDocument();
    });

    it('has accessible buttons', () => {
      const viewMenuButtons = screen.getAllByRole('button', { name: /View Menu/ });
      expect(viewMenuButtons.length).toBe(3);
      
      viewMenuButtons.forEach(button => {
        expect(button).toBeEnabled();
      });
    });
  });
});