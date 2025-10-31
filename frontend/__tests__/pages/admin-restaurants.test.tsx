/**
 * Tests for Admin Restaurants Management Page
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';
import RestaurantsPage from '../../app/(main)/admin/restaurants/page';

// Mock the Navbar component
jest.mock('../../app/_components/navbar', () => {
  return function MockNavbar() {
    return <nav data-testid="navbar">Navbar</nav>;
  };
});

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
};

describe('Admin Restaurants Management Page', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (fetch as jest.Mock).mockClear();
  });

  const mockRestaurants = [
    {
      restaurant_id: 1,
      name: 'Pizza Palace',
      description: 'Best pizza in town',
      cuisine_type: 'Italian',
      address: '123 Main St, City',
      phone: '(555) 123-4567',
      email: 'info@pizzapalace.com',
      rating: 4.5,
      delivery_fee: 3.99,
      is_active: true,
    },
    {
      restaurant_id: 2,
      name: 'Burger Haven',
      description: 'Gourmet burgers',
      cuisine_type: 'American',
      address: '456 Oak Ave, City',
      phone: '(555) 987-6543',
      email: 'contact@burgerhaven.com',
      rating: 4.2,
      delivery_fee: 2.99,
      is_active: true,
    },
    {
      restaurant_id: 3,
      name: 'Deleted Restaurant',
      description: 'This was deleted',
      cuisine_type: 'Mexican',
      address: '789 Pine St, City',
      phone: '(555) 456-7890',
      email: 'info@deleted.com',
      rating: 3.8,
      delivery_fee: 4.5,
      is_active: false,
    },
  ];

  describe('Page Rendering', () => {
    it('renders the page with all basic elements', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRestaurants),
      });

      render(<RestaurantsPage />);

      expect(screen.getByTestId('navbar')).toBeInTheDocument();
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Restaurants')).toBeInTheDocument();
      expect(screen.getByText('Restaurant Management')).toBeInTheDocument();
      expect(screen.getByText('Add Restaurant')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
      });
    });

    it('shows loading state initially', () => {
      (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<RestaurantsPage />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('displays restaurant data correctly', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRestaurants),
      });

      render(<RestaurantsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
        expect(screen.getByText('Italian')).toBeInTheDocument();
        expect(screen.getByText('123 Main St, City')).toBeInTheDocument();
        expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
        expect(screen.getByText('⭐ 4.5')).toBeInTheDocument();
        expect(screen.getByText('$3.99')).toBeInTheDocument();
      });
    });
  });

  describe('Restaurant Table', () => {
    beforeEach(async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRestaurants),
      });

      render(<RestaurantsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
      });
    });

    it('displays table headers correctly', () => {
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Cuisine')).toBeInTheDocument();
      expect(screen.getByText('Address')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Rating')).toBeInTheDocument();
      expect(screen.getByText('Delivery Fee')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('shows active restaurants by default', () => {
      expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
      expect(screen.getByText('Burger Haven')).toBeInTheDocument();
    });

    it('displays restaurant count correctly', () => {
      expect(
        screen.getByText('Total: 3 restaurants (1 deleted)')
      ).toBeInTheDocument();
    });

    it('formats currency and rating correctly', () => {
      expect(screen.getByText('$3.99')).toBeInTheDocument();
      expect(screen.getByText('$2.99')).toBeInTheDocument();
      expect(screen.getByText('⭐ 4.5')).toBeInTheDocument();
      expect(screen.getByText('⭐ 4.2')).toBeInTheDocument();
    });
  });

  describe('Filter Controls', () => {
    beforeEach(async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRestaurants),
      });

      render(<RestaurantsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
      });
    });

    it('shows deleted restaurants when toggle is enabled', async () => {
      const toggle = screen.getByRole('switch', {
        name: /show deleted restaurants/i,
      });
      expect(toggle).toBeChecked(); // Default is true

      expect(screen.getByText('Deleted Restaurant')).toBeInTheDocument();
    });

    it('hides deleted restaurants when toggle is disabled', async () => {
      const toggle = screen.getByRole('switch', {
        name: /show deleted restaurants/i,
      });

      await user.click(toggle);

      expect(screen.queryByText('Deleted Restaurant')).not.toBeInTheDocument();
      expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
      expect(screen.getByText('Burger Haven')).toBeInTheDocument();
    });

    it('shows correct count when filtering', async () => {
      const toggle = screen.getByRole('switch', {
        name: /show deleted restaurants/i,
      });

      await user.click(toggle);

      // Should show count for only active restaurants when toggle is off
      expect(
        screen.getByText(/Total:\s+\d+\s+restaurants/)
      ).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    beforeEach(async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRestaurants),
      });

      render(<RestaurantsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
      });
    });

    it('navigates to add restaurant page', async () => {
      const addButton = screen.getByText('Add Restaurant');

      await user.click(addButton);

      expect(mockRouter.push).toHaveBeenCalledWith('/admin/restaurants/add');
    });

    it('navigates to menu management page', async () => {
      const menuButton = screen.getAllByTitle('Manage Menu')[0];

      await user.click(menuButton);

      expect(mockRouter.push).toHaveBeenCalledWith('/admin/restaurants/1');
    });

    it('navigates to breadcrumb links', async () => {
      const dashboardLink = screen.getByText('Admin Dashboard');

      await user.click(dashboardLink);

      // Since it's a Link component, we can't test navigation directly
      expect(dashboardLink).toHaveAttribute('href', '/admin/dashboard');
    });
  });

  describe('Restaurant Actions', () => {
    beforeEach(async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRestaurants),
      });

      render(<RestaurantsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
      });
    });

    it('shows correct action buttons for active restaurants', () => {
      const menuButtons = screen.getAllByTitle('Manage Menu');
      const editButtons = screen.getAllByTitle('Edit Restaurant');
      const deleteButtons = screen.getAllByTitle('Delete Restaurant');

      expect(menuButtons).toHaveLength(2); // Only for active restaurants
      expect(editButtons).toHaveLength(2);
      expect(deleteButtons).toHaveLength(2);
    });

    it('shows restore button for deleted restaurants', () => {
      const restoreButtons = screen.getAllByTitle('Restore Restaurant');
      expect(restoreButtons).toHaveLength(1);
    });

    it('opens delete confirmation dialog', async () => {
      const deleteButton = screen.getAllByTitle('Delete Restaurant')[0];

      await user.click(deleteButton);

      expect(screen.getByText('⚠️ Delete Restaurant')).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to delete/)
      ).toBeInTheDocument();
      expect(screen.getAllByText('Pizza Palace')[1]).toBeInTheDocument(); // Use index 1 for dialog content
    });

    it('cancels delete operation', async () => {
      const deleteButton = screen.getAllByTitle('Delete Restaurant')[0];

      await user.click(deleteButton);

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(
          screen.queryByText('⚠️ Delete Restaurant')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Delete Restaurant', () => {
    beforeEach(async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRestaurants),
      });

      render(<RestaurantsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
      });
    });

    it('successfully deletes a restaurant', async () => {
      const deleteButton = screen.getAllByTitle('Delete Restaurant')[0];

      await user.click(deleteButton);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const confirmButton = screen.getByText('Delete Restaurant');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/restaurants/1',
          { method: 'DELETE' }
        );
      });

      await waitFor(() => {
        expect(
          screen.getByText('Pizza Palace has been deleted successfully')
        ).toBeInTheDocument();
      });
    });

    it('handles delete error from server', async () => {
      const deleteButton = screen.getAllByTitle('Delete Restaurant')[0];

      await user.click(deleteButton);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: 'Cannot delete restaurant' }),
      });

      const confirmButton = screen.getByText('Delete Restaurant');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(
          screen.getByText('Cannot delete restaurant')
        ).toBeInTheDocument();
      });
    });

    it('handles network error during delete', async () => {
      const deleteButton = screen.getAllByTitle('Delete Restaurant')[0];

      await user.click(deleteButton);

      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const confirmButton = screen.getByText('Delete Restaurant');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(
          screen.getByText('Network error. Please try again.')
        ).toBeInTheDocument();
      });
    });

    it('shows loading state during delete', async () => {
      const deleteButton = screen.getAllByTitle('Delete Restaurant')[0];

      await user.click(deleteButton);

      (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

      const confirmButton = screen.getByText('Delete Restaurant');
      await user.click(confirmButton);

      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });
  });

  describe('Restore Restaurant', () => {
    beforeEach(async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRestaurants),
      });

      render(<RestaurantsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
      });
    });

    it('successfully restores a restaurant', async () => {
      const restoreButton = screen.getByTitle('Restore Restaurant');

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await user.click(restoreButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/restaurants/3/restore',
          { method: 'PATCH' }
        );
      });

      await waitFor(() => {
        expect(
          screen.getByText('Deleted Restaurant has been restored successfully')
        ).toBeInTheDocument();
      });
    });

    it('handles restore error from server', async () => {
      const restoreButton = screen.getByTitle('Restore Restaurant');

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: 'Cannot restore restaurant' }),
      });

      await user.click(restoreButton);

      await waitFor(() => {
        expect(
          screen.getByText('Cannot restore restaurant')
        ).toBeInTheDocument();
      });
    });

    it('handles network error during restore', async () => {
      const restoreButton = screen.getByTitle('Restore Restaurant');

      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await user.click(restoreButton);

      await waitFor(() => {
        expect(
          screen.getByText('Network error. Please try again.')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error message when fetch fails', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<RestaurantsPage />);

      await waitFor(() => {
        expect(
          screen.getByText('Error fetching restaurants. Please try again.')
        ).toBeInTheDocument();
      });
    });

    it('shows error message when API returns error', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<RestaurantsPage />);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to fetch restaurants')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no restaurants exist', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      render(<RestaurantsPage />);

      await waitFor(() => {
        expect(
          screen.getByText(
            'No restaurants found. Add your first restaurant to get started!'
          )
        ).toBeInTheDocument();
      });
    });

    it('shows filtered empty state when all restaurants are hidden', async () => {
      const inactiveRestaurants = [
        { ...mockRestaurants[2] }, // Only deleted restaurant
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(inactiveRestaurants),
      });

      render(<RestaurantsPage />);

      await waitFor(() => {
        expect(screen.getByText('Deleted Restaurant')).toBeInTheDocument();
      });

      const toggle = screen.getByRole('switch', {
        name: /show deleted restaurants/i,
      });
      await user.click(toggle);

      expect(
        screen.getByText('No restaurants match your current filter settings.')
      ).toBeInTheDocument();
    });
  });

  describe('Snackbar Notifications', () => {
    beforeEach(async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRestaurants),
      });

      render(<RestaurantsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
      });
    });

    it('closes snackbar when close button is clicked', async () => {
      // Trigger an error to show snackbar
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const restoreButton = screen.getByTitle('Restore Restaurant');
      await user.click(restoreButton);

      await waitFor(() => {
        expect(
          screen.getByText('Network error. Please try again.')
        ).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(
          screen.queryByText('Network error. Please try again.')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Visual States', () => {
    beforeEach(async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRestaurants),
      });

      render(<RestaurantsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
      });
    });

    it('applies different styling to deleted restaurants', () => {
      const deletedRestaurant = screen.getByText('Deleted Restaurant');
      expect(deletedRestaurant.closest('tr')).toHaveStyle('opacity: 0.6');
    });

    it('shows deleted chip for inactive restaurants', () => {
      expect(screen.getByText('Deleted')).toBeInTheDocument();
    });

    it('shows correct status chips', () => {
      const activeChips = screen.getAllByText('Active');
      const inactiveChips = screen.getAllByText('Inactive');

      expect(activeChips).toHaveLength(2);
      expect(inactiveChips).toHaveLength(1);
    });
  });
});
