'use client';

import * as React from 'react';
import axios from 'axios';
import Navbar from '../../../_components/navbar';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Avatar,
  Divider,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
} from '@mui/material';

import {
  AttachMoney,
  AccessTime,
  DeliveryDining as DeliveryDiningIcon,
  Navigation as NavigationIcon,
} from '@mui/icons-material';
import mapboxgl from 'mapbox-gl';
// Creating a supabase client to access user id and assign orders
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || '';
const backend_url =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const supabase = createClient();

interface Order {
  order_id: string;
  user_id: string;
  restaurant_id: number;
  delivery_fee: number;
  tip_amount: number;
  estimated_pickup_time: string | null;
  estimated_delivery_time: string | null;
  latitude: number;
  longitude: number;

  restaurants: {
    name: string;
    latitude: number;
    longitude: number;
    address: string;
  };

  distance_to_restaurant: number;
  duration_to_restaurant: number;
  distance_to_restaurant_miles: number;
  restaurant_reachable_by_road: boolean;
  duration_to_restaurant_minutes: number;
}

interface ActiveOrder {
  order_id: string;
  status: string;
  restaurants: {
    name: string;
    address: string;
  };
  customer: {
    name: string;
    address: string;
  };
  distance_to_restaurant_miles: number;
  duration_to_restaurant_minutes: number;
  delivery_fee: number;
  estimated_delivery_time: string | null;
}

export default function DeliveryPage() {
  const mapContainer = React.useRef<HTMLDivElement>(null);
  const map = React.useRef<mapboxgl.Map | null>(null);

  const [readyOrders, setReadyOrders] = React.useState<Order[]>([]);
  const [acceptingOrder, setAcceptingOrder] = React.useState<string | null>(
    null
  );
  const [activeOrder, setActiveOrder] = React.useState<ActiveOrder | null>(
    null
  );
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [authLoading, setAuthLoading] = React.useState<boolean>(true);

  // Example coordinates (lng, lat)
  const [sourceLocation, setSourceLocation] = React.useState<{
    latitude: number;
    longitude: number;
  } | null>(null); // e.g. Rider or Hub

  // // Locations of restaurants derived from readyOrders (for map rendering)
  // const [restaurantLocations, setRestaurantLocations] = React.useState<
  //   { latitude: number; longitude: number }[]
  // >([]);

  const getCurrentUser = async () => {
    try {
      setAuthLoading(true);

      // Get current authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        alert('Please log in to access the delivery page.');
        return;
      }

      // Get user details from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (userError || !userData) {
        alert('Error loading user profile.');
        return;
      }

      setCurrentUser(userData);

      // Check if driver has any active orders
      const { data: activeOrders, error: activeOrderError } = await supabase
        .from('orders')
        .select('*, restaurants(name, latitude, longitude, address)')
        .eq('delivery_user_id', user.id)
        .in('status', ['assigned', 'picked_up', 'en_route'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (!activeOrderError && activeOrders && activeOrders.length > 0) {
        // Driver has an active order, set it
        const active = activeOrders[0];
        setActiveOrder({
          order_id: active.order_id,
          status: active.status,
          restaurants: {
            name: active.restaurants?.name || '',
            address: active.restaurants?.address || '',
          },
          customer: {
            name: '',
            address: '',
          },
          distance_to_restaurant_miles: 0,
          duration_to_restaurant_minutes: 0,
          delivery_fee: active.delivery_fee,
          estimated_delivery_time: active.estimated_delivery_time,
        });
      }
    } catch {
      alert('Authentication error. Please try logging in again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchUserLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setSourceLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          // Need to fetch user's last known location or a default location - something to do for later
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    }
  };

  const fetchReadyOrders = async (
    lat: number | undefined,
    long: number | undefined
  ) => {
    if (lat === undefined || long === undefined) {
      // Call function to fetch default location based orders
      return;
    }
    try {
      // API call to fetch ready orders from backend based on user's location
      axios
        .get(
          `${backend_url}/deliveries/ready?latitude=${lat}&longitude=${long}`
        )
        .then(response => {
          setReadyOrders(response.data);
        })
        .catch(() => {
          // Error fetching ready orders
        });
    } catch {
      // Error fetching ready orders
    }
  };

  const handleAcceptOrder = async (order: Order) => {
    // Check if user is authenticated
    if (!currentUser) {
      alert('Please log in to accept orders.');
      return;
    }

    // Check if already have an active order
    if (activeOrder) {
      alert(
        'You already have an active delivery. Complete your current delivery before accepting a new order.'
      );
      return;
    }

    const delivery_user_id = currentUser.user_id;

    try {
      setAcceptingOrder(order.order_id);

      // Call the API to assign the order to this delivery user
      const response = await axios.patch(
        `${backend_url}/orders/${order.order_id}/assign-delivery`,
        null,
        {
          params: {
            delivery_user_id: delivery_user_id,
          },
        }
      );

      if (response.status === 200) {
        // Order accepted successfully

        // Set as active order (convert Order -> ActiveOrder shape)
        setActiveOrder({
          order_id: order.order_id,
          status: 'assigned',
          restaurants: {
            name: order.restaurants.name,
            address: order.restaurants.address,
          },
          customer: {
            name: '',
            address: '',
          },
          distance_to_restaurant_miles: order.distance_to_restaurant_miles,
          duration_to_restaurant_minutes: order.duration_to_restaurant_minutes,
          delivery_fee: order.delivery_fee,
          estimated_delivery_time: order.estimated_delivery_time,
        });

        // Remove from ready orders list
        setReadyOrders(prev => prev.filter(o => o.order_id !== order.order_id));

        // TODO: Navigate to active order view or update UI
        alert(`Order accepted! Restaurant: ${order.restaurants.name}`);
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        'Failed to accept order. Please try again.';
      alert(errorMessage);
    } finally {
      setAcceptingOrder(null);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleMarkPickedUp = async () => {
    if (!activeOrder) return;

    try {
      await axios.patch(
        `${backend_url}/orders/${activeOrder.order_id}/status?new_status=picked_up`
      );
      setActiveOrder(prev => (prev ? { ...prev, status: 'picked_up' } : null));
      alert('Order marked as picked up!');
    } catch {
      alert('Failed to update order status. Please try again.');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleMarkDelivered = async () => {
    if (!activeOrder) return;

    try {
      await axios.patch(
        `${backend_url}/orders/${activeOrder.order_id}/status?new_status=delivered`
      );
      alert('Order delivered successfully!');
      setActiveOrder(null);
      // Refresh the available orders
      if (sourceLocation) {
        await fetchReadyOrders(
          sourceLocation.latitude,
          sourceLocation.longitude
        );
      }
    } catch {
      alert('Failed to update order status. Please try again.');
    }
  };

  const renderMap = (
    source: [number, number],
    destinations: [number, number][]
  ) => {
    if (!mapContainer.current) {
      return;
    }

    try {
      // Remove existing map if it exists to prevent multiple instances
      if (map.current) {
        map.current.remove();
      }

      // Initialize the map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: source,
        zoom: 12,
      });

      // Add zoom and rotation controls
      map.current.addControl(new mapboxgl.NavigationControl());

      // Add source marker
      new mapboxgl.Marker({ color: 'blue' })
        .setLngLat(source)
        .setPopup(new mapboxgl.Popup().setText('Source'))
        .addTo(map.current);

      // Add destination markers
      destinations.forEach((dest, i) => {
        new mapboxgl.Marker({ color: 'red' })
          .setLngLat(dest)
          .setPopup(new mapboxgl.Popup().setText(`Destination ${i + 1}`))
          .addTo(map.current!);
      });

      // Fit map to show all markers
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend(source);
      destinations.forEach(d => bounds.extend(d));
      map.current.fitBounds(bounds, { padding: 50 });
    } catch {
      // Error in renderMap
    }
  };

  React.useEffect(() => {
    // Get authenticated user first
    getCurrentUser();

    // Fetch current location of user and once location is fetched, get the ready orders with distance info accordingly.
    if (sourceLocation == null || sourceLocation == undefined)
      fetchUserLocation();

    // Cleanup function to remove map on component unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    // Once source location is available, fetch ready orders
    if (sourceLocation != null && sourceLocation != undefined) {
      fetchReadyOrders(sourceLocation.latitude, sourceLocation.longitude);
    }
  }, [sourceLocation]);

  React.useEffect(() => {
    // Wait for both the container and location to be available
    // Use a small delay to ensure the DOM is fully rendered
    const initializeMap = () => {
      if (!mapContainer.current || !sourceLocation) {
        return;
      }

      // Proceed with map initialization (tests provide a mocked Mapbox
      // implementation and tests set NEXT_PUBLIC_MAPBOX_API_KEY); do not
      // early-return here so unit tests can exercise the map logic.

      try {
        // Remove any existing map instance
        if (map.current) {
          map.current.remove();
          map.current = null;
        }

        // If there are ready orders, show them as destinations
        if (readyOrders.length > 0) {
          const destinations: [number, number][] = readyOrders.map(order => [
            order.restaurants.longitude,
            order.restaurants.latitude,
          ]);
          // setRestaurantLocations(
          //   destinations.map(coord => ({
          //     latitude: coord[1],
          //     longitude: coord[0],
          //   }))
          // );
          renderMap(
            [sourceLocation.longitude, sourceLocation.latitude],
            destinations
          );
        } else {
          // No orders: show only the user's location
          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [sourceLocation.longitude, sourceLocation.latitude],
            zoom: 12,
          });

          map.current.addControl(new mapboxgl.NavigationControl());
          new mapboxgl.Marker({ color: 'blue' })
            .setLngLat([sourceLocation.longitude, sourceLocation.latitude])
            .setPopup(new mapboxgl.Popup().setText('Your Location'))
            .addTo(map.current);
        }
      } catch {
        // Error initializing map
      }
    };

    // Delay map initialization slightly to ensure DOM is ready
    const timeoutId = setTimeout(initializeMap, 100);

    return () => clearTimeout(timeoutId);
  }, [readyOrders, sourceLocation]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getPrimaryAction = (stepIndex: number) => {
    switch (stepIndex) {
      case 0:
        return 'Mark Picked-Up';
      case 1:
        return 'Start Navigation';
      case 2:
        return 'Arrived';
      case 3:
        return 'Mark Delivered';
      default:
        return 'Completed';
    }
  };

  const steps = [
    'Ready',
    'Picked-Up',
    'Out for Delivery',
    'Arrived',
    'Delivered',
  ];

  const ActiveOrderCard = () => {
    if (!activeOrder) {
      return (
        <Card
          sx={{
            borderRadius: 3,
            mb: 2,
            boxShadow: 2,
            width: '80%',
            justifySelf: 'center',
            bgcolor: '#f5f5f5',
          }}
        >
          <CardContent>
            <Typography variant="h6" textAlign="center" color="text.secondary">
              No active delivery
            </Typography>
            <Typography
              variant="body2"
              textAlign="center"
              color="text.secondary"
              mt={1}
            >
              Accept an order below to start delivering
            </Typography>
          </CardContent>
        </Card>
      );
    }

    // Calculate active step based on order status (if it exists)
    const getActiveStep = () => {
      if (activeOrder.status === 'delivered') return 3;
      if (
        activeOrder.status === 'en_route' ||
        activeOrder.status === 'picked_up'
      )
        return 2;
      if (activeOrder.status === 'ready' || activeOrder.status === 'assigned')
        return 1;
      return 0;
    };

    return (
      <Box sx={{ width: '100%', mb: 4 }}>
        <Card
          sx={{
            borderRadius: 3,
            mb: 2,
            boxShadow: 4,
            width: '80%',
            justifySelf: 'center',
          }}
        >
          <CardContent>
            {/* Header */}
            <Box display="flex" justifyContent="space-between">
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  {activeOrder.restaurants.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Order #{activeOrder.order_id.substring(0, 8)}...
                </Typography>
                <Box display="flex" alignItems="center" gap={2} mt={1}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <NavigationIcon fontSize="small" />
                    <Typography variant="body2">
                      {activeOrder.distance_to_restaurant_miles} Miles
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" gap={0.5}>
                    <AccessTime fontSize="small" />
                    <Typography variant="body2">
                      {activeOrder.duration_to_restaurant_minutes} mins
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" gap={0.5}>
                    <AttachMoney fontSize="small" />
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color="success.main"
                    >
                      {activeOrder.delivery_fee}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Chip
                label={activeOrder.status.toUpperCase()}
                color="primary"
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>

            {/* Stepper */}
            <Stepper
              activeStep={getActiveStep()}
              alternativeLabel
              sx={{ mt: 2 }}
            >
              {steps.map(label => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Linear Progress */}
            <LinearProgress
              variant="determinate"
              value={getActiveStep() * 33.33}
              sx={{ borderRadius: 5, mt: 2, height: 8 }}
            />
          </CardContent>

          {/* Button Area */}
          <CardActions
            style={{ display: 'flex', flexDirection: 'column' }}
            sx={{ px: 2, pb: 1 }}
          >
            <Button
              component={Link}
              href="/user/delivery/navigation"
              variant="contained"
              fullWidth
            >
              Open Navigation
            </Button>
          </CardActions>
        </Card>
      </Box>
    );
  };

  const OrderCard = ({ readyOrders }: { readyOrders: Order }) => (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
        border: '1px solid #e0e0e0',
        borderRadius: 2,
      }}
    >
      {/* Header */}
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              mr: 2,
              backgroundColor: '#e3f2fd',
              color: 'primary.main',
              fontSize: '1.5rem',
            }}
          >
            {readyOrders.restaurants.name.charAt(0).toUpperCase()}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" fontWeight="bold" noWrap>
              {readyOrders.restaurants.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {readyOrders.restaurants.address}
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ my: 1.5 }} />
        {/* Route 1 */}
        <Box sx={{ mb: 1 }}>
          <Typography
            fontWeight="bold"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            🧭 You → Restaurant
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {readyOrders.distance_to_restaurant_miles} miles |{' '}
            {readyOrders.duration_to_restaurant_minutes} min
          </Typography>
        </Box>
        {/* Route 2 */}
        <Box sx={{ mb: 1 }}>
          <Typography
            fontWeight="bold"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            🧭 Restaurant → Customer
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {/* {readyOrders.DeliveryToRestaurant} miles | {readyOrders.timeToCustomer} min */}
            3.5 miles | 15 min {/* Placeholder values */}
          </Typography>
        </Box>
        <Divider sx={{ my: 1.5 }} />
        {/* Totals */}
        <Box sx={{ mb: 1 }}>
          <Typography fontWeight="bold" sx={{ color: 'success.main' }}>
            {/* Total: {readyOrders.totalDistance} miles | {readyOrders.totalTime} min */}
            Total: 7.2 miles | 30 min {/* Placeholder values */}
          </Typography>
        </Box>
        <Divider sx={{ my: 1.5 }} />
        {/* Delivery Target */}
        <Box sx={{ mb: 1 }}>
          <Typography
            fontWeight="bold"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            {/* 📦 Deliver To: {readyOrders.customer.name} */}
            📦 Deliver To: John Doe {/* Placeholder name */}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {/* {readyOrders.customer.address} */}
            456 Elm St, Raleigh, NC {/* Placeholder address */}
          </Typography>
        </Box>
        <Divider sx={{ my: 1.5 }} />
        Compensation & Expected Time
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" fontWeight="600">
            💰 ${readyOrders.delivery_fee}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ⏱ ETA:{' '}
            {readyOrders.estimated_delivery_time == undefined
              ? '--'
              : readyOrders.estimated_delivery_time.substring(11, 16)}
          </Typography>
        </Box>
      </CardContent>

      {/* Primary Action */}
      <CardActions sx={{ mt: 'auto', px: 2, pb: 2 }}>
        <Button
          variant="contained"
          fullWidth
          startIcon={<DeliveryDiningIcon />}
          onClick={() => handleAcceptOrder(readyOrders)}
          disabled={acceptingOrder === readyOrders.order_id}
        >
          {acceptingOrder === readyOrders.order_id
            ? 'Accepting...'
            : 'Accept & Deliver'}
        </Button>
      </CardActions>
    </Card>
  );

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <>
        <Navbar />
        <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="h6">Loading...</Typography>
        </Container>
      </>
    );
  }

  // Show message if user is not authenticated
  if (!currentUser) {
    return (
      <>
        <Navbar />
        <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error">
            Please log in to access the delivery dashboard
          </Typography>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <h3 style={{ justifySelf: 'center', marginBottom: '20px' }}>
          Current Active Order
        </h3>
        <ActiveOrderCard />

        <Divider sx={{ bgcolor: 'gray' }} />
        <Divider sx={{ bgcolor: 'gray' }} />
        <Divider sx={{ bgcolor: 'gray' }} />
        {/* <Divider/> */}
        {/* <hr /> */}

        <h3 style={{ justifySelf: 'center', marginTop: '30px' }}>
          Browse nearby Orders
        </h3>
        <div
          className="map"
          ref={mapContainer}
          style={{
            margin: '20px',
            justifySelf: 'center',
            width: '70%',
            height: '80vh',
            borderRadius: '12px',
            border: '1px solid #ccc',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        />

        {readyOrders.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 2, mb: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No orders are available nearby.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 3,
            }}
          >
            {readyOrders.map((order, index) => (
              <OrderCard key={index} readyOrders={order} />
            ))}
          </Box>
        )}
      </Container>
    </>
  );
}
