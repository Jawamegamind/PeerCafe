import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Mapbox GL to avoid loading real map during tests and to allow assertions
jest.mock('mapbox-gl', () => {
  const Map = jest.fn(function (opts: any) {
    // store options for assertions
    // @ts-ignore
    this.options = opts;
    this.addControl = jest.fn();
    this.fitBounds = jest.fn();
    this.remove = jest.fn();
  });

  const Marker = jest.fn(function () {
    // chainable marker mock
    // @ts-ignore
    this.setLngLat = jest.fn().mockReturnThis();
    // @ts-ignore
    this.setPopup = jest.fn().mockReturnThis();
    // @ts-ignore
    this.addTo = jest.fn().mockReturnThis();
  });

  const Popup = jest.fn(function () {
    // @ts-ignore
    this.setText = jest.fn().mockReturnThis();
  });

  const NavigationControl = jest.fn();
  const LngLatBounds = jest.fn(function () {
    // @ts-ignore
    this.extend = jest.fn();
  });

  // Provide both named exports and a default export object so that
  // `import mapboxgl from 'mapbox-gl'` (used in the app) and
  // `require('mapbox-gl')` (used in tests) both work.
  const defaultExport = {
    Map,
    Marker,
    Popup,
    NavigationControl,
    LngLatBounds,
    accessToken: '',
  };

  return {
    __esModule: true,
    default: defaultExport,
    Map,
    Marker,
    Popup,
    NavigationControl,
    LngLatBounds,
    accessToken: '',
  };
});

// Provide a full mock for axios so no network calls are made during tests.
// This must be set before importing the component so the component's
// axios usage uses the mocked implementation.
const mockReadyOrders = [
  {
    order_id: '1',
    user_id: 'u1',
    restaurant_id: 10,
    delivery_fee: 7.5,
    tip_amount: 2.0,
    estimated_pickup_time: '2025-10-27T12:00:00Z',
    estimated_delivery_time: '2025-10-27T12:30:00Z',
    latitude: 35.78,
    longitude: -78.64,
    restaurants: { name: 'Bella Italia', latitude: 35.781, longitude: -78.640, address: '123 Pizza St' },
    distance_to_restaurant: 1609.34,
    duration_to_restaurant: 600,
    distance_to_restaurant_miles: 1.0,
    restaurant_reachable_by_road: true,
    duration_to_restaurant_minutes: 10,
  },
  {
    order_id: '2',
    user_id: 'u2',
    restaurant_id: 20,
    delivery_fee: 6.25,
    tip_amount: 1.5,
    estimated_pickup_time: '2025-10-27T12:05:00Z',
    estimated_delivery_time: '2025-10-27T12:40:00Z',
    latitude: 35.79,
    longitude: -78.65,
    restaurants: { name: 'Sushi World', latitude: 35.792, longitude: -78.650, address: '456 Sushi Ave' },
    distance_to_restaurant: 1207.0,
    duration_to_restaurant: 480,
    distance_to_restaurant_miles: 0.75,
    restaurant_reachable_by_road: true,
    duration_to_restaurant_minutes: 8,
  },
  {
    order_id: '3',
    user_id: 'u3',
    restaurant_id: 30,
    delivery_fee: 5.75,
    tip_amount: 0.0,
    estimated_pickup_time: null,
    estimated_delivery_time: null,
    latitude: 35.80,
    longitude: -78.66,
    restaurants: { name: 'Taco Haven', latitude: 35.803, longitude: -78.660, address: '789 Taco Rd' },
    distance_to_restaurant: null,
    duration_to_restaurant: null,
    distance_to_restaurant_miles: null,
    restaurant_reachable_by_road: false,
    duration_to_restaurant_minutes: null,
  },
  {
    order_id: '4',
    user_id: 'u4',
    restaurant_id: 40,
    delivery_fee: 4.95,
    tip_amount: 0.5,
    estimated_pickup_time: '2025-10-27T12:10:00Z',
    estimated_delivery_time: '2025-10-27T12:50:00Z',
    latitude: 35.81,
    longitude: -78.67,
    restaurants: { name: 'The Burger Joint', latitude: 35.813, longitude: -78.670, address: '101 Burger Blvd' },
    distance_to_restaurant: 800.0,
    duration_to_restaurant: 300,
    distance_to_restaurant_miles: 0.5,
    restaurant_reachable_by_road: true,
    duration_to_restaurant_minutes: 5,
  },
];

// Mock axios before importing the component
// @ts-ignore
jest.mock('axios', () => ({ get: jest.fn(() => Promise.resolve({ data: mockReadyOrders })) }));

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
    getCurrentPosition: jest.fn((success: any) =>
      success({ coords: { latitude: 35.7796, longitude: -78.6382 } })
    ),
  };
});

afterAll(() => {
  // @ts-ignore
  delete global.navigator.geolocation;
});

// Ensure mock call counts don't accumulate between tests
beforeEach(() => {
  jest.clearAllMocks();
});

describe('Delivery Page', () => {
  it('renders without crashing', () => {
    render(<DeliveryPage />);
    expect(document.body).toBeTruthy();
  });

  it('renders all ready orders as cards (Deliver buttons)', async () => {
    render(<DeliveryPage />);
    // Wait for orders to be rendered from the mocked axios response
    const deliverButtons = await screen.findAllByRole('button', { name: /Deliver/i });
    // There are 4 orders in the mocked readyOrders array
    expect(deliverButtons.length).toBe(mockReadyOrders.length);

    // Ensure axios.get was called and the request included the deliveries/ready path
    const axios = require('axios');
    expect(axios.get).toHaveBeenCalled();
    expect(axios.get.mock.calls[0][0]).toEqual(expect.stringContaining('deliveries/ready'));
  });

  it('initializes the map and creates markers/popups', async () => {
    const mapbox = require('mapbox-gl');

    render(<DeliveryPage />);

    // Wait for at least one restaurant name to appear so the map render effect has run
    await screen.findByText(/Bella Italia/i);

    // Map constructor should be called once
    expect(mapbox.Map).toHaveBeenCalled();

    // The Map constructor received a container DOM element
    const firstCallArgs = mapbox.Map.mock.calls[0][0];
    expect(firstCallArgs).toBeDefined();
    expect(firstCallArgs.container).toBeInstanceOf(HTMLElement);

    // There should be 1 source marker + N destination markers
    expect(mapbox.Marker).toHaveBeenCalledTimes(1 + mockReadyOrders.length);

    // Popups should have been created and setText called for Source and Destinations
    expect(mapbox.Popup).toHaveBeenCalledTimes(1 + mockReadyOrders.length);
    // First popup should be for "Source"
    const popupInstances = mapbox.Popup.mock.instances;
    expect(popupInstances[0].setText).toHaveBeenCalledWith('Source');
    // Subsequent popups should include "Destination 1" .. "Destination N"
    for (let i = 0; i < mockReadyOrders.length; i++) {
      expect(popupInstances[i + 1].setText).toHaveBeenCalledWith(`Destination ${i + 1}`);
    }
  });

  it('displays restaurant names and compensation values', async () => {
    render(<DeliveryPage />);

    // Wait for restaurants to render
    expect(await screen.findByText(/Bella Italia/i)).toBeInTheDocument();
    expect(screen.getByText(/Sushi World/i)).toBeInTheDocument();
    expect(screen.getByText(/Taco Haven/i)).toBeInTheDocument();
    expect(screen.getByText(/The Burger Joint/i)).toBeInTheDocument();

    // Compensation values (rendered directly from numbers)
    expect(screen.getByText(/\$7.5/)).toBeInTheDocument();
    expect(screen.getByText(/\$6.25/)).toBeInTheDocument();
    expect(screen.getByText(/\$5.75/)).toBeInTheDocument();
    expect(screen.getByText(/\$4.95/)).toBeInTheDocument();
  });
});
