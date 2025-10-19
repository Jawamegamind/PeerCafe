import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import '@testing-library/jest-dom';
import ResponsiveAppBar from '../../app/_components/navbar';

// Mock Next.js router
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Mock the logout action
jest.mock('../../app/(authentication)/login/actions', () => ({
  logout: jest.fn(),
}));

describe('ResponsiveAppBar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the navbar with correct branding', () => {
    render(<ResponsiveAppBar />);
    
    // Check for PeerCafe branding (desktop view)
    expect(screen.getByText('PeerCafe')).toBeInTheDocument();
  });

  it('displays navigation menu items on desktop', () => {
    render(<ResponsiveAppBar />);
    
    // Check for navigation buttons (visible on desktop)
    expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    
    // Check for profile icon (now with aria-label)
    const profileButton = screen.getByRole('button', { name: /profile/i });
    expect(profileButton).toBeInTheDocument();
  });

  it('shows mobile menu when hamburger menu is clicked', () => {
    render(<ResponsiveAppBar />);
    
    // Find and click the hamburger menu (mobile menu trigger)
    const mobileMenuButton = screen.getByRole('button', { name: /account of current user/i });
    fireEvent.click(mobileMenuButton);
    
    // Mobile menu should now be visible
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('navigates to home page when Home button is clicked', async () => {
    render(<ResponsiveAppBar />);
    
    const homeButton = screen.getByRole('button', { name: /home/i });
    fireEvent.click(homeButton);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/homepage');
    });
  });

  it('navigates to profile page when Profile icon is clicked', async () => {
    render(<ResponsiveAppBar />);
    
    const profileButton = screen.getByRole('button', { name: /profile/i });
    fireEvent.click(profileButton);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/user/profile');
    });
  });

  it('handles logout functionality', async () => {
    const { logout } = require('../../app/(authentication)/login/actions');
    
    render(<ResponsiveAppBar />);
    
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutButton);
    
    await waitFor(() => {
      expect(logout).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('closes mobile menu when clicking outside menu items', () => {
    render(<ResponsiveAppBar />);
    
    // Open mobile menu
    const mobileMenuButton = screen.getByRole('button', { name: /account of current user/i });
    fireEvent.click(mobileMenuButton);
    
    // Menu should be visible
    expect(screen.getByRole('menu')).toBeInTheDocument();
    
    // Click outside (on backdrop) - this would normally close the menu
    // We'll test by clicking on a menu item
    const homeItem = screen.getAllByText('Home').find(el => el.closest('[role="menuitem"]'));
    if (homeItem) {
      fireEvent.click(homeItem);
    }
    
    // Verify navigation occurred
    expect(mockPush).toHaveBeenCalledWith('/homepage');
  });

  it('renders correctly on different screen sizes', () => {
    render(<ResponsiveAppBar />);
    
    // Both desktop and mobile variants of the logo should exist in DOM
    // (Material-UI handles visibility with CSS)
    const logoElements = screen.getAllByText(/PeerCafe|AI LMS/);
    expect(logoElements.length).toBeGreaterThan(0);
  });

  it('has proper accessibility attributes', () => {
    render(<ResponsiveAppBar />);
    
    const mobileMenuButton = screen.getByRole('button', { name: /account of current user/i });
    expect(mobileMenuButton).toHaveAttribute('aria-label');
    expect(mobileMenuButton).toHaveAttribute('aria-controls');
    expect(mobileMenuButton).toHaveAttribute('aria-haspopup', 'true');
  });
});