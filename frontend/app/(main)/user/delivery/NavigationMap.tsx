'use client';

import * as React from 'react';
import mapboxgl from 'mapbox-gl';
import axios from 'axios';
import { createClient as createSupabaseClient } from '@/utils/supabase/client';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import {
  Navigation as NavigationIcon,
  Restaurant,
  Home,
} from '@mui/icons-material';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || '';
const backend_url =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface NavigationMapProps {
  orderId: string;
  orderStatus: string;
  onMarkPickedUp: () => void;
  onMarkDelivered: () => void;
  onOrderUpdated?: (updatedOrder: any) => void;
}

interface RouteData {
  order_id: string;
  order_status: string;
  route_type: 'to_restaurant' | 'to_customer';
  origin: { latitude: number; longitude: number };
  destination: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  route: {
    distance_meters: number;
    distance_miles: number;
    duration_seconds: number;
    duration_minutes: number;
    geometry: any;
    steps: any[];
  };
}

export default function NavigationMap({
  orderId,
  orderStatus,
  onMarkPickedUp,
  onMarkDelivered,
  onOrderUpdated,
}: NavigationMapProps) {
  const mapContainer = React.useRef<HTMLDivElement>(null);
  const map = React.useRef<mapboxgl.Map | null>(null);

  const [routeData, setRouteData] = React.useState<RouteData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [driverLocation, setDriverLocation] = React.useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationWatchId, setLocationWatchId] = React.useState<number | null>(
    null
  );
  const [verifyOpen, setVerifyOpen] = React.useState(false);
  const [deliveryCode, setDeliveryCode] = React.useState('');
  const [verifyError, setVerifyError] = React.useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = React.useState(false);

  // Watch driver's location
  const startLocationTracking = () => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        position => {
          setDriverLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          // Error tracking location
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
      setLocationWatchId(watchId);
    }
  };

  // Fetch navigation route
  const fetchRoute = async () => {
    if (!driverLocation) return;

    try {
      setLoading(true);
      const response = await axios.get(
        `${backend_url}/deliveries/active/${orderId}/navigation`,
        {
          params: {
            driver_latitude: driverLocation.latitude,
            driver_longitude: driverLocation.longitude,
          },
        }
      );
      setRouteData(response.data);
    } catch {
      // Error fetching route
    } finally {
      setLoading(false);
    }
  };

  // Render map with route
  const renderNavigationMap = () => {
    if (!mapContainer.current || !routeData) {
      return;
    }

    // Remove existing map
    if (map.current) {
      map.current.remove();
    }

    const { origin, destination, route } = routeData;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-day-v1',
      center: [origin.longitude, origin.latitude],
      zoom: 13,
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    map.current.on('load', () => {
      if (!map.current) return;

      // Add route line
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: route.geometry,
        },
      });

      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 6,
          'line-opacity': 0.8,
        },
      });

      // Add origin marker (driver)
      new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([origin.longitude, origin.latitude])
        .setPopup(new mapboxgl.Popup().setText('Your Location'))
        .addTo(map.current);

      // Add destination marker
      const destinationColor =
        routeData.route_type === 'to_restaurant' ? '#ef4444' : '#10b981';
      new mapboxgl.Marker({ color: destinationColor })
        .setLngLat([destination.longitude, destination.latitude])
        .setPopup(new mapboxgl.Popup().setText(destination.name))
        .addTo(map.current);

      // Fit bounds to show entire route
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([origin.longitude, origin.latitude]);
      bounds.extend([destination.longitude, destination.latitude]);
      map.current.fitBounds(bounds, { padding: 80 });
    });
  };

  // Initialize
  React.useEffect(() => {
    startLocationTracking();

    return () => {
      if (locationWatchId) {
        navigator.geolocation.clearWatch(locationWatchId);
      }
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Realtime subscription: notify parent on order updates (status changes)
  React.useEffect(() => {
    const supabase = createSupabaseClient();
    let channel: any = null;

    try {
      channel = supabase
        .channel(`orders_order_${orderId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `order_id=eq.${orderId}`,
          },
          (payload: any) => {
            const newOrder = payload?.new || payload?.record || null;
            if (!newOrder) return;

            // If the order status changed, notify parent so it can update canonical state
            if (
              newOrder.order_status &&
              newOrder.order_status !== orderStatus
            ) {
              try {
                if (typeof onOrderUpdated === 'function') {
                  onOrderUpdated(newOrder);
                }
              } catch {
                // Error in onOrderUpdated handler
              }
            }
          }
        )
        .subscribe();
    } catch {
      // Failed to create realtime channel
    }

    return () => {
      try {
        if (channel) {
          supabase.removeChannel(channel);
        }
      } catch {
        // Error removing realtime channel
      }
    };
  }, [orderId, orderStatus, onOrderUpdated]);

  // Fetch route when driver location is available
  React.useEffect(() => {
    if (driverLocation) {
      fetchRoute();
    }
  }, [driverLocation, orderId, orderStatus]);

  // Render map when route data is available
  React.useEffect(() => {
    if (routeData) {
      renderNavigationMap();
    }
  }, [routeData]);

  if (loading || !routeData) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography>Loading navigation...</Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  const { destination, route, route_type } = routeData;

  return (
    <Box>
      {/* Navigation Info Card */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {route_type === 'to_restaurant' ? (
                <Restaurant color="error" />
              ) : (
                <Home color="success" />
              )}
              <Box>
                <Typography variant="h6">{destination.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {destination.address}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h5" fontWeight="bold" color="primary">
                {route.distance_miles} mi
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ~{route.duration_minutes} min
              </Typography>
            </Box>
          </Box>

          {/* Action Button */}
          {route_type === 'to_restaurant' && orderStatus === 'assigned' && (
            <Button
              variant="contained"
              fullWidth
              color="success"
              onClick={onMarkPickedUp}
            >
              Mark Picked-Up
            </Button>
          )}
          {route_type === 'to_customer' && orderStatus === 'picked_up' && (
            <>
              <Button
                variant="contained"
                fullWidth
                color="success"
                onClick={() => setVerifyOpen(true)}
              >
                Mark Delivered
              </Button>

              <Dialog
                open={verifyOpen}
                onClose={() => {
                  if (!verifyLoading) {
                    setVerifyOpen(false);
                    setVerifyError(null);
                  }
                }}
              >
                <DialogTitle>Enter Delivery Code</DialogTitle>
                <DialogContent>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Ask the customer for their delivery PIN and enter it below
                    to confirm delivery.
                  </Typography>
                  {verifyError && (
                    <Alert severity="error" sx={{ mb: 1 }}>
                      {verifyError}
                    </Alert>
                  )}
                  <TextField
                    label="Delivery Code"
                    value={deliveryCode}
                    onChange={e => setDeliveryCode(e.target.value)}
                    fullWidth
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                  />
                </DialogContent>
                <DialogActions>
                  <Button
                    onClick={() => {
                      setVerifyOpen(false);
                      setVerifyError(null);
                    }}
                    disabled={verifyLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={async () => {
                      setVerifyError(null);
                      if (!deliveryCode || deliveryCode.trim().length === 0) {
                        setVerifyError('Please enter the delivery code.');
                        return;
                      }
                      setVerifyLoading(true);
                      try {
                        await axios.post(
                          `${backend_url}/orders/${orderId}/verify-delivery`,
                          { delivery_code: deliveryCode.trim() }
                        );
                        // success: call provided callback
                        try {
                          onMarkDelivered();
                        } catch {
                          /* ignore */
                        }
                        setVerifyOpen(false);
                        setDeliveryCode('');
                      } catch (err: any) {
                        const message =
                          err?.response?.data?.detail ||
                          err?.response?.data ||
                          err?.message ||
                          'Verification failed.';
                        setVerifyError(String(message));
                      } finally {
                        setVerifyLoading(false);
                      }
                    }}
                    disabled={verifyLoading}
                  >
                    Verify & Deliver
                  </Button>
                </DialogActions>
              </Dialog>
            </>
          )}
        </CardContent>
      </Card>

      {/* Map */}
      <Box
        ref={mapContainer}
        sx={{
          width: '100%',
          height: '60vh',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: 3,
        }}
      />

      {/* Turn-by-turn directions */}
      {route.steps && route.steps.length > 0 && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <NavigationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Directions
            </Typography>
            <List dense>
              {route.steps.slice(0, 5).map((step: any, index: number) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={`${index + 1}. ${step.maneuver?.instruction || 'Continue'}`}
                    secondary={`${(step.distance / 1609.34).toFixed(2)} mi`}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
