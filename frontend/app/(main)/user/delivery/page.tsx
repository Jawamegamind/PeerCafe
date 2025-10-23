"use client"

import * as React from 'react';
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
    Restaurant as RestaurantIcon
} from '@mui/icons-material';
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;

interface Order {
    OrderId: number;
    RestaurantId: number;
    RestaurantName: string;
    DistanceFromRestaurant: number;
    DeliveryToRestaurant: number;
    RestaurantAddress: string;
    Address: string;
    Phone: string;
    Email: string;
    IsActive: boolean;
    Compensation: number;
    ExpectedTime: string;
}

export default function DeliveryPage() {

    // Map implementations
    const mapContainer = React.useRef<HTMLDivElement>(null);
    const map = React.useRef<mapboxgl.Map | null>(null);

    // Example coordinates (lng, lat)
    const source: [number, number] = [77.5946, 12.9716]; // e.g. Rider or Hub
    const destinations: [number, number][] = [
        [77.61, 12.98],
        [77.59, 12.96],
        [77.62, 12.965],
        [77.57, 12.985],
    ];

    React.useEffect(() => {
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
    }, []);

    // Sample orders array
    const ReadyOrders: Order[] = [
        {
            OrderId: 101,
            RestaurantId: 1,
            RestaurantName: "Taco Haven",
            RestaurantAddress: "200 Market St, Raleigh, NC", // 🆕
            DistanceFromRestaurant: 2.4,
            DeliveryToRestaurant: 0.8,
            Address: "123 Main St, Raleigh, NC",
            Phone: "+1-919-555-1023",
            Email: "contact@tacohaven.com",
            IsActive: true,
            Compensation: 5.75,
            ExpectedTime: "2025-10-19T18:45:00Z",
        },
        {
            OrderId: 102,
            RestaurantId: 2,
            RestaurantName: "Bella Italia",
            RestaurantAddress: "890 Olive Rd, Cary, NC", // 🆕
            DistanceFromRestaurant: 5.6,
            DeliveryToRestaurant: 1.2,
            Address: "456 Oak Ave, Cary, NC",
            Phone: "+1-919-555-2374",
            Email: "orders@bellaitalia.com",
            IsActive: true,
            Compensation: 7.5,
            ExpectedTime: "2025-10-19T19:00:00Z",
        },
        {
            OrderId: 103,
            RestaurantId: 3,
            RestaurantName: "Sushi World",
            RestaurantAddress: "55 Sakura Blvd, Durham, NC", // 🆕
            DistanceFromRestaurant: 3.1,
            DeliveryToRestaurant: 0.9,
            Address: "789 Elm St, Durham, NC",
            Phone: "+1-919-555-4860",
            Email: "support@sushiworld.com",
            IsActive: false,
            Compensation: 6.25,
            ExpectedTime: "2025-10-19T18:30:00Z",
        },
        {
            OrderId: 104,
            RestaurantId: 4,
            RestaurantName: "The Burger Joint",
            RestaurantAddress: "15 Pine Dr, Apex, NC", // 🆕
            DistanceFromRestaurant: 1.8,
            DeliveryToRestaurant: 0.5,
            Address: "321 Maple Dr, Apex, NC",
            Phone: "+1-919-555-8745",
            Email: "hello@burgerjoint.com",
            IsActive: true,
            Compensation: 4.95,
            ExpectedTime: "2025-10-19T18:15:00Z",
        },
    ];



    // Fetch location of user
    React.useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log("Latitude:", position.coords.latitude);
                    console.log("Longitude:", position.coords.longitude);
                },
                (error) => {
                    console.error("Error getting location:", error);
                }
            );
        } else {
            console.log("Geolocation not supported by this browser.");
        }
    }, []);


    // Order Card Component
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
                border: '1px solid #e0e0e0'
            }}
        >
            {/* Header with Avatar and Basic Info */}
            <CardContent sx={{ pb: 1 }}>

                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Avatar
                        sx={{
                            width: 56,
                            height: 56,
                            mr: 2,
                            backgroundColor: '#f3e5f5',
                            color: 'primary.main',
                            fontSize: '1.5rem'
                        }}
                    >
                        {readyOrders.RestaurantName.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="h6" component="h2" fontWeight="bold" noWrap>
                            {readyOrders.RestaurantName}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <LocationIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                            <Typography
                                variant='body2'
                                color='text.secondary'
                            >
                                {readyOrders.DistanceFromRestaurant} Miles to restaurant
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <LocationIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                            <Typography
                                variant='body2'
                                color='text.secondary'
                            >
                                {readyOrders.DeliveryToRestaurant} Miles after pickup
                            </Typography>
                        </Box>
                    </Box>
                </Box>


                {/* Cuisine Type Chip */}
                {/* <Chip 
              label={restaurant.CuisineType}
              size="small"
              sx={{
                backgroundColor: cuisineColors[restaurant.CuisineType] || cuisineColors.Other,
                color: 'primary.main',
                fontWeight: 'medium',
                mb: 2
              }}
            /> */}

                {/* Description */}
                {/* {restaurant.Description && (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  mb: 2,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.4
                }}
              >
                {restaurant.Description}
              </Typography>
            )} */}

                <Divider sx={{ my: 2 }} />

                {/* Restaurant Details */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <AttachMoney sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                        Compensation: &nbsp;<span style={{ fontWeight: 'bold' }}>${readyOrders.Compensation}</span>

                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <AccessTime sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                        Expected Time: {readyOrders.ExpectedTime.substring(11, 16)}

                    </Box>


                </Box>
            </CardContent>

            {/* Actions */}
            <CardActions sx={{ mt: 'auto', px: 2, pb: 2 }}>
                <Button
                    variant="contained"
                    fullWidth
                    startIcon={<RestaurantIcon />}
                    onClick={() => {
                        // router.push(`/user/restaurants/${restaurant.RestaurantId}`);
                    }}
                >
                    View Order Details
                </Button>
            </CardActions>
        </Card>
    );



    return (
        <>
            <Navbar />
            <h3 style={{justifySelf: "center", margin: "10px"}}>Browse nearby Orders</h3>
            <div
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
                        ReadyOrders
                            .slice()
                            .sort((a, b) => b.Compensation - a.Compensation)
                            .map((Order) => (
                                <OrderCard key={Order.OrderId} readyOrders={Order} />
                            ))
                    }
                </Box>
            </Container>
        </>
    )
}