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

// Import the Delivery page component after the mapbox mock is registered
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

  it('renders all ready orders as cards (View Order Details buttons)', () => {
    render(<DeliveryPage />);
    const viewButtons = screen.getAllByRole('button', { name: /View Order Details/i });
    // There are 4 orders in the hard-coded ReadyOrders array
    expect(viewButtons.length).toBe(4);
  });

  it('initializes the map and creates markers/popups', () => {
    const mapbox = require('mapbox-gl');

    render(<DeliveryPage />);

    // Map constructor should be called once
    expect(mapbox.Map).toHaveBeenCalled();

    // The Map constructor received a container DOM element
    const firstCallArgs = mapbox.Map.mock.calls[0][0];
    expect(firstCallArgs).toBeDefined();
    expect(firstCallArgs.container).toBeInstanceOf(HTMLElement);

    // There should be 1 source marker + 4 destination markers = 5 Marker constructions
    expect(mapbox.Marker).toHaveBeenCalledTimes(5);

    // Popups should have been created and setText called for Source and Destinations
    expect(mapbox.Popup).toHaveBeenCalledTimes(5);
    // First popup should be for "Source"
    const popupInstances = mapbox.Popup.mock.instances;
    expect(popupInstances[0].setText).toHaveBeenCalledWith('Source');
    // Subsequent popups should include "Destination 1" .. "Destination 4"
    expect(popupInstances[1].setText).toHaveBeenCalledWith('Destination 1');
    expect(popupInstances[2].setText).toHaveBeenCalledWith('Destination 2');
    expect(popupInstances[3].setText).toHaveBeenCalledWith('Destination 3');
    expect(popupInstances[4].setText).toHaveBeenCalledWith('Destination 4');
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
});
