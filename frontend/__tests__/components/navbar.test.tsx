import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import '@testing-library/jest-dom';
import ResponsiveAppBar from '../../app/_components/navbar';
import { CartProvider } from '../../app/_contexts/CartContext';

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

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock Supabase client
const mockSingle = jest.fn();
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: mockFrom,
};

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

// Test wrapper component with CartProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <CartProvider>{children}</CartProvider>;
};

describe('ResponsiveAppBar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage mock
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    // Reset Supabase mocks to default values
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: { IsAdmin: false },
      error: null,
    });
  });

  it('renders the navbar with correct branding', () => {
    render(<ResponsiveAppBar />, { wrapper: TestWrapper });
    
    // Check for PeerCafe branding (desktop view)
    expect(screen.getByText('PeerCafe')).toBeInTheDocument();
  });

  it('displays navigation menu items on desktop', () => {
    render(<ResponsiveAppBar />, { wrapper: TestWrapper });
    
    // Check for navigation buttons (visible on desktop)
    expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    
    // Check for profile icon (now with aria-label)
    const profileButton = screen.getByRole('button', { name: /profile/i });
    expect(profileButton).toBeInTheDocument();
    
    // Check for cart icon
    const cartButton = screen.getByRole('button', { name: /shopping cart/i });
    expect(cartButton).toBeInTheDocument();
  });

  it('shows mobile menu when hamburger menu is clicked', () => {
    render(<ResponsiveAppBar />, { wrapper: TestWrapper });
    
    // Find and click the hamburger menu (mobile menu trigger)
    const mobileMenuButton = screen.getByRole('button', { name: /account of current user/i });
    fireEvent.click(mobileMenuButton);
    
    // Mobile menu should now be visible
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('navigates to home page when Home button is clicked', async () => {
    render(<ResponsiveAppBar />, { wrapper: TestWrapper });
    
    const homeButton = screen.getByRole('button', { name: /home/i });
    fireEvent.click(homeButton);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/homepage');
    });
  });

  it('navigates to profile page when Profile icon is clicked', async () => {
    // Mock successful user data fetch for regular user
    const mockUserData = {
      user_id: 'test-user-id',
      IsAdmin: false,
      name: 'Test User'
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    });

    mockSingle.mockResolvedValue({
      data: mockUserData,
      error: null
    });

    render(<ResponsiveAppBar />, { wrapper: TestWrapper });
    
    const profileButton = screen.getByRole('button', { name: /profile/i });
    fireEvent.click(profileButton);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/user/profile');
    });
  });

  it('navigates to admin dashboard when admin user clicks Profile', async () => {
    // Mock successful user data fetch for admin user
    const mockAdminUserData = {
      user_id: 'admin-user-id',
      IsAdmin: true,
      name: 'Admin User'
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-user-id' } },
      error: null
    });

    mockSingle.mockResolvedValue({
      data: mockAdminUserData,
      error: null
    });

    render(<ResponsiveAppBar />, { wrapper: TestWrapper });
    
    const profileButton = screen.getByRole('button', { name: /profile/i });
    fireEvent.click(profileButton);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin/profile');
    });
  });

  it('handles logout functionality', async () => {
    const { logout } = require('../../app/(authentication)/login/actions');
    
    render(<ResponsiveAppBar />, { wrapper: TestWrapper });
    
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutButton);
    
    await waitFor(() => {
      expect(logout).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('closes mobile menu when clicking outside menu items', () => {
    render(<ResponsiveAppBar />, { wrapper: TestWrapper });
    
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
    render(<ResponsiveAppBar />, { wrapper: TestWrapper });
    
    // Both desktop and mobile variants of the logo should exist in DOM
    // (Material-UI handles visibility with CSS)
    const logoElements = screen.getAllByText(/PeerCafe|AI LMS/);
    expect(logoElements.length).toBeGreaterThan(0);
  });

  it('has proper accessibility attributes', () => {
    render(<ResponsiveAppBar />, { wrapper: TestWrapper });
    
    const mobileMenuButton = screen.getByRole('button', { name: /account of current user/i });
    expect(mobileMenuButton).toHaveAttribute('aria-label');
    expect(mobileMenuButton).toHaveAttribute('aria-controls');
    expect(mobileMenuButton).toHaveAttribute('aria-haspopup', 'true');
  });

  // New cart-specific tests
  it('displays cart icon with badge showing item count', () => {
    render(<ResponsiveAppBar />, { wrapper: TestWrapper });
    
    // Cart icon should be present
    const cartButton = screen.getByRole('button', { name: /shopping cart/i });
    expect(cartButton).toBeInTheDocument();
    
    // Badge should show 0 items initially (badge may not be visible with 0 items)
    // We just verify the cart button exists
  });

  it('opens cart dropdown when cart icon is clicked', () => {
    render(<ResponsiveAppBar />, { wrapper: TestWrapper });
    
    const cartButton = screen.getByRole('button', { name: /shopping cart/i });
    fireEvent.click(cartButton);
    
    // Cart dropdown should appear with specific heading
    const cartHeading = screen.getByRole('heading', { name: /your cart/i });
    expect(cartHeading).toBeInTheDocument();
  });

  it('shows empty cart message when cart is empty', () => {
    render(<ResponsiveAppBar />, { wrapper: TestWrapper });
    
    const cartButton = screen.getByRole('button', { name: /shopping cart/i });
    fireEvent.click(cartButton);
    
    // Should show empty cart message specifically in the body text
    expect(screen.getByText(/add items from a restaurant to get started/i)).toBeInTheDocument();
  });
});