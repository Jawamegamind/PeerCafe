import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AdminRestaurantMenuPage from '../../app/(main)/admin/restaurants/[restaurantId]/page';
import { useParams, useRouter } from 'next/navigation';

// Mock the Navbar component
jest.mock('../../../../app/_components/navbar', () => {
  return function MockNavbar() {
    return <nav data-testid="navbar">Navbar</nav>;
  };
});

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockPush = jest.fn();
const mockRestaurantId = '123';

describe('Admin Restaurant Menu Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({ restaurantId: mockRestaurantId });
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    
    // Default successful fetch responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/restaurants/123/menu')) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      }
      if (url.includes('/api/restaurants/123')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ Name: "Mario's Italian Restaurant" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
  });

  it('renders navbar component', async () => {
    render(<AdminRestaurantMenuPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('navbar')).toBeInTheDocument();
    });
  });

  it('redirects to restaurants page if restaurantId is missing', () => {
    (useParams as jest.Mock).mockReturnValue({ restaurantId: null });
    
    render(<AdminRestaurantMenuPage />);
    
    expect(mockPush).toHaveBeenCalledWith('/admin/restaurants');
  });

  it('renders main heading and restaurant information', async () => {
    render(<AdminRestaurantMenuPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/🍽️ menu management/i)).toBeInTheDocument();
      expect(screen.getByText(/restaurant: mario's italian restaurant/i)).toBeInTheDocument();
      expect(screen.getByText(/restaurant id: 123/i)).toBeInTheDocument();
    });
  });

  it('fetches and displays menu items on mount', async () => {
    const mockMenuItems = [
      {
        item_id: 1,
        restaurant_id: 123,
        item_name: 'Margherita Pizza',
        description: 'Classic tomato and mozzarella',
        is_available: true,
        image: 'pizza.jpg',
        price: 12.99,
        quantity: 10,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    ];

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/restaurants/123/menu')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockMenuItems,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ Name: "Mario's Italian Restaurant" }),
      });
    });

    render(<AdminRestaurantMenuPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
      expect(screen.getByText('Classic tomato and mozzarella')).toBeInTheDocument();
      expect(screen.getByText('$12.99')).toBeInTheDocument();
    });
  });

  it('renders breadcrumbs with correct navigation', async () => {
    render(<AdminRestaurantMenuPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Restaurants')).toBeInTheDocument();
      expect(screen.getByText('Menu Management')).toBeInTheDocument();
    });
  });

  it('navigates to admin dashboard when breadcrumb is clicked', async () => {
    const user = userEvent.setup();
    render(<AdminRestaurantMenuPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Admin Dashboard'));
    
    expect(mockPush).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('displays empty state when no menu items exist', async () => {
    render(<AdminRestaurantMenuPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/no menu items yet/i)).toBeInTheDocument();
      expect(screen.getByText(/start building your menu by adding your first item/i)).toBeInTheDocument();
    });
  });

  it('opens add menu item dialog when add button is clicked', async () => {
    const user = userEvent.setup();
    render(<AdminRestaurantMenuPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/add menu item/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/add menu item/i));
    
    await waitFor(() => {
      expect(screen.getByText('Add New Menu Item')).toBeInTheDocument();
    });
  });

  it('opens edit dialog with pre-filled data when edit button is clicked', async () => {
    const user = userEvent.setup();
    const mockMenuItems = [
      {
        item_id: 1,
        restaurant_id: 123,
        item_name: 'Pizza',
        description: 'Tasty pizza',
        is_available: true,
        image: 'pizza.jpg',
        price: 15.99,
        quantity: 8,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    ];

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/restaurants/123/menu')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockMenuItems,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ Name: "Mario's Italian Restaurant" }),
      });
    });

    render(<AdminRestaurantMenuPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Pizza')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Edit item');
    await user.click(editButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Edit Menu Item')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Pizza')).toBeInTheDocument();
      expect(screen.getByDisplayValue('15.99')).toBeInTheDocument();
    });
  });

  it('searches and filters menu items by name', async () => {
    const user = userEvent.setup();
    const mockMenuItems = [
      {
        item_id: 1,
        restaurant_id: 123,
        item_name: 'Margherita Pizza',
        description: 'Classic',
        is_available: true,
        image: '',
        price: 12,
        quantity: 5,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
      {
        item_id: 2,
        restaurant_id: 123,
        item_name: 'Caesar Salad',
        description: 'Fresh',
        is_available: true,
        image: '',
        price: 8,
        quantity: 10,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    ];

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/restaurants/123/menu')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockMenuItems,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ Name: "Mario's Italian Restaurant" }),
      });
    });

    render(<AdminRestaurantMenuPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
      expect(screen.getByText('Caesar Salad')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search menu items...');
    await user.type(searchInput, 'pizza');
    
    await waitFor(() => {
      expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
      expect(screen.queryByText('Caesar Salad')).not.toBeInTheDocument();
    });
  });

  it('validates required fields when submitting form', async () => {
    const user = userEvent.setup();
    render(<AdminRestaurantMenuPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/add menu item/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/add menu item/i));
    
    await waitFor(() => {
      expect(screen.getByText('Add New Menu Item')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create');
    await user.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please fill in required fields/i)).toBeInTheDocument();
    });
  });

  it('validates price is greater than zero', async () => {
    const user = userEvent.setup();
    render(<AdminRestaurantMenuPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/add menu item/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/add menu item/i));
    
    await waitFor(() => {
      expect(screen.getByText('Add New Menu Item')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/item name/i), 'Test Item');
    await user.type(screen.getByLabelText(/price/i), '-5');
    
    const createButton = screen.getByText('Create');
    await user.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid price greater than 0/i)).toBeInTheDocument();
    });
  });

  it('creates new menu item successfully', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (options?.method === 'POST' && url.includes('/api/restaurants/123/menu')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      if (url.includes('/api/restaurants/123/menu')) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ Name: "Mario's Italian Restaurant" }),
      });
    });

    render(<AdminRestaurantMenuPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/add menu item/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/add menu item/i));
    
    await waitFor(() => {
      expect(screen.getByText('Add New Menu Item')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/item name/i), 'New Pizza');
    await user.type(screen.getByLabelText(/price/i), '15.99');
    
    const createButton = screen.getByText('Create');
    await user.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText(/menu item created successfully/i)).toBeInTheDocument();
    });
  });

  it('deletes menu item with confirmation', async () => {
    const user = userEvent.setup();
    window.confirm = jest.fn(() => true);
    
    const mockMenuItems = [
      {
        item_id: 1,
        restaurant_id: 123,
        item_name: 'Pizza',
        description: 'Tasty',
        is_available: true,
        image: '',
        price: 10,
        quantity: 5,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    ];

    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      if (url.includes('/api/restaurants/123/menu')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockMenuItems,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ Name: "Mario's Italian Restaurant" }),
      });
    });

    render(<AdminRestaurantMenuPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Pizza')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTitle('Delete item');
    await user.click(deleteButton);
    
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete "Pizza"?');
    
    await waitFor(() => {
      expect(screen.getByText(/menu item deleted successfully/i)).toBeInTheDocument();
    });
  });

  it('toggles availability switch in dialog', async () => {
    const user = userEvent.setup();
    render(<AdminRestaurantMenuPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/add menu item/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/add menu item/i));
    
    await waitFor(() => {
      expect(screen.getByText('Add New Menu Item')).toBeInTheDocument();
    });

    const availabilitySwitch = screen.getByRole('checkbox', { name: /available for ordering/i });
    expect(availabilitySwitch).toBeChecked();
    
    await user.click(availabilitySwitch);
    
    expect(availabilitySwitch).not.toBeChecked();
  });

  it('displays error alert when API call fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<AdminRestaurantMenuPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load menu items/i)).toBeInTheDocument();
    });
  });

  it('renders table headers correctly', async () => {
    render(<AdminRestaurantMenuPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Item Name')).toBeInTheDocument();
      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('Quantity')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });
});