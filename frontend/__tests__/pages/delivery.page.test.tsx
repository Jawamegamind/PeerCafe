import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import the Delivery page component
import DeliveryPage from '../../app/(main)/user/delivery/page';

// Mock the Navbar component used by the page to keep tests focused
jest.mock('../../app/_components/navbar', () => ({
  __esModule: true,
  default: function MockNavbar() {
    return <div>Navbar Mock</div>;
  }
}));

// Provide a mock for navigator.geolocation used in the component
beforeAll(() => {
  // @ts-ignore
  global.navigator.geolocation = {
    getCurrentPosition: jest.fn((success) =>
      success({ coords: { latitude: 35.7796, longitude: -78.6382 } })
    ),
  };
});

afterAll(() => {
  // @ts-ignore
  delete global.navigator.geolocation;
});

describe('Delivery Page', () => {
  it('renders without crashing', () => {
    render(<DeliveryPage />);
    expect(document.body).toBeTruthy();
  });

  it('renders all ready orders as cards (View Order Details buttons)', () => {
    render(<DeliveryPage />);
    const viewButtons = screen.getAllByRole('button', { name: /View Order Details/i });
    // There are 4 orders in the hard-coded ReadyOrders array
    expect(viewButtons.length).toBe(4);
  });

  it('displays restaurant names and compensation values', () => {
    render(<DeliveryPage />);

    // Check for one of the restaurants
    expect(screen.getByText(/Bella Italia/i)).toBeInTheDocument();
    expect(screen.getByText(/Sushi World/i)).toBeInTheDocument();
    expect(screen.getByText(/Taco Haven/i)).toBeInTheDocument();
    expect(screen.getByText(/The Burger Joint/i)).toBeInTheDocument();

    // Compensation values (rendered directly from numbers)
    expect(screen.getByText(/\$7.5/)).toBeInTheDocument();
    expect(screen.getByText(/\$6.25/)).toBeInTheDocument();
    expect(screen.getByText(/\$5.75/)).toBeInTheDocument();
    expect(screen.getByText(/\$4.95/)).toBeInTheDocument();
  });

  it('shows expected time substring (HH:MM) for orders', () => {
    render(<DeliveryPage />);

    // The component renders the substring of the ISO time; assert a couple of expected times
    expect(screen.getByText(/18:45/)).toBeInTheDocument(); // Taco Haven
    expect(screen.getByText(/19:00/)).toBeInTheDocument(); // Bella Italia
    expect(screen.getByText(/18:30/)).toBeInTheDocument(); // Sushi World
    expect(screen.getByText(/18:15/)).toBeInTheDocument(); // The Burger Joint
  });

  it('renders orders sorted by compensation (highest first)', () => {
    const { container } = render(<DeliveryPage />);
    const text = container.textContent || '';

    const firstIndex = text.indexOf('Bella Italia');
    const secondIndex = text.indexOf('Sushi World');
    const thirdIndex = text.indexOf('Taco Haven');
    const fourthIndex = text.indexOf('The Burger Joint');

    // Ensure indices exist and are in descending compensation order
    expect(firstIndex).toBeGreaterThanOrEqual(0);
    expect(secondIndex).toBeGreaterThan(firstIndex);
    expect(thirdIndex).toBeGreaterThan(secondIndex);
    expect(fourthIndex).toBeGreaterThan(thirdIndex);
  });
});
