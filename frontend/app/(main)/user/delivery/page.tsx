"use client"

import * as React from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Navbar from "../../../_components/navbar";
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    CardActions,
    Button,
    Chip,
    Rating,
    Skeleton,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    Avatar,
    Divider
} from '@mui/material';
import {
    LocationOn as LocationIcon,
    Business as BusinessIcon,
    AttachMoney,
    AccessTime,
    Restaurant as RestaurantIcon,
    DeliveryDining as DeliveryDiningIcon,
} from '@mui/icons-material';
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
const backend_url = process.env.NEXT_PUBLIC_BACKEND_API_URL;

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

export default function DeliveryPage() {

    const mapContainer = React.useRef<HTMLDivElement>(null);
    const map = React.useRef<mapboxgl.Map | null>(null);

    const [readyOrders, setReadyOrders] = React.useState<Order[]>([]);
    // const [location, setLocation] = React.useState<{ latitude: number; longitude: number } | null>(null);
    const [loading, setLoading] = React.useState(false);

    // Example coordinates (lng, lat)
    const [sourceLocation, setSourceLocation] = React.useState<{ latitude : number, longitude : number } | null>(null) // e.g. Rider or Hub
    const [restaurantLocations , setRestaurantLocations] = React.useState<{ latitude : number, longitude : number }[]>([]); // e.g. Restaurants for ready orders

    const fetchUserLocation = () => {
        console.log("Fetching user location...");
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log(position.coords);
                    setSourceLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                                        
                },
                (error) => {
                    console.error("Error getting location:", error);
                    // Need to fetch user's last known location or a default location - something to do for later
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0,
                }
            );
        } else {
            console.log("Geolocation not supported by this browser.");
        }
    }

    const fetchReadyOrders = async (lat: number | undefined, long: number | undefined) => {
        console.log("User location:", sourceLocation?.latitude, sourceLocation?.longitude);
        if (lat === undefined || long === undefined) {
            // Call function to fetch default location based orders
            console.error("Latitude or Longitude is undefined");
            return;
        }
        try {
            setLoading(true);

            // API call to fetch ready orders from backend based on user's location
            axios.get(backend_url + `deliveries/ready?latitude=${lat}&longitude=${long}`)
                .then(response => {
                    setReadyOrders(response.data);
                    // console.log("Fetched ready orders:", response.data);
                })
                .catch(error => {
                    console.error(error);
                });
            setLoading(false);
        }
        catch (error) {
            console.error("Error fetching ready orders:", error);
        }
    }

    const renderMap = (source: [number, number], destinations: [number, number][]) => {


        if (!mapContainer.current) return;

        // Initialize the map
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: source,
            zoom: 12,
        });

        // Add zoom and rotation controls
        map.current.addControl(new mapboxgl.NavigationControl());

        // Add source marker
        new mapboxgl.Marker({ color: "blue" })
            .setLngLat(source)
            .setPopup(new mapboxgl.Popup().setText("Source"))
            .addTo(map.current);

        // Add destination markers
        destinations.forEach((dest, i) => {
            new mapboxgl.Marker({ color: "red" })
                .setLngLat(dest)
                .setPopup(new mapboxgl.Popup().setText(`Destination ${i + 1}`))
                .addTo(map.current!);
        });

        // Fit map to show all markers
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend(source);
        destinations.forEach((d) => bounds.extend(d));
        map.current.fitBounds(bounds, { padding: 50 });

        return () => map.current?.remove();
    }

    React.useEffect(() => {
        // Fetch current location of user and once location is fetched, get the ready orders with distance info accordingly.
        if (sourceLocation == null || sourceLocation == undefined) fetchUserLocation();
        
        // fetchUserLocation();
        // Once ready orders are fetched, render the map
        // renderMap(source, destinations);
    }, []);

    React.useEffect(() => {
        // Once source location is available, fetch ready orders
        if (sourceLocation != null && sourceLocation != undefined) {
            fetchReadyOrders(sourceLocation.latitude, sourceLocation.longitude);
        }
    }, [sourceLocation]);

    React.useEffect(() => {
        // Once ready orders are fetched, update restaurant locations and render map
        if (readyOrders.length > 0 && sourceLocation != null) {
            const destinations: [number, number][] = readyOrders.map(order => [order.restaurants.longitude, order.restaurants.latitude]);
            setRestaurantLocations(destinations.map(coord => ({ latitude: coord[1], longitude: coord[0] })));
            renderMap([sourceLocation.longitude, sourceLocation.latitude], destinations);
        }
    }, [readyOrders]);

    const OrderCard = ({ readyOrders }: { readyOrders: Order }) => (
        <Card
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                },
                border: '1px solid #e0e0e0',
                borderRadius: 2
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
                            fontSize: '1.5rem'
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
                    <Typography fontWeight="bold" sx={{ display: 'flex', alignItems: "center" }}>
                        🧭 You → Restaurant
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {readyOrders.distance_to_restaurant_miles} miles | {readyOrders.duration_to_restaurant_minutes} min
                    </Typography>
                </Box>

                {/* Route 2 */}
                <Box sx={{ mb: 1 }}>
                    <Typography fontWeight="bold" sx={{ display: 'flex', alignItems: "center" }}>
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
                    <Typography
                        fontWeight="bold"
                        sx={{ color: 'success.main' }}
                    >
                        {/* Total: {readyOrders.totalDistance} miles | {readyOrders.totalTime} min */}
                        Total: 7.2 miles | 30 min {/* Placeholder values */}
                    </Typography>
                </Box>

                <Divider sx={{ my: 1.5 }} />

                {/* Delivery Target */}
                <Box sx={{ mb: 1 }}>
                    <Typography fontWeight="bold" sx={{ display: 'flex', alignItems: "center" }}>
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
                        ⏱ ETA: {readyOrders.estimated_delivery_time==undefined ? '--':readyOrders.estimated_delivery_time.substring(11, 16)}
                    </Typography>
                </Box>
            </CardContent>

            {/* Primary Action */}
            <CardActions sx={{ mt: 'auto', px: 2, pb: 2 }}>
                <Button
                    variant="contained"
                    fullWidth
                    startIcon={<DeliveryDiningIcon />}
                    onClick={() => {}}
                >
                    Deliver
                </Button>
            </CardActions>
        </Card>
    );




    return (
        <>
            <Navbar />
            <h3 style={{ justifySelf: "center", margin: "10px" }}>Browse nearby Orders</h3>
            <div
                className="map"
                ref={mapContainer}
                style={{
                    margin: "20px",
                    justifySelf: "center",
                    width: "70%",
                    height: "80vh",
                    borderRadius: "12px",
                    border: "1px solid #ccc",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                }}
            />
            <Container maxWidth="lg" sx={{ py: 4 }}>

                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)',
                        md: 'repeat(3, 1fr)'
                    },
                    gap: 3
                }}>
                    {
                        readyOrders
                            .map((order, index) => (
                                <OrderCard key={index} readyOrders={order} />
                            ))
                    }
                </Box>
            </Container>
        </>
    )
}