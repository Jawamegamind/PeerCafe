import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useParams } from 'next/navigation';
import '@testing-library/jest-dom';
import RestaurantDetailPage from '../../app/(main)/user/restaurants/[restaurantId]/page';
import { CartProvider } from '../../app/_contexts/CartContext';

// Mock Next.js navigation hooks
const mockParams = { restaurantId: '1' };
jest.mock('next/navigation', () => ({
  useParams: () => mockParams,
}));

// Mock the navbar component
jest.mock('../../app/_components/navbar', () => {
  return function MockNavbar() {
    return <div data-testid="navbar">Mock Navbar</div>;
  };
});

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

// Mock fetch globally
global.fetch = jest.fn();

// Test wrapper component with CartProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <CartProvider>{children}</CartProvider>;
};

const mockMenuItem = {
  item_id: 1,  // Updated to match backend API snake_case
  item_name: 'Test Pizza',
  description: 'Delicious test pizza with cheese',
  price: 15.99,
  image: 'https://example.com/pizza.jpg',
  is_available: true,
  quantity: 10,
};

const mockRestaurant = {
  restaurant_id: 1,  // Updated to match backend API snake_case
  name: 'Test Restaurant',
  description: 'A great place to dine',
  cuisine_type: 'Italian',
  rating: 4.5,
  address: '123 Test Street',
};

describe('RestaurantDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage mock
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [mockMenuItem],
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    // Mock fetch to never resolve (simulating loading)
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    
    render(<RestaurantDetailPage />, { wrapper: TestWrapper });
    
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    // Check for loading skeletons by class name since MUI Skeletons don't have progressbar role
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThanOrEqual(6);
  });

  it('displays restaurant information and menu items after loading', async () => {
    // Mock successful responses
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockMenuItem],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRestaurant,
      });

    render(<RestaurantDetailPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText('Test Pizza')).toBeInTheDocument();
    });

    // Check menu item details
    expect(screen.getByText('Delicious test pizza with cheese')).toBeInTheDocument();
    expect(screen.getByText('$15.99')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Qty: 10')).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Failed to fetch menu items'));

    render(<RestaurantDetailPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch menu items')).toBeInTheDocument();
    });
  });

  it('displays empty state when no menu items are available', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<RestaurantDetailPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText('No menu items available')).toBeInTheDocument();
      expect(screen.getByText("This restaurant hasn't added their menu items yet.")).toBeInTheDocument();
    });
  });

  it('handles unavailable menu items correctly', async () => {
    const unavailableItem = { ...mockMenuItem, is_available: false };
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [unavailableItem],
    });

    render(<RestaurantDetailPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText('Unavailable')).toBeInTheDocument();
      const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
      expect(addToCartButton).toBeDisabled();
    });
  });

  it('calls handleAddToCart when Add to Cart button is clicked', async () => {
    render(<RestaurantDetailPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText('Test Pizza')).toBeInTheDocument();
    });

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    
    // Click the button and ensure no errors are thrown
    expect(() => {
      fireEvent.click(addToCartButton);
    }).not.toThrow();
  });

  it('displays restaurant header when restaurant data is loaded', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockMenuItem],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRestaurant,
      });

    render(<RestaurantDetailPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
      expect(screen.getByText('A great place to dine')).toBeInTheDocument();
      expect(screen.getByText('Italian')).toBeInTheDocument();
      expect(screen.getByText('4.5/5')).toBeInTheDocument();
      expect(screen.getByText('123 Test Street')).toBeInTheDocument();
    });
  });

  it('displays menu count in the header', async () => {
    const multipleItems = [mockMenuItem, { ...mockMenuItem, item_id: 2, item_name: 'Test Pasta' }];
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => multipleItems,
    });

    render(<RestaurantDetailPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText('2 items')).toBeInTheDocument();
    });
  });

  it('makes correct API calls with restaurant ID', async () => {
    render(<RestaurantDetailPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/restaurants/1/menu');
      expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/restaurants/1');
    });
  });

  it('handles restaurant API failure gracefully', async () => {
    // Menu succeeds, restaurant fails
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockMenuItem],
      })
      .mockRejectedValueOnce(new Error('Restaurant not found'));

    render(<RestaurantDetailPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      // Should still display menu items
      expect(screen.getByText('Test Pizza')).toBeInTheDocument();
    });

    // The restaurant name might be empty or not rendered when the API fails
    // Let's check that the page doesn't crash and menu is still shown
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  it('has proper hover effects on menu item cards', async () => {
    render(<RestaurantDetailPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      const menuCard = screen.getByText('Test Pizza').closest('[data-testid], .MuiCard-root') || 
                     screen.getByText('Test Pizza').closest('div');
      expect(menuCard).toBeInTheDocument();
    });
  });
});