/**
 * Basic Tests for Admin Add Restaurant Page
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';
import AddRestaurantPage from '../../app/(main)/admin/restaurants/add/page';

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

describe('Admin Add Restaurant Page - Basic Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (fetch as jest.Mock).mockClear();
  });

  describe('Page Rendering', () => {
    it('renders the page with basic elements', () => {
      render(<AddRestaurantPage />);

      expect(screen.getByTestId('navbar')).toBeInTheDocument();
      expect(screen.getByText('Add New Restaurant')).toBeInTheDocument();
      expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0); // Form inputs exist
      expect(
        screen.getByRole('button', { name: /add restaurant/i })
      ).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      render(<AddRestaurantPage />);

      // Use placeholder text or role queries instead of labels
      expect(screen.getByPlaceholderText('(555) 123-4567')).toBeInTheDocument();
      expect(screen.getAllByRole('textbox')).toHaveLength(5); // name, description, address, phone, email
      expect(screen.getByRole('spinbutton')).toBeInTheDocument(); // delivery fee
    });

    it('shows breadcrumbs', () => {
      render(<AddRestaurantPage />);

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Restaurants')).toBeInTheDocument();
      // Use more specific selector for breadcrumb text
      const breadcrumbs = screen.getAllByRole('navigation');
      const mainBreadcrumb = breadcrumbs.find(nav =>
        nav.classList.contains('MuiBreadcrumbs-root')
      );
      const breadcrumbText = mainBreadcrumb?.querySelector('p');
      expect(breadcrumbText).toHaveTextContent('Add Restaurant');
    });

    it('renders form buttons', () => {
      render(<AddRestaurantPage />);

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /add restaurant/i })
      ).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('prevents submission with empty required fields', async () => {
      render(<AddRestaurantPage />);

      const submitButton = screen.getByRole('button', {
        name: /add restaurant/i,
      });
      await user.click(submitButton);

      // Verify that fetch was not called since form validation should prevent submission
      expect(fetch).not.toHaveBeenCalled();
    });

    it('handles email input correctly', async () => {
      render(<AddRestaurantPage />);

      // Get email input by name (MUI sets accessible names properly)
      const emailInput = screen.getByRole('textbox', {
        name: /email address/i,
      });
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });
  });

  describe('Form Input', () => {
    it('handles text input correctly', async () => {
      render(<AddRestaurantPage />);

      // Get first textbox (restaurant name)
      const nameInput = screen.getAllByRole('textbox')[0];
      await user.type(nameInput, 'Test Restaurant');

      expect(nameInput).toHaveValue('Test Restaurant');
    });

    it('handles cuisine selection', async () => {
      render(<AddRestaurantPage />);

      // Find the cuisine select by looking for the dropdown with the role
      const cuisineSelect = screen.getByRole('combobox');
      await user.click(cuisineSelect);

      await waitFor(() => {
        expect(screen.getByText('Italian')).toBeInTheDocument();
        expect(screen.getByText('Chinese')).toBeInTheDocument();
        expect(screen.getByText('Mexican')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('handles back button click', async () => {
      render(<AddRestaurantPage />);

      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      expect(mockRouter.back).toHaveBeenCalled();
    });

    it('handles cancel button click', async () => {
      render(<AddRestaurantPage />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  describe('Form Submission - Basic', () => {
    it('successfully submits with valid data', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ message: 'Restaurant created successfully' }),
      });

      render(<AddRestaurantPage />);

      // Fill required fields using indices for textboxes
      const textboxes = screen.getAllByRole('textbox');
      await user.type(textboxes[0], 'Test Restaurant'); // name
      await user.type(textboxes[2], '123 Test St'); // address
      await user.type(textboxes[3], '555-1234'); // phone
      await user.type(textboxes[4], 'test@example.com'); // email

      // Handle delivery fee
      const deliveryFeeInput = screen.getByRole('spinbutton');
      await user.clear(deliveryFeeInput);
      await user.type(deliveryFeeInput, '2.50');

      // Handle cuisine selection
      const cuisineSelect = screen.getByRole('combobox');
      await user.click(cuisineSelect);
      await user.click(screen.getByText('Italian'));

      const submitButton = screen.getByRole('button', {
        name: /add restaurant/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/restaurants',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })
        );
      });

      await waitFor(() => {
        expect(
          screen.getByText('Restaurant added successfully!')
        ).toBeInTheDocument();
      });
    });

    it('handles network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<AddRestaurantPage />);

      // Fill required fields using indices for textboxes
      const textboxes = screen.getAllByRole('textbox');
      await user.type(textboxes[0], 'Test Restaurant'); // name
      await user.type(textboxes[2], '123 Test St'); // address
      await user.type(textboxes[3], '555-1234'); // phone
      await user.type(textboxes[4], 'test@example.com'); // email

      // Handle cuisine selection
      const cuisineSelect = screen.getByRole('combobox');
      await user.click(cuisineSelect);
      await user.click(screen.getByText('Italian'));

      const submitButton = screen.getByRole('button', {
        name: /add restaurant/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Network error. Please try again.')
        ).toBeInTheDocument();
      });
    });
  });
});
