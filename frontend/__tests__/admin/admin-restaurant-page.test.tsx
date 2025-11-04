import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminRestaurantMenuPage from '../../app/(main)/admin/restaurants/[restaurantId]/page';
import { useRouter, useParams } from 'next/navigation';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock Navbar component
jest.mock('../../app/_components/navbar', () => {
  return function MockNavbar() {
    return <div data-testid="navbar">Mock Navbar</div>;
  };
});

// Provide a global fetch mock
global.fetch = jest.fn();

const mockPush = jest.fn();
const mockRouter = { push: mockPush };
const mockParams = { restaurantId: '1' };

const sampleItem = {
  item_id: 1,
  restaurant_id: 1,
  item_name: 'Admin Pizza',
  description: 'Admin delicious pizza',
  is_available: true,
  image: '',
  price: 12.0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  quantity: 5,
};

describe('AdminRestaurantMenuPage', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue(mockParams);
    jest.clearAllMocks();
  });

  it('shows loading skeletons initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<AdminRestaurantMenuPage />);

    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBe(5);
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
  });

  it('renders empty state when API returns no items', async () => {
    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/menu')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (typeof url === 'string' && url.includes('/api/restaurants/1')) {
        return Promise.resolve({ ok: true, json: async () => ({ Name: 'Test Admin' }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<AdminRestaurantMenuPage />);

    expect(await screen.findByText('No menu items yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add First Menu Item/i })).toBeInTheDocument();
  });

  it('renders a menu item row when API returns items', async () => {
    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/menu')) {
        return Promise.resolve({ ok: true, json: async () => [sampleItem] });
      }
      if (typeof url === 'string' && url.includes('/api/restaurants/1')) {
        return Promise.resolve({ ok: true, json: async () => ({ Name: 'Test Admin' }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<AdminRestaurantMenuPage />);

    expect(await screen.findByText('Admin Pizza')).toBeInTheDocument();
    expect(screen.getByText('$12.00')).toBeInTheDocument();
  });

  it('sends POST when creating a new item', async () => {
    // initial GETs return restaurant info and empty menu
    (fetch as jest.Mock).mockImplementation((url: string, opts?: any) => {
      if (opts?.method === 'POST') {
        return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
      }
      if (typeof url === 'string' && url.includes('/menu')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.resolve({ ok: true, json: async () => ({ Name: 'Test Admin' }) });
    });

    render(<AdminRestaurantMenuPage />);

    // Wait for empty state and open dialog
    expect(await screen.findByText('No menu items yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add First Menu Item/i }));

    // Fill form and submit
    fireEvent.change(screen.getByLabelText(/Item Name/i), { target: { value: 'Admin Pizza' } });
    fireEvent.change(screen.getByLabelText(/Price/i), { target: { value: '12.00' } });
    fireEvent.change(screen.getByLabelText(/Quantity/i), { target: { value: '5' } });

    fireEvent.click(screen.getByRole('button', { name: /Create/i }));

    await waitFor(() => {
      // Ensure a POST was attempted
      const postCalled = (fetch as jest.Mock).mock.calls.some(call => call[1]?.method === 'POST');
      expect(postCalled).toBe(true);
    });
  });

  it('sends PATCH when toggling availability and DELETE when deleting', async () => {
    (fetch as jest.Mock).mockImplementation((url: string, opts?: any) => {
      if (opts?.method === 'PATCH') {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, message: 'ok' }) });
      }
      if (opts?.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
      }
      if (typeof url === 'string' && url.includes('/menu')) {
        return Promise.resolve({ ok: true, json: async () => [sampleItem] });
      }
      return Promise.resolve({ ok: true, json: async () => ({ Name: 'Test Admin' }) });
    });

    render(<AdminRestaurantMenuPage />);

    expect(await screen.findByText('Admin Pizza')).toBeInTheDocument();

    // Toggle availability (PATCH)
    const visibilityButton = screen.getByTitle(/Mark as unavailable|Mark as available/);
    fireEvent.click(visibilityButton);
    await waitFor(() => {
      const patchCalled = (fetch as jest.Mock).mock.calls.some(call => call[1]?.method === 'PATCH');
      expect(patchCalled).toBe(true);
    });

    // Delete (DELETE) - mock confirm
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    const deleteButton = screen.getByTitle('Delete item');
    fireEvent.click(deleteButton);
    await waitFor(() => {
      const deleteCalled = (fetch as jest.Mock).mock.calls.some(call => call[1]?.method === 'DELETE');
      expect(deleteCalled).toBe(true);
    });
    (window.confirm as jest.Mock).mockRestore?.();
  });
});

