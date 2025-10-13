"use client"

import * as React from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Breadcrumbs,
  Link,
  Divider,
  CircularProgress
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Restaurant as RestaurantIcon
} from '@mui/icons-material';
import Navbar from "../../../_components/navbar";
import { useRouter } from 'next/navigation';

interface Restaurant {
  RestaurantId: number;
  Name: string;
  CuisineType: string;
  Address: string;
  Phone: string;
  Email: string;
  Rating: number;
  DeliveryFee: number;
  IsActive: boolean;
}

export default function RestaurantsPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = React.useState<Restaurant[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/restaurants');
      if (response.ok) {
        const data = await response.json();
        setRestaurants(data);
      } else {
        console.error('Failed to fetch restaurants');
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
        <Navbar />
        <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
            <Link 
            color="inherit" 
            href="/admin/dashboard"
            sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
            >
            Admin Dashboard
            </Link>
            <Typography color="text.primary">Restaurants</Typography>
        </Breadcrumbs>

        <Paper elevation={3} sx={{ p: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <RestaurantIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
                <Typography variant="h4" component="h1" color="primary.main" fontWeight="bold">
                Restaurant Management
                </Typography>
            </Box>
            <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => router.push('/admin/restaurants/add')}
                size="large"
            >
                Add Restaurant
            </Button>
            </Box>

            <Divider sx={{ mb: 4 }} />

            {/* Restaurant Table */}
            {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
            </Box>
            ) : (
            <TableContainer>
                <Table>
                <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Cuisine</strong></TableCell>
                    <TableCell><strong>Address</strong></TableCell>
                    <TableCell><strong>Phone</strong></TableCell>
                    <TableCell><strong>Rating</strong></TableCell>
                    <TableCell><strong>Delivery Fee</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {restaurants.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                            No restaurants found. Add your first restaurant to get started!
                        </Typography>
                        </TableCell>
                    </TableRow>
                    ) : (
                    restaurants.map((restaurant) => (
                        <TableRow key={restaurant.RestaurantId} hover>
                        <TableCell>
                            <Typography variant="subtitle1" fontWeight="medium">
                            {restaurant.Name}
                            </Typography>
                        </TableCell>
                        <TableCell>
                            <Chip 
                            label={restaurant.CuisineType} 
                            variant="outlined" 
                            size="small"
                            color="primary"
                            />
                        </TableCell>
                        <TableCell>
                            <Typography variant="body2" color="text.secondary">
                            {restaurant.Address}
                            </Typography>
                        </TableCell>
                        <TableCell>{restaurant.Phone}</TableCell>
                        <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body2">
                                ⭐ {restaurant.Rating.toFixed(1)}
                            </Typography>
                            </Box>
                        </TableCell>
                        <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                            ${restaurant.DeliveryFee.toFixed(2)}
                            </Typography>
                        </TableCell>
                        <TableCell>
                            <Chip 
                            label={restaurant.IsActive ? 'Active' : 'Inactive'}
                            color={restaurant.IsActive ? 'success' : 'default'}
                            size="small"
                            />
                        </TableCell>
                        <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton size="small" color="primary">
                                {/* To-do: Implement edit functionality */}
                                <EditIcon />
                            </IconButton>
                            <IconButton size="small" color="error">
                                {/* To-do: Implement delete functionality */}
                                <DeleteIcon />
                            </IconButton>
                            </Box>
                        </TableCell>
                        </TableRow>
                    ))
                    )}
                </TableBody>
                </Table>
            </TableContainer>
            )}
        </Paper>
        </Container>
    </>
  );
}