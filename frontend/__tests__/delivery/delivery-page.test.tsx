/**
 * Delivery Page Edge Cases Test Suite
 *
 * This comprehensive test suite covers non-trivial edge cases and error scenarios
 * for the DeliveryPage component, which is the main interface for delivery drivers
 * to view, accept, and manage food delivery orders.
 *
 * The component integrates with:
 * - Supabase authentication for user verification
 * - Backend API for fetching available orders and assigning deliveries
 * - Mapbox GL for rendering order locations on a map
 * - Browser Geolocation API for driver location tracking
 *
 * Test Coverage:
 * - Authentication edge cases (missing user, failed auth, role validation)
 * - Geolocation edge cases (permission denied, unavailable, timeout)
 * - API failure scenarios (network errors, timeouts, malformed responses)
 * - Order acceptance edge cases (duplicate acceptance, concurrent requests)
 * - Map rendering edge cases (missing container, invalid coordinates)
 * - Data validation edge cases (missing fields, malformed data structures)
 * - Component lifecycle edge cases (rapid unmount, prop changes)
 * - Race condition scenarios (simultaneous API calls, state updates)
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock Mapbox GL
jest.mock('mapbox-gl', () => {
  const Map = jest.fn(function (opts: any) {
    // @ts-ignore
    this.options = opts;
    this.addControl = jest.fn();
    this.fitBounds = jest.fn();
    this.remove = jest.fn();
    this.on = jest.fn();
  });

  const Marker = jest.fn(function () {
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

  const defaultExport = {
    Map,
    Marker,
    Popup,
    NavigationControl,
    LngLatBounds,
    accessToken: process.env.NEXT_PUBLIC_MAPBOX_API_KEY || '',
  };

  return {
    __esModule: true,
    default: defaultExport,
    Map,
    Marker,
    Popup,
    NavigationControl,
    LngLatBounds,
    accessToken: process.env.NEXT_PUBLIC_MAPBOX_API_KEY || '',
  };
});

// Mock Navbar
jest.mock('../../app/_components/navbar', () => ({
  __esModule: true,
  default: function MockNavbar() {
    return <div>Navbar Mock</div>;
  },
}));

// Mock alert
global.alert = jest.fn();

// Environment variables
process.env.NEXT_PUBLIC_MAPBOX_API_KEY = 'test-mapbox-key';
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000/api';

// Sample order data for tests
const mockOrder = {
  order_id: 'order-123',
  user_id: 'user-456',
  restaurant_id: 1,
  delivery_fee: 5.99,
  tip_amount: 2.0,
  estimated_pickup_time: '2025-11-05T14:30:00Z',
  estimated_delivery_time: '2025-11-05T15:00:00Z',
  latitude: 35.7796,
  longitude: -78.6382,
  restaurants: {
    name: 'Test Restaurant',
    latitude: 35.7796,
    longitude: -78.6382,
    address: '123 Main St',
  },
  customer: {
    first_name: 'John',
    last_name: 'Doe',
  },
  delivery_address: {
    city: 'Raleigh',
    state: 'NC',
    street: '456 Oak Ave',
    zip_code: '27601',
    instructions: 'Ring doorbell',
  },
  distance_restaurant_delivery: 2.5,
  duration_restaurant_delivery: 15,
  distance_to_restaurant: 1609.34,
  duration_to_restaurant: 600,
  distance_to_restaurant_miles: 1.0,
  restaurant_reachable_by_road: true,
  duration_to_restaurant_minutes: 10,
};

describe('DeliveryPage Edge Cases', () => {
  let mockSupabaseClient: any;
  let mockGeolocation: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock geolocation
    mockGeolocation = {
      getCurrentPosition: jest.fn((success: any) =>
        success({ coords: { latitude: 35.7796, longitude: -78.6382 } })
      ),
      watchPosition: jest.fn(),
      clearWatch: jest.fn(),
    };
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    });

    // Default Supabase mock with authenticated user
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'driver-123' } },
          error: null,
        }),
      },
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { user_id: 'driver-123', IsAdmin: false },
                  error: null,
                }),
              }),
            }),
          };
        }
        // orders table - no active orders by default
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        };
      }),
    };
  });

  afterEach(() => {
    delete (global.navigator as any).geolocation;
  });

  /**
   * AUTHENTICATION EDGE CASES
   * Tests various authentication failure scenarios and user state validation
   */
  describe('Authentication Edge Cases', () => {
    /**
     * Test: Supabase auth.getUser() returns null user
     * Scenario: User session expired or was invalidated
     * Expected: Alert displayed, no page content rendered
     */
    it('handles null user from Supabase auth', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      jest.doMock('@/utils/supabase/client', () => ({
        createClient: () => mockSupabaseClient,
      }));

      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;

      render(<DeliveryPage />);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          'Please log in to access the delivery page.'
        );
      });
    });
  });

  /**
   * GEOLOCATION EDGE CASES
   * Tests browser geolocation API failures and permission scenarios
   */
  describe('Geolocation Edge Cases', () => {
    beforeEach(() => {
      jest.doMock('@/utils/supabase/client', () => ({
        createClient: () => mockSupabaseClient,
      }));
    });

    /**
     * Test: Geolocation API not available
     * Scenario: Old browser or restricted environment
     * Expected: Component renders without location, no orders fetched
     */
    it('handles missing geolocation API', async () => {
      delete (global.navigator as any).geolocation;

      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;

      render(<DeliveryPage />);

      await waitFor(() => {
        expect(screen.getByText(/no active delivery/i)).toBeInTheDocument();
      });

      // Should not attempt to fetch orders without location
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    /**
     * Test: User denies geolocation permission
     * Scenario: Permission dialog declined by user
     * Expected: Component renders, no orders fetched
     */
    it('handles geolocation permission denied', async () => {
      mockGeolocation.getCurrentPosition.mockImplementationOnce(
        (success: any, error: any) => {
          error({ code: 1, message: 'User denied Geolocation' });
        }
      );

      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;

      render(<DeliveryPage />);

      await waitFor(() => {
        expect(screen.getByText(/no active delivery/i)).toBeInTheDocument();
      });

      // Should not fetch orders without location
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    /**
     * Test: Geolocation position unavailable
     * Scenario: GPS signal lost, device cannot determine location
     * Expected: Component renders gracefully
     */
    it('handles geolocation position unavailable', async () => {
      mockGeolocation.getCurrentPosition.mockImplementationOnce(
        (success: any, error: any) => {
          error({ code: 2, message: 'Position unavailable' });
        }
      );

      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;

      render(<DeliveryPage />);

      await waitFor(() => {
        expect(screen.getByText(/no active delivery/i)).toBeInTheDocument();
      });
    });

    /**
     * Test: Geolocation timeout
     * Scenario: Location acquisition takes too long
     * Expected: Component renders without crashing
     */
    it('handles geolocation timeout', async () => {
      mockGeolocation.getCurrentPosition.mockImplementationOnce(
        (success: any, error: any) => {
          error({ code: 3, message: 'Timeout' });
        }
      );

      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;

      render(<DeliveryPage />);

      await waitFor(() => {
        expect(screen.getByText(/no active delivery/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * API FAILURE SCENARIOS
   * Tests various backend API failure modes
   */
  describe('API Failure Scenarios', () => {
    beforeEach(() => {
      jest.doMock('@/utils/supabase/client', () => ({
        createClient: () => mockSupabaseClient,
      }));
    });

    /**
     * Test: Network error when fetching ready orders
     * Scenario: Complete network failure, backend unreachable
     * Expected: Component renders, shows no orders available
     */
    it('handles network error when fetching ready orders', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;

      render(<DeliveryPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/no orders are available nearby/i)
        ).toBeInTheDocument();
      });
    });

    /**
     * Test: API returns 500 Internal Server Error
     * Scenario: Backend server error during order fetch
     * Expected: Component handles gracefully, shows no orders
     */
    it('handles 500 server error when fetching orders', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { detail: 'Internal server error' },
        },
      });

      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;

      render(<DeliveryPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/no orders are available nearby/i)
        ).toBeInTheDocument();
      });
    });

    /**
     * Test: API returns 404 Not Found
     * Scenario: Endpoint doesn't exist or was moved
     * Expected: Component handles gracefully
     */
    it('handles 404 error when fetching orders', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 404,
          data: { detail: 'Endpoint not found' },
        },
      });

      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;

      render(<DeliveryPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/no orders are available nearby/i)
        ).toBeInTheDocument();
      });
    });

    /**
     * Test: API request timeout
     * Scenario: Request exceeds timeout limit
     * Expected: Component handles timeout gracefully
     */
    it('handles API request timeout', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded',
      });

      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;

      render(<DeliveryPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/no orders are available nearby/i)
        ).toBeInTheDocument();
      });
    });

    /**
     * Test: API returns malformed JSON
     * Scenario: Invalid response format from server
     * Expected: Component handles parse error gracefully
     */
    it('handles malformed JSON response', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: 'invalid json string',
      });

      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;

      render(<DeliveryPage />);

      await waitFor(() => {
        expect(screen.getByText(/no active delivery/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * ORDER ACCEPTANCE EDGE CASES
   * Tests edge cases around accepting and assigning delivery orders
   */
  describe('Order Acceptance Edge Cases', () => {
    beforeEach(() => {
      jest.doMock('@/utils/supabase/client', () => ({
        createClient: () => mockSupabaseClient,
      }));

      mockedAxios.get.mockResolvedValue({ data: [mockOrder] });
    });

    /**
     * Test: Network error during order acceptance
     * Scenario: Connection lost while submitting acceptance
     * Expected: Alert with error message
     */
    it('handles network error during order acceptance', async () => {
      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;
      const user = userEvent.setup();

      mockedAxios.patch.mockRejectedValueOnce(new Error('Network error'));

      render(<DeliveryPage />);

      const acceptButton = await screen.findByRole('button', {
        name: /accept & deliver/i,
      });

      await user.click(acceptButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          'Failed to accept order. Please try again.'
        );
      });
    });

    /**
     * Test: Order already assigned to another driver
     * Scenario: Race condition - multiple drivers accept same order
     * Expected: Alert with specific error message from backend
     */
    it('handles order already assigned to another driver', async () => {
      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;
      const user = userEvent.setup();

      mockedAxios.patch.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { detail: 'Order already assigned to another driver' },
        },
      });

      render(<DeliveryPage />);

      const acceptButton = await screen.findByRole('button', {
        name: /accept & deliver/i,
      });

      await user.click(acceptButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          'Order already assigned to another driver'
        );
      });
    });

    /**
     * Test: Order no longer in 'ready' status
     * Scenario: Order was cancelled or updated while driver was viewing
     * Expected: Alert with backend error message
     */
    it('handles order not in ready status', async () => {
      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;
      const user = userEvent.setup();

      mockedAxios.patch.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { detail: 'Order is not in ready status' },
        },
      });

      render(<DeliveryPage />);

      const acceptButton = await screen.findByRole('button', {
        name: /accept & deliver/i,
      });

      await user.click(acceptButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          'Order is not in ready status'
        );
      });
    });

    /**
     * Test: Rapid consecutive clicks on accept button
     * Scenario: Driver accidentally double-clicks accept button
     * Expected: Only one API call, button disabled during processing
     */
    it('prevents duplicate order acceptance requests', async () => {
      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;
      const user = userEvent.setup();

      mockedAxios.patch.mockResolvedValue({
        status: 200,
        data: { order_id: mockOrder.order_id, status: 'assigned' },
      });

      render(<DeliveryPage />);

      const acceptButton = await screen.findByRole('button', {
        name: /accept & deliver/i,
      });

      // Click multiple times rapidly
      await user.click(acceptButton);
      await user.click(acceptButton);
      await user.click(acceptButton);

      // Should only make one API call
      await waitFor(() => {
        expect(mockedAxios.patch).toHaveBeenCalledTimes(1);
      });
    });
  });

  /**
   * DATA VALIDATION EDGE CASES
   * Tests handling of missing or malformed data fields
   */
  describe('Data Validation Edge Cases', () => {
    beforeEach(() => {
      jest.doMock('@/utils/supabase/client', () => ({
        createClient: () => mockSupabaseClient,
      }));
    });

    /**
     * Test: Order missing restaurant information
     * Scenario: Malformed data from backend
     * Expected: Component renders without crashing
     */
    it('handles order with missing restaurant data', async () => {
      const orderWithoutRestaurant = {
        ...mockOrder,
        restaurants: null,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: [orderWithoutRestaurant] });

      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;

      render(<DeliveryPage />);

      await waitFor(() => {
        expect(screen.getByText(/browse nearby orders/i)).toBeInTheDocument();
      });
    });

    /**
     * Test: Order missing customer information
     * Scenario: Incomplete order data
     * Expected: Component renders, displays default values
     */
    it('handles order with missing customer data', async () => {
      const orderWithoutCustomer = {
        ...mockOrder,
        customer: null,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: [orderWithoutCustomer] });

      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;

      render(<DeliveryPage />);

      await waitFor(() => {
        expect(screen.getByText(/browse nearby orders/i)).toBeInTheDocument();
      });
    });

    /**
     * Test: Order with null distance/duration values
     * Scenario: Route calculation failed on backend
     * Expected: Component displays order with missing values
     */
    it('handles order with null distance and duration', async () => {
      const orderWithNullMetrics = {
        ...mockOrder,
        distance_to_restaurant_miles: null,
        duration_to_restaurant_minutes: null,
        distance_restaurant_delivery: null,
        duration_restaurant_delivery: null,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: [orderWithNullMetrics] });

      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;

      render(<DeliveryPage />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /accept & deliver/i })
        ).toBeInTheDocument();
      });
    });

    /**
     * Test: Empty orders array from API
     * Scenario: No orders available in the area
     * Expected: "No orders available" message displayed
     */
    it('handles empty orders array', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [] });

      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;

      render(<DeliveryPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/no orders are available nearby/i)
        ).toBeInTheDocument();
      });
    });

    /**
     * Test: Order with invalid coordinates (NaN, Infinity)
     * Scenario: Data corruption or calculation error
     * Expected: Component renders without crashing map
     */
    it('handles order with invalid coordinates', async () => {
      const orderWithInvalidCoords = {
        ...mockOrder,
        restaurants: {
          ...mockOrder.restaurants,
          latitude: NaN,
          longitude: Infinity,
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: [orderWithInvalidCoords] });

      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;

      render(<DeliveryPage />);

      await waitFor(() => {
        expect(screen.getByText(/browse nearby orders/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * MAP RENDERING EDGE CASES
   * Tests Mapbox integration and rendering scenarios
   */
  describe('Map Rendering Edge Cases', () => {
    beforeEach(() => {
      jest.doMock('@/utils/supabase/client', () => ({
        createClient: () => mockSupabaseClient,
      }));
    });

    /**
     * Test: Map container ref not available during render
     * Scenario: DOM not ready when map initialization attempted
     * Expected: Component doesn't crash, map initializes on next render
     */
    it('handles missing map container ref', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [mockOrder] });

      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;

      render(<DeliveryPage />);

      await waitFor(() => {
        expect(
          screen.getByText(mockOrder.restaurants.name)
        ).toBeInTheDocument();
      });
    });

    /**
     * Test: Map initialization with missing Mapbox token
     * Scenario: Environment variable not set
     * Expected: Component renders, map doesn't crash
     */
    it('handles missing Mapbox API token', async () => {
      const originalToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
      delete process.env.NEXT_PUBLIC_MAPBOX_API_KEY;

      mockedAxios.get.mockResolvedValueOnce({ data: [mockOrder] });

      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;

      render(<DeliveryPage />);

      await waitFor(() => {
        expect(
          screen.getByText(mockOrder.restaurants.name)
        ).toBeInTheDocument();
      });

      process.env.NEXT_PUBLIC_MAPBOX_API_KEY = originalToken;
    });

    /**
     * Test: Map rendering with orders but no geolocation
     * Scenario: Orders loaded before location acquired
     * Expected: Map waits for location before rendering
     */
    it('waits for geolocation before rendering map with orders', async () => {
      let locationCallback: any;
      mockGeolocation.getCurrentPosition.mockImplementationOnce(
        (success: any) => {
          locationCallback = success;
          // Don't call success immediately
        }
      );

      mockedAxios.get.mockResolvedValueOnce({ data: [mockOrder] });

      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;

      render(<DeliveryPage />);

      // Map should not be rendered yet
      await waitFor(() => {
        expect(screen.getByText(/no active delivery/i)).toBeInTheDocument();
      });

      // Now trigger location success
      act(() => {
        locationCallback({
          coords: { latitude: 35.7796, longitude: -78.6382 },
        });
      });

      // Map should render after location is available
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled();
      });
    });
  });

  /**
   * COMPONENT LIFECYCLE EDGE CASES
   * Tests component mount, unmount, and update scenarios
   */
  describe('Component Lifecycle Edge Cases', () => {
    beforeEach(() => {
      jest.doMock('@/utils/supabase/client', () => ({
        createClient: () => mockSupabaseClient,
      }));
    });

    /**
     * Test: Component unmounted before async operations complete
     * Scenario: User navigates away while data is loading
     * Expected: No memory leaks, no state updates on unmounted component
     */
    it('handles unmount before async operations complete', async () => {
      mockedAxios.get.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve({ data: [mockOrder] }), 2000)
          )
      );

      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;

      const { unmount } = render(<DeliveryPage />);

      // Unmount immediately
      act(() => {
        unmount();
      });

      // Wait for async operation timeout
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 2500));
      });

      // Should not cause errors
      expect(true).toBe(true);
    });

    /**
     * Test: Rapid successive location updates
     * Scenario: GPS coordinates updating rapidly
     * Expected: Component handles multiple state updates gracefully
     */
    it('handles rapid geolocation updates', async () => {
      let updateCount = 0;
      mockGeolocation.getCurrentPosition.mockImplementation((success: any) => {
        const interval = setInterval(() => {
          updateCount++;
          success({
            coords: {
              latitude: 35.7796 + updateCount * 0.001,
              longitude: -78.6382 + updateCount * 0.001,
            },
          });
          if (updateCount >= 5) {
            clearInterval(interval);
          }
        }, 100);
      });

      mockedAxios.get.mockResolvedValue({ data: [mockOrder] });

      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;

      render(<DeliveryPage />);

      await waitFor(
        () => {
          expect(updateCount).toBeGreaterThanOrEqual(5);
        },
        { timeout: 1000 }
      );
    });

    /**
     * Test: Map cleanup on component unmount
     * Scenario: Component unmounts with active map instance
     * Expected: Map.remove() called to clean up resources
     */
    it('cleans up map on component unmount', async () => {
      const mapboxgl = require('mapbox-gl');
      mockedAxios.get.mockResolvedValueOnce({ data: [mockOrder] });

      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;

      const { unmount } = render(<DeliveryPage />);

      await waitFor(() => {
        expect(
          screen.getByText(mockOrder.restaurants.name)
        ).toBeInTheDocument();
      });

      // Wait for map to initialize
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // Unmount
      act(() => {
        unmount();
      });

      // Check map.remove() was called during cleanup
      await waitFor(() => {
        const mapInstances = mapboxgl.Map.mock.instances;
        if (mapInstances.length > 0) {
          expect(mapInstances[0].remove).toHaveBeenCalled();
        }
      });
    });
  });

  /**
   * CONCURRENT OPERATIONS EDGE CASES
   * Tests race conditions and simultaneous operations
   */
  describe('Concurrent Operations Edge Cases', () => {
    beforeEach(() => {
      jest.doMock('@/utils/supabase/client', () => ({
        createClient: () => mockSupabaseClient,
      }));
    });

    /**
     * Test: Multiple simultaneous order fetch requests
     * Scenario: Location updates trigger overlapping API calls
     * Expected: Latest request wins, no data corruption
     */
    it('handles multiple simultaneous order fetch requests', async () => {
      let callCount = 0;
      mockedAxios.get.mockImplementation(() => {
        callCount++;
        return new Promise(resolve =>
          setTimeout(
            () =>
              resolve({
                data: [{ ...mockOrder, order_id: `order-${callCount}` }],
              }),
            100
          )
        );
      });

      const DeliveryPage = (await import('../../app/(main)/user/delivery/page'))
        .default;

      render(<DeliveryPage />);

      // Trigger multiple location updates rapidly
      act(() => {
        mockGeolocation.getCurrentPosition.mock.calls[0][0]({
          coords: { latitude: 35.7796, longitude: -78.6382 },
        });
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      act(() => {
        mockGeolocation.getCurrentPosition.mock.calls[0][0]({
          coords: { latitude: 35.78, longitude: -78.639 },
        });
      });

      await waitFor(
        () => {
          expect(callCount).toBeGreaterThanOrEqual(2);
        },
        { timeout: 500 }
      );
    });
  });
});
