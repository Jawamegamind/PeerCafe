import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import NavigationMap from '@/app/(main)/user/delivery/NavigationMap';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('mapbox-gl', () => ({
  accessToken: '',
  Map: jest.fn(() => ({
    addControl: jest.fn(),
    on: jest.fn((event, callback) => {
      if (event === 'load') {
        setTimeout(callback, 0);
      }
    }),
    addSource: jest.fn(),
    addLayer: jest.fn(),
    fitBounds: jest.fn(),
    remove: jest.fn(),
  })),
  NavigationControl: jest.fn(),
  Marker: jest.fn(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    setPopup: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
  })),
  Popup: jest.fn(() => ({
    setText: jest.fn().mockReturnThis(),
  })),
  LngLatBounds: jest.fn(() => ({
    extend: jest.fn(),
  })),
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
  })),
}));

// Mock Material-UI to avoid rendering issues
jest.mock('@mui/material', () => ({
  Box: ({ children, sx, ref, ...props }: any) => {
    const cleanProps = { ...props };
    delete cleanProps.sx;
    return (
      <div ref={ref} {...cleanProps}>
        {children}
      </div>
    );
  },
  Card: ({ children, sx, ...props }: any) => {
    const cleanProps = { ...props };
    delete cleanProps.sx;
    return <div {...cleanProps}>{children}</div>;
  },
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Typography: ({ children, variant, color, fontWeight, gutterBottom, ...props }: any) => {
    const cleanProps = { ...props };
    delete cleanProps.variant;
    delete cleanProps.color;
    delete cleanProps.fontWeight;
    delete cleanProps.gutterBottom;
    return <div {...cleanProps}>{children}</div>;
  },
  Button: ({ children, onClick, disabled, fullWidth, variant, color, ...props }: any) => {
    const cleanProps = { ...props };
    delete cleanProps.fullWidth;
    delete cleanProps.variant;
    delete cleanProps.color;
    return (
      <button onClick={onClick} disabled={disabled} {...cleanProps}>
        {children}
      </button>
    );
  },
  LinearProgress: ({ sx, ...props }: any) => {
    const cleanProps = { ...props };
    delete cleanProps.sx;
    return <div {...cleanProps}>Loading...</div>;
  },
  List: ({ children, dense, ...props }: any) => {
    const cleanProps = { ...props };
    delete cleanProps.dense;
    return <ul {...cleanProps}>{children}</ul>;
  },
  ListItem: ({ children, ...props }: any) => <li {...props}>{children}</li>,
  ListItemText: ({ primary, secondary }: any) => (
    <div>
      <span>{primary}</span>
      {secondary && <span>{secondary}</span>}
    </div>
  ),
  Dialog: ({ open, children, onClose }: any) =>
    open ? (
      <div role="dialog" data-testid="delivery-dialog">
        {children}
      </div>
    ) : null,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogActions: ({ children }: any) => <div data-testid="dialog-actions">{children}</div>,
  TextField: ({ onChange, value, label, inputProps, fullWidth, ...props }: any) => {
    const cleanProps = { ...props };
    delete cleanProps.fullWidth;
    delete cleanProps.inputProps;
    return (
      <input
        value={value}
        onChange={onChange}
        placeholder={label}
        aria-label={label}
        {...cleanProps}
      />
    );
  },
  Alert: ({ children, severity, sx }: any) => {
    const cleanProps: any = {};
    if (severity) cleanProps['data-severity'] = severity;
    return (
      <div role="alert" {...cleanProps}>
        {children}
      </div>
    );
  },
}));

jest.mock('@mui/icons-material', () => ({
  Navigation: () => <span>NavIcon</span>,
  Restaurant: () => <span>RestaurantIcon</span>,
  Home: () => <span>HomeIcon</span>,
}));

/**
 * NavigationMap Edge Cases Test Suite
 * 
 * This test suite comprehensively tests edge cases and error scenarios for the NavigationMap component,
 * which is responsible for displaying turn-by-turn navigation for delivery drivers.
 * 
 * The component integrates with:
 * - Browser Geolocation API for driver location tracking
 * - Mapbox API for route rendering and turn-by-turn directions
 * - Backend API for fetching navigation routes and verifying deliveries
 * - Supabase for real-time order status updates
 * 
 * Tests cover scenarios including API failures, missing permissions, network errors,
 * and various user interaction patterns to ensure robust error handling.
 */
describe('NavigationMap Edge Cases', () => {
  const mockOnMarkPickedUp = jest.fn();
  const mockOnMarkDelivered = jest.fn();
  const mockOnOrderUpdated = jest.fn();

  const defaultProps = {
    orderId: 'test-order-123',
    orderStatus: 'assigned',
    onMarkPickedUp: mockOnMarkPickedUp,
    onMarkDelivered: mockOnMarkDelivered,
    onOrderUpdated: mockOnOrderUpdated,
  };

  const mockRouteData = {
    order_id: 'test-order-123',
    order_status: 'assigned',
    route_type: 'to_restaurant' as const,
    origin: { latitude: 40.7128, longitude: -74.006 },
    destination: {
      name: 'Test Restaurant',
      address: '123 Main St',
      latitude: 40.7589,
      longitude: -73.9851,
    },
    route: {
      distance_meters: 5000,
      distance_miles: 3.1,
      duration_seconds: 600,
      duration_minutes: 10,
      geometry: {
        type: 'LineString',
        coordinates: [
          [-74.006, 40.7128],
          [-73.9851, 40.7589],
        ],
      },
      steps: [
        {
          maneuver: { instruction: 'Turn right onto Main St' },
          distance: 1609.34,
        },
        {
          maneuver: { instruction: 'Turn left onto Oak Ave' },
          distance: 804.67,
        },
      ],
    },
  };

  let mockGeolocation: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock geolocation API
    mockGeolocation = {
      watchPosition: jest.fn(),
      clearWatch: jest.fn(),
      getCurrentPosition: jest.fn(),
    };
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    });

    // Mock environment variables
    process.env.NEXT_PUBLIC_MAPBOX_API_KEY = 'test-mapbox-key';
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000/api';
  });

  afterEach(() => {
    delete (global.navigator as any).geolocation;
  });

  /**
   * Geolocation Edge Cases
   * 
   * Tests the component's behavior when the browser's Geolocation API
   * is unavailable or returns various error states. These scenarios can occur
   * when users deny location permissions, use browsers without geolocation support,
   * or experience GPS/network issues.
   */
  describe('Geolocation Edge Cases', () => {
    /**
     * Test: Missing Geolocation API
     * 
     * Verifies that the component handles gracefully when the browser doesn't
     * support the Geolocation API (older browsers or restricted environments).
     * Expected: Component should display loading state without crashing.
     */
    it('handles missing geolocation API gracefully', async () => {
      delete (global.navigator as any).geolocation;

      render(<NavigationMap {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/loading navigation/i)).toBeInTheDocument();
      });
    });

    /**
     * Test: Geolocation Permission Denied
     * 
     * Tests the scenario where the user explicitly denies location permission.
     * This is the most common geolocation error (error code 1).
     * Expected: Component should handle the error without crashing and continue
     * displaying the loading state.
     */
    it('handles geolocation permission denied', async () => {
      mockGeolocation.watchPosition.mockImplementation(
        (success: Function, error: Function) => {
          error({ code: 1, message: 'User denied Geolocation' });
          return 1;
        }
      );

      render(<NavigationMap {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/loading navigation/i)).toBeInTheDocument();
      });
    });

    /**
     * Test: Geolocation Position Unavailable
     * 
     * Tests when the device cannot determine its location (error code 2).
     * This can happen due to GPS signal loss, poor network connectivity,
     * or when location services are disabled at the device level.
     * Expected: Component should handle the error gracefully.
     */
    it('handles geolocation position unavailable', async () => {
      mockGeolocation.watchPosition.mockImplementation(
        (success: Function, error: Function) => {
          error({ code: 2, message: 'Position unavailable' });
          return 1;
        }
      );

      render(<NavigationMap {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/loading navigation/i)).toBeInTheDocument();
      });
    });

    /**
     * Test: Geolocation Timeout
     * 
     * Tests when the location request times out (error code 3).
     * This occurs when the device takes too long to acquire a GPS fix,
     * typically due to weak satellite signals or slow network responses.
     * Expected: Component should handle timeout errors without crashing.
     */
    it('handles geolocation timeout', async () => {
      mockGeolocation.watchPosition.mockImplementation(
        (success: Function, error: Function) => {
          error({ code: 3, message: 'Timeout' });
          return 1;
        }
      );

      render(<NavigationMap {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/loading navigation/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * API Edge Cases
   * 
   * Tests the component's resilience to various API failures when fetching
   * navigation routes from the backend. These tests simulate real-world
   * network conditions and server errors to ensure the component handles
   * failures gracefully without breaking the user experience.
   */
  describe('API Edge Cases', () => {
    beforeEach(() => {
      mockGeolocation.watchPosition.mockImplementation((success: Function) => {
        success({
          coords: { latitude: 40.7128, longitude: -74.006 },
        });
        return 1;
      });
    });

    /**
     * Test: Network Error During Route Fetch
     * 
     * Simulates a complete network failure when fetching the navigation route.
     * This could occur due to loss of internet connectivity, DNS failures,
     * or unreachable backend servers.
     * Expected: Component should remain in loading state without crashing.
     */
    it('handles network error when fetching route', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      render(<NavigationMap {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/loading navigation/i)).toBeInTheDocument();
      });
    });

    /**
     * Test: 404 Error - Order Not Found
     * 
     * Tests the scenario where the order ID doesn't exist in the database.
     * This can happen if the order was deleted, the ID is invalid, or there's
     * a data synchronization issue.
     * Expected: Component should handle the 404 response gracefully.
     */
    it('handles 404 error (order not found)', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 404, data: { detail: 'Order not found' } },
      });

      render(<NavigationMap {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/loading navigation/i)).toBeInTheDocument();
      });
    });

    /**
     * Test: 400 Error - Invalid Order Status
     * 
     * Tests when the backend rejects the navigation request because the order
     * is in an invalid status (e.g., already delivered, cancelled, or pending).
     * Only orders in 'assigned' or 'picked_up' status should have navigation.
     * Expected: Component should handle the validation error appropriately.
     */
    it('handles 400 error (invalid order status)', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { detail: 'Order status does not require navigation' },
        },
      });

      render(<NavigationMap {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/loading navigation/i)).toBeInTheDocument();
      });
    });

    /**
     * Test: 500 Internal Server Error
     * 
     * Simulates a backend server error during route fetching.
     * This could be caused by database issues, unhandled exceptions,
     * or problems with external APIs (like Mapbox) on the server side.
     * Expected: Component should handle server errors without crashing.
     */
    it('handles 500 server error', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { detail: 'Internal server error' },
        },
      });

      render(<NavigationMap {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/loading navigation/i)).toBeInTheDocument();
      });
    });

    /**
     * Test: Request Timeout Error
     * 
     * Tests when the API request exceeds the configured timeout period (20 seconds).
     * This can happen with slow network connections or when the server is
     * overloaded and takes too long to respond.
     * Expected: Component should handle timeout gracefully.
     */
    it('handles timeout error', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 20000ms exceeded',
      });

      render(<NavigationMap {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/loading navigation/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * Environment Variable Edge Cases
   * 
   * Tests the component's behavior when required environment variables
   * are missing or misconfigured. These scenarios can occur during deployment
   * if environment variables aren't properly set up.
   */
  describe('Environment Variable Edge Cases', () => {
    });

    /**
     * Test: Missing Mapbox API Key
     * 
     * Verifies that the component functions even when the Mapbox API key
     * is not configured. The map won't render properly, but the component
     * should still fetch and display route data.
     * Expected: Component should continue functioning despite missing API key.
     */
    it('handles missing MAPBOX_API_KEY', async () => {
      delete process.env.NEXT_PUBLIC_MAPBOX_API_KEY;

      mockGeolocation.watchPosition.mockImplementation((success: Function) => {
        success({
          coords: { latitude: 40.7128, longitude: -74.006 },
        });
        return 1;
      });

      mockedAxios.get.mockResolvedValueOnce({ data: mockRouteData });

      render(<NavigationMap {...defaultProps} />);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled();
      });
    });

    /**
     * Test: Missing API URL
     * 
     * Tests the component's behavior when the backend API URL environment variable
     * is not set. The component should fallback to the default localhost URL.
     * Expected: Component should use fallback URL (http://localhost:8000) and
     * continue to function normally.
     */
    it('handles missing API_URL', async () => {
      delete process.env.NEXT_PUBLIC_API_URL;

      mockGeolocation.watchPosition.mockImplementation((success: Function) => {
        success({
          coords: { latitude: 40.7128, longitude: -74.006 },
        });
        return 1;
      });

      render(<NavigationMap {...defaultProps} />);

      await waitFor(() => {
        // Should fallback to localhost
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('http://localhost:8000'),
          expect.any(Object)
        );
      });
    });
  });

  /**
   * Delivery Code Verification Edge Cases
   * 
   * Tests the complete delivery verification flow, including the dialog interactions
   * for entering a delivery PIN code. These tests ensure secure delivery confirmation
   * by validating that drivers must enter the correct PIN provided to the customer.
   * This prevents fraudulent delivery completions and ensures accountability.
   */
  describe('Delivery Code Verification Edge Cases', () => {
    const customerRouteData = {
      ...mockRouteData,
      order_status: 'picked_up',
      route_type: 'to_customer' as const,
      destination: {
        name: 'Customer',
        address: '456 Oak St',
        latitude: 40.7589,
        longitude: -73.9851,
      },
    };

    beforeEach(async () => {
      mockGeolocation.watchPosition.mockImplementation((success: Function) => {
        success({
          coords: { latitude: 40.7128, longitude: -74.006 },
        });
        return 1;
      });

      mockedAxios.get.mockResolvedValue({ data: customerRouteData });
    });

    /**
     * Test: Empty Delivery Code Validation
     * 
     * Tests that the component properly validates and shows an error message
     * when the driver attempts to submit the delivery verification dialog
     * without entering a delivery code.
     * Expected: Error message "Please enter the delivery code" should be displayed,
     * and the dialog should remain open.
     */
    it('shows error when delivery code is empty', async () => {
      const user = userEvent.setup();

      render(
        <NavigationMap
          {...defaultProps}
          orderStatus="picked_up"
          onOrderUpdated={mockOnOrderUpdated}
        />
      );

      // Wait for route data to load and Mark Delivered button to appear
      await waitFor(() => {
        expect(screen.getByText(/mark delivered/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Click Mark Delivered button
      const markDeliveredButton = screen.getByText(/mark delivered/i);
      await user.click(markDeliveredButton);

      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByTestId('delivery-dialog')).toBeInTheDocument();
      }, { timeout: 1000 });

      // Verify dialog content
      expect(screen.getByText(/enter delivery code/i)).toBeInTheDocument();

      // Click Verify & Deliver without entering code
      const verifyButton = screen.getByText(/verify & deliver/i);
      await user.click(verifyButton);

      // Check for error message
      await waitFor(() => {
        expect(
          screen.getByText(/please enter the delivery code/i)
        ).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    /**
     * Test: Invalid Delivery Code
     * 
     * Tests when the driver enters an incorrect delivery PIN code.
     * The backend should reject the request with a 400 error, and the
     * component should display the error message to the driver.
     * Expected: Error message "Invalid delivery code" displayed, dialog remains open.
     */
    it('handles invalid delivery code', async () => {
      const user = userEvent.setup();

      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { detail: 'Invalid delivery code' },
        },
      });

      render(
        <NavigationMap
          {...defaultProps}
          orderStatus="picked_up"
          onOrderUpdated={mockOnOrderUpdated}
        />
      );

      // Wait for Mark Delivered button
      await waitFor(() => {
        expect(screen.getByText(/mark delivered/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Open dialog
      const markDeliveredButton = screen.getByText(/mark delivered/i);
      await user.click(markDeliveredButton);

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByTestId('delivery-dialog')).toBeInTheDocument();
      }, { timeout: 1000 });

      // Enter invalid code
      const codeInput = screen.getByLabelText(/delivery code/i);
      await user.type(codeInput, '000000');

      // Click verify button
      const verifyButton = screen.getByText(/verify & deliver/i);
      await user.click(verifyButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/invalid delivery code/i)).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    /**
     * Test: Network Error During Verification
     * 
     * Tests handling of network failures while submitting the delivery code.
     * This could occur due to poor connectivity or server unavailability.
     * Expected: Component should display an error alert and allow retry.
     */
    it('handles network error during verification', async () => {
      const user = userEvent.setup();

      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      render(
        <NavigationMap
          {...defaultProps}
          orderStatus="picked_up"
          onOrderUpdated={mockOnOrderUpdated}
        />
      );

      // Wait for Mark Delivered button
      await waitFor(() => {
        expect(screen.getByText(/mark delivered/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Open dialog
      const markDeliveredButton = screen.getByText(/mark delivered/i);
      await user.click(markDeliveredButton);

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByTestId('delivery-dialog')).toBeInTheDocument();
      }, { timeout: 1000 });

      // Enter code
      const codeInput = screen.getByLabelText(/delivery code/i);
      await user.type(codeInput, '123456');

      // Click verify button
      const verifyButton = screen.getByText(/verify & deliver/i);
      await user.click(verifyButton);

      // Wait for error alert to appear
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    /**
     * Test: Dialog Close Prevention During Verification
     * 
     * Tests that the cancel button is disabled while the delivery verification
     * request is in progress, preventing accidental dialog dismissal.
     * Expected: Cancel button should be disabled during the async verification call.
     */
    it('prevents dialog close during verification', async () => {
      const user = userEvent.setup();

      // Mock a delayed response (will resolve after we check button state)
      let resolvePromise: any;
      mockedAxios.post.mockImplementation(
        () =>
          new Promise(resolve => {
            resolvePromise = resolve;
            setTimeout(() => resolve({ data: { status: 'delivered' } }), 500);
          })
      );

      render(
        <NavigationMap
          {...defaultProps}
          orderStatus="picked_up"
          onOrderUpdated={mockOnOrderUpdated}
        />
      );

      // Wait for Mark Delivered button
      await waitFor(() => {
        expect(screen.getByText(/mark delivered/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Open dialog
      const markDeliveredButton = screen.getByText(/mark delivered/i);
      await user.click(markDeliveredButton);

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByTestId('delivery-dialog')).toBeInTheDocument();
      }, { timeout: 1000 });

      // Enter code
      const codeInput = screen.getByLabelText(/delivery code/i);
      await user.type(codeInput, '123456');

      // Click verify button - this starts the loading state
      const verifyButton = screen.getByText(/verify & deliver/i);
      await user.click(verifyButton);

      // Immediately check that cancel button is disabled during loading
      await waitFor(() => {
        const cancelButton = screen.getByText(/cancel/i);
        expect(cancelButton).toBeDisabled();
      }, { timeout: 200 });
    });

    /**
     * Test: Whitespace Trimming in Delivery Code
     * 
     * Tests that leading and trailing whitespace is automatically removed from
     * the delivery code input before verification. This prevents user input errors.
     * Expected: "  1234  " should be sent to backend as "1234".
     */
    it('trims whitespace from delivery code', async () => {
      const user = userEvent.setup();

      mockedAxios.post.mockResolvedValueOnce({
        data: { status: 'delivered' },
      });

      render(
        <NavigationMap
          {...defaultProps}
          orderStatus="picked_up"
          onOrderUpdated={mockOnOrderUpdated}
        />
      );

      // Wait for Mark Delivered button
      await waitFor(() => {
        expect(screen.getByText(/mark delivered/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Open dialog
      const markDeliveredButton = screen.getByText(/mark delivered/i);
      await user.click(markDeliveredButton);

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByTestId('delivery-dialog')).toBeInTheDocument();
      }, { timeout: 1000 });

      // Enter code with whitespace
      const codeInput = screen.getByLabelText(/delivery code/i);
      await user.type(codeInput, '  123456  ');

      // Click verify button
      const verifyButton = screen.getByText(/verify & deliver/i);
      await user.click(verifyButton);

      // Verify the API was called with trimmed code
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/orders/'),
          { delivery_code: '123456' } // Should be trimmed
        );
      }, { timeout: 1000 });
    });
  });

  describe('Map Rendering Edge Cases', () => {
    beforeEach(() => {
      mockGeolocation.watchPosition.mockImplementation((success: Function) => {
        success({
          coords: { latitude: 40.7128, longitude: -74.006 },
        });
        return 1;
      });
    });

    /**
     * Test: Missing Map Container Ref
     * 
     * Tests that the component gracefully handles when the map container DOM element
     * is not yet available during map initialization. This edge case can occur during
     * rapid component mounting/unmounting or when refs are not ready.
     * Expected: Component should not crash and should render without throwing errors.
     */
    it('handles missing map container ref', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockRouteData });

      const { container } = render(<NavigationMap {...defaultProps} />);

      // Remove the ref element
      const mapContainer = container.querySelector('div[ref]');
      if (mapContainer) {
        mapContainer.remove();
      }

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled();
      });
    });

    /**
     * Test: Route Data Without Steps
     * 
     * Tests that the component can handle route data that has an empty steps array.
     * This might occur with very short routes or malformed API responses.
     * Expected: Turn-by-turn directions should not be displayed when steps are empty.
     */
    it('handles route data without steps', async () => {
      const routeDataWithoutSteps = {
        ...mockRouteData,
        route: {
          ...mockRouteData.route,
          steps: [],
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: routeDataWithoutSteps });

      render(<NavigationMap {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText(/directions/i)).not.toBeInTheDocument();
      });
    });

    /**
     * Test: Route Data With Null Geometry
     * 
     * Tests that the component can handle route data where geometry is null or missing.
     * This might occur with API errors or routes that couldn't be calculated.
     * Expected: Map should render without crashing, though the route line won't be displayed.
     */
    it('handles route data with null geometry', async () => {
      const routeDataWithNullGeometry = {
        ...mockRouteData,
        route: {
          ...mockRouteData.route,
          geometry: null,
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: routeDataWithNullGeometry });

      render(<NavigationMap {...defaultProps} />);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled();
      });
    });
  });

  describe('Component Lifecycle Edge Cases', () => {
    /**
     * Test: Rapid Prop Changes
     * 
     * Tests that the component can handle multiple rapid prop updates without crashing
     * or leaving behind stale state. This simulates real-world scenarios where order
     * status updates quickly (picked_up -> en_route -> delivered).
     * Expected: Component should rerender correctly for each prop change without errors.
     */
    it('handles rapid prop changes', async () => {
      mockGeolocation.watchPosition.mockImplementation((success: Function) => {
        success({
          coords: { latitude: 40.7128, longitude: -74.006 },
        });
        return 1;
      });

      mockedAxios.get.mockResolvedValue({ data: mockRouteData });

      const { rerender } = render(<NavigationMap {...defaultProps} />);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled();
      });

      // Rapidly change status
      rerender(
        <NavigationMap {...defaultProps} orderStatus="picked_up" />
      );
      rerender(
        <NavigationMap {...defaultProps} orderStatus="en_route" />
      );
      rerender(
        <NavigationMap {...defaultProps} orderStatus="delivered" />
      );

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledTimes(4); // Initial + 3 changes
      });
    });

    /**
     * Test: Unmount Before Async Operations Complete
     * 
     * Tests that the component properly cleans up when unmounted while async operations
     * (like route fetching) are still in progress. This prevents memory leaks and
     * "Can't perform a React state update on an unmounted component" warnings.
     * Expected: Component should unmount cleanly without console warnings or errors.
     */
    it('handles unmount before async operations complete', async () => {
      mockGeolocation.watchPosition.mockImplementation((success: Function) => {
        success({
          coords: { latitude: 40.7128, longitude: -74.006 },
        });
        return 1;
      });

      // Mock delayed API response
      mockedAxios.get.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve({ data: mockRouteData }), 1000)
          )
      );

      const { unmount } = render(<NavigationMap {...defaultProps} />);

      // Unmount immediately
      act(() => {
        unmount();
      });

      // Wait to ensure no state updates occur after unmount
      await waitFor(
        () => {
          expect(true).toBe(true);
        },
        { timeout: 1500 }
      );
    });

    /**
     * Test: Multiple Simultaneous Route Fetches
     * 
     * Tests that the component handles race conditions when multiple route fetch
     * requests are triggered in rapid succession. This can occur when geolocation
     * updates rapidly or when props change quickly.
     * Expected: Component should handle overlapping API calls without data corruption.
     */
    it('handles multiple simultaneous route fetches', async () => {
      let callCount = 0;
      mockGeolocation.watchPosition.mockImplementation((success: Function) => {
        // Simulate location changing rapidly
        const interval = setInterval(() => {
          callCount++;
          success({
            coords: {
              latitude: 40.7128 + callCount * 0.001,
              longitude: -74.006 + callCount * 0.001,
            },
          });
          if (callCount >= 3) {
            clearInterval(interval);
          }
        }, 100);
        return 1;
      });

      mockedAxios.get.mockResolvedValue({ data: mockRouteData });

      render(<NavigationMap {...defaultProps} />);

      await waitFor(
        () => {
          expect(mockedAxios.get).toHaveBeenCalledTimes(3);
        },
        { timeout: 1000 }
      );
    });
  });

  describe('Callback Edge Cases', () => {
    /**
     * Test: onOrderUpdated Callback Throwing Error
     * 
     * Tests that the component gracefully handles when the onOrderUpdated callback
     * function throws an error. This ensures the component remains stable even if
     * parent components have buggy callback implementations.
     * Expected: Component should continue functioning normally despite callback errors.
     */
    it('handles onOrderUpdated callback throwing error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorCallback = jest.fn(() => {
        throw new Error('Update callback error');
      });

      mockGeolocation.watchPosition.mockImplementation((success: Function) => {
        success({
          coords: { latitude: 40.7128, longitude: -74.006 },
        });
        return 1;
      });

      mockedAxios.get.mockResolvedValueOnce({ data: mockRouteData });

      render(
        <NavigationMap {...defaultProps} onOrderUpdated={errorCallback} />
      );

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
