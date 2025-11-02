"use client"

import * as React from 'react';
import mapboxgl from 'mapbox-gl';
import axios from 'axios';
import { Box, Card, CardContent, Typography, Button, LinearProgress, List, ListItem, ListItemText } from '@mui/material';
import { Navigation as NavigationIcon, Restaurant, Home } from '@mui/icons-material';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || "";
const backend_url = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface NavigationMapProps {
    orderId: string;
    orderStatus: string;
    onMarkPickedUp: () => void;
    onMarkDelivered: () => void;
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

export default function NavigationMap({ orderId, orderStatus, onMarkPickedUp, onMarkDelivered }: NavigationMapProps) {
    const mapContainer = React.useRef<HTMLDivElement>(null);
    const map = React.useRef<mapboxgl.Map | null>(null);
    
    const [routeData, setRouteData] = React.useState<RouteData | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [driverLocation, setDriverLocation] = React.useState<{ latitude: number; longitude: number } | null>(null);
    const [locationWatchId, setLocationWatchId] = React.useState<number | null>(null);

    // Watch driver's location
    const startLocationTracking = () => {
        console.log('startLocationTracking called');
        if ("geolocation" in navigator) {
            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    console.log('geolocation callback position', { lat: position.coords.latitude, lon: position.coords.longitude });
                    setDriverLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    console.error("Error tracking location:", error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
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
                `${backend_url}/api/deliveries/active/${orderId}/navigation`,
                {
                    params: {
                        driver_latitude: driverLocation.latitude,
                        driver_longitude: driverLocation.longitude
                    }
                }
            );
            console.log('fetchRoute: response received', { status: response.status, keys: Object.keys(response.data || {}) });
            setRouteData(response.data);
        } catch (error) {
            console.error("Error fetching route:", error);
        } finally {
            setLoading(false);
        }
    };

    // Render map with route
    const renderNavigationMap = () => {
        console.log('renderNavigationMap called', { hasContainer: !!mapContainer.current, hasRouteData: !!routeData });
        if (!mapContainer.current || !routeData) {
            console.log('renderNavigationMap skipped: missing container or routeData');
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
            zoom: 13
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
                    geometry: route.geometry
                }
            });

            console.log('renderNavigationMap: added route source');

            map.current.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#3b82f6',
                    'line-width': 6,
                    'line-opacity': 0.8
                }
            });

            // Add origin marker (driver)
            new mapboxgl.Marker({ color: '#3b82f6' })
                .setLngLat([origin.longitude, origin.latitude])
                .setPopup(new mapboxgl.Popup().setText('Your Location'))
                .addTo(map.current);

            // Add destination marker
            const destinationColor = routeData.route_type === 'to_restaurant' ? '#ef4444' : '#10b981';
            new mapboxgl.Marker({ color: destinationColor })
                .setLngLat([destination.longitude, destination.latitude])
                .setPopup(new mapboxgl.Popup().setText(destination.name))
                .addTo(map.current);

            // Fit bounds to show entire route
            const bounds = new mapboxgl.LngLatBounds();
            bounds.extend([origin.longitude, origin.latitude]);
            bounds.extend([destination.longitude, destination.latitude]);
            map.current.fitBounds(bounds, { padding: 80 });
            console.log('renderNavigationMap: fitBounds called');
        });
    };

    // Initialize
    React.useEffect(() => {
        console.log('NavigationMap useEffect:init');
        startLocationTracking();

        // No realtime subscription here — keep diagnostics and cleanup only
        console.log('NavigationMap useEffect:init (logs-only)');
        startLocationTracking();

        return () => {
            console.log('NavigationMap cleanup: clearing watch and removing map');
            if (locationWatchId) {
                navigator.geolocation.clearWatch(locationWatchId);
            }
            if (map.current) {
                map.current.remove();
            }
        };
    }, []);

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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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
                        <Button 
                            variant="contained" 
                            fullWidth 
                            color="success"
                            onClick={onMarkDelivered}
                        >
                            Mark Delivered
                        </Button>
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
                    boxShadow: 3
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
