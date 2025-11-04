/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import '@testing-library/jest-dom';
import UserDashboard from '../../app/(main)/user/dashboard/page';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock Navbar component
jest.mock('../../app/_components/navbar', () => {
  return function MockNavbar() {
    return <div data-testid="navbar">Navbar</div>;
  };
});

const mockPush = jest.fn();
const mockBack = jest.fn();

describe('UserDashboard', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
    });

    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn(),
    });

    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the user dashboard with welcome message', () => {
      render(<UserDashboard />);

      expect(screen.getByText(/Welcome to PeerCafe/)).toBeInTheDocument();
      expect(
        screen.getByText(/Your gateway to delicious local restaurants/)
      ).toBeInTheDocument();
      expect(screen.getByTestId('navbar')).toBeInTheDocument();
    });

    it('displays the current route information', () => {
      render(<UserDashboard />);

      expect(screen.getByText('Current Route:')).toBeInTheDocument();
      expect(screen.getByText('/user/dashboard')).toBeInTheDocument();
    });

    it('renders all quick action cards', () => {
      render(<UserDashboard />);

      // Browse Restaurants card (active)
      expect(screen.getByText('Browse Restaurants')).toBeInTheDocument();
      expect(
        screen.getByText(/Discover amazing local restaurants/)
      ).toBeInTheDocument();

      // My Orders card
      expect(screen.getByText('My Orders')).toBeInTheDocument();
      expect(screen.queryByText('Coming Soon...')).not.toBeInTheDocument();

      // Delivery Tracking card
      expect(screen.getByText('Delivery Tracking')).toBeInTheDocument();
      expect(screen.queryByText('Coming Soon...')).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('navigates to restaurants page when Browse Restaurants is clicked', () => {
      // Mock window.location.href
      delete (window as any).location;
      (window as any).location = { href: '' };

      render(<UserDashboard />);

      const browseRestaurantsCard = screen
        .getByText('Browse Restaurants')
        .closest('div');
      expect(browseRestaurantsCard).toBeInTheDocument();

      // Simulate click
      if (browseRestaurantsCard) {
        browseRestaurantsCard.click();
        expect(window.location.href).toBe('/user/restaurants');
      }
    });
  });

  describe('Access Control Messages', () => {
    it('does not show error message when no error parameter', () => {
      (useSearchParams as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue(null),
      });

      render(<UserDashboard />);

      expect(screen.queryByText('🚫 Access Denied')).not.toBeInTheDocument();
      expect(
        screen.queryByText(/You don't have permission to access admin areas/)
      ).not.toBeInTheDocument();
    });

    it('shows access denied message when error parameter is insufficient_permissions', async () => {
      (useSearchParams as jest.Mock).mockReturnValue({
        get: jest
          .fn()
          .mockImplementation(param =>
            param === 'error' ? 'insufficient_permissions' : null
          ),
      });

      render(<UserDashboard />);

      await waitFor(() => {
        expect(screen.getByText('🚫 Access Denied')).toBeInTheDocument();
        expect(
          screen.getByText(/You don't have permission to access admin areas/)
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            /Contact an administrator if you believe this is an error/
          )
        ).toBeInTheDocument();
      });
    });

    it('does not show error message for other error types', () => {
      (useSearchParams as jest.Mock).mockReturnValue({
        get: jest
          .fn()
          .mockImplementation(param =>
            param === 'error' ? 'other_error' : null
          ),
      });

      render(<UserDashboard />);

      expect(screen.queryByText('🚫 Access Denied')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<UserDashboard />);

      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toBeInTheDocument();
      expect(mainHeading).toHaveTextContent(/Welcome to PeerCafe/);
    });

    it('has interactive elements that are clickable', () => {
      render(<UserDashboard />);

      const browseRestaurantsCard = screen
        .getByText('Browse Restaurants')
        .closest('div');
      expect(browseRestaurantsCard).toHaveStyle({ cursor: 'pointer' });
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive grid layout', () => {
      render(<UserDashboard />);

      const gridContainer = screen
        .getByText('Browse Restaurants')
        .closest('div')?.parentElement;
      expect(gridContainer).toHaveStyle({
        display: 'grid',
        'grid-template-columns': 'repeat(auto-fit, minmax(280px, 1fr))',
      });
    });
  });
});
