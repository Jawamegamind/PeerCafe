/**
 * @file __tests__/restaurants-page.test.tsx
 * Tests for the restaurants-page component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RestaurantsPage from '../app/user/restaurants/page.tsx';
import { getRestaurants } from '../app/user/restaurants/page.tsx';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock getRestaurants API
jest.mock('../app/user/restaurants/page.tsx', () => ({
  getRestaurants: jest.fn(),
}));

const mockRestaurants = [
  {
    restaurant_id: 1,
    name: 'Luigi’s Pizza',
    description: 'Authentic Italian pizza',
    address: '123 Main St',
    phone: '555-1234',
    email: 'luigi@pizza.com',
    cuisine_type: 'Italian',
    is_active: true,
    rating: 4.5,
    delivery_fee: 2.99,
  },
  {
    restaurant_id: 2,
    name: 'Sakura Sushi',
    description: 'Fresh Japanese sushi',
    address: '456 Elm St',
    phone: '555-5678',
    email: 'info@sakura.com',
    cuisine_type: 'Japanese',
    is_active: true,
    rating: 4.8,
    delivery_fee: 3.5,
  },
];

describe('🍽️ RestaurantsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading skeletons initially', async () => {
    (getRestaurants as jest.Mock).mockResolvedValueOnce(mockRestaurants);

    render(<RestaurantsPage />);

    // Skeleton should appear before data loads
    expect(await screen.findAllByRole('progressbar')).toBeTruthy();
  });

  test('displays restaurants after fetching', async () => {
    (getRestaurants as jest.Mock).mockResolvedValueOnce(mockRestaurants);

    render(<RestaurantsPage />);

    // Wait for restaurants to appear
    expect(await screen.findByText("Luigi’s Pizza")).toBeInTheDocument();
    expect(screen.getByText('Sakura Sushi')).toBeInTheDocument();
  });

  test('filters restaurants by search term', async () => {
    (getRestaurants as jest.Mock).mockResolvedValueOnce(mockRestaurants);

    render(<RestaurantsPage />);

    // Wait for data
    await waitFor(() => screen.getByText('Luigi’s Pizza'));

    // Type in the search field
    fireEvent.change(screen.getByPlaceholderText('Search restaurants, cuisines...'), {
      target: { value: 'sushi' },
    });

    expect(await screen.findByText('Sakura Sushi')).toBeInTheDocument();
    expect(screen.queryByText("Luigi’s Pizza")).not.toBeInTheDocument();
  });

  test('filters restaurants by cuisine type', async () => {
    (getRestaurants as jest.Mock).mockResolvedValueOnce(mockRestaurants);

    render(<RestaurantsPage />);

    await waitFor(() => screen.getByText('Luigi’s Pizza'));

    // Open dropdown
    const cuisineSelect = screen.getByLabelText('Cuisine Type');
    fireEvent.mouseDown(cuisineSelect);

    // Choose Japanese
    const japaneseOption = await screen.findByText('Japanese');
    fireEvent.click(japaneseOption);

    expect(await screen.findByText('Sakura Sushi')).toBeInTheDocument();
    expect(screen.queryByText("Luigi’s Pizza")).not.toBeInTheDocument();
  });

  test('shows empty state if no matches found', async () => {
    (getRestaurants as jest.Mock).mockResolvedValueOnce(mockRestaurants);

    render(<RestaurantsPage />);

    await waitFor(() => screen.getByText('Luigi’s Pizza'));

    // Search for something non-existent
    fireEvent.change(screen.getByPlaceholderText('Search restaurants, cuisines...'), {
      target: { value: 'steak' },
    });

    expect(await screen.findByText(/no restaurants match/i)).toBeInTheDocument();
  });
});