"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
  Search as SearchIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  DeliveryDining as DeliveryIcon,
  Restaurant as RestaurantIcon,
  Star as StarIcon
} from '@mui/icons-material';
import Navbar from "../../../_components/navbar";
import { getRestaurants } from './actions';

interface Restaurant {
  restaurant_id: number;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  cuisine_type: string;
  is_active: boolean;
  rating: number;
  delivery_fee: number;
}

const cuisineColors: Record<string, string> = {
  Italian: '#e8f5e8',
  Chinese: '#fff3e0',
  Mexican: '#fce4ec',
  Indian: '#f3e5f5',
  American: '#e3f2fd',
  Japanese: '#f1f8e9',
  Thai: '#fff8e1',
  Mediterranean: '#e0f2f1',
  French: '#fafafa',
  Korean: '#f9fbe7',
  Greek: '#e8eaf6',
  Vietnamese: '#fff3e0',
  Other: '#f5f5f5'
};

export default function RestaurantsPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = React.useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = React.useState<Restaurant[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [cuisineFilter, setCuisineFilter] = React.useState('All');

  React.useEffect(() => {
    fetchRestaurants();
  }, []);

  React.useEffect(() => {
    filterRestaurants();
  }, [restaurants, searchTerm, cuisineFilter]);

  const fetchRestaurants = async () => {
    try {
      const response = await getRestaurants();
      if (response) {
        const activeRestaurants = response.filter(
          (restaurant: Restaurant) => restaurant.is_active
        );
        setRestaurants(activeRestaurants);
      } else {
        console.error('Failed to fetch restaurants');
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRestaurants = () => {
    let filtered = restaurants;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(restaurant =>
  restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  restaurant.cuisine_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
  restaurant.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by cuisine type
    if (cuisineFilter && cuisineFilter !== 'All') {
  filtered = filtered.filter(restaurant => restaurant.cuisine_type === cuisineFilter);
    }

    setFilteredRestaurants(filtered);
  };

  const getCuisineTypes = () => {
  const types = [...new Set(restaurants.map(r => r.cuisine_type))];
    return ['All', ...types.sort()];
  };

  const RestaurantCard = ({ restaurant }: { restaurant: Restaurant }) => (
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
              backgroundColor: cuisineColors[restaurant.cuisine_type] || cuisineColors.Other,
              color: 'primary.main',
              fontSize: '1.5rem'
            }}
          >
            {restaurant.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" component="h2" fontWeight="bold" noWrap>
              {restaurant.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              <Rating 
                value={restaurant.rating || 0} 
                readOnly 
                size="small" 
                precision={0.1}
                sx={{ mr: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                ({(restaurant.rating || 0).toFixed(1)})
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Cuisine Type Chip */}
        <Chip 
          label={restaurant.cuisine_type}
          size="small"
          sx={{
              backgroundColor: cuisineColors[restaurant.cuisine_type] || cuisineColors.Other,
            color: 'primary.main',
            fontWeight: 'medium',
            mb: 2
          }}
        />

        {/* Description */}
  {restaurant.description && (
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
            {restaurant.description}
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Restaurant Details */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <LocationIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
            <Typography variant="body2" color="text.secondary" noWrap>
              {restaurant.address}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {restaurant.phone}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DeliveryIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Delivery Fee: <strong>${(restaurant.delivery_fee || 0).toFixed(2)}</strong>
            </Typography>
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
            router.push(`/user/restaurants/${restaurant.restaurant_id}`);
          }}
        >
          View Menu
        </Button>
      </CardActions>
    </Card>
  );

  const RestaurantSkeleton = () => (
    <Card sx={{ height: 320 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Skeleton variant="circular" width={56} height={56} sx={{ mr: 2 }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="70%" height={28} />
            <Skeleton variant="text" width="40%" height={20} />
          </Box>
        </Box>
        <Skeleton variant="rectangular" width={80} height={24} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" sx={{ mb: 2 }} />
        <Skeleton variant="text" width="90%" />
        <Skeleton variant="text" width="70%" />
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Skeleton variant="rectangular" width="100%" height={36} />
      </CardActions>
    </Card>
  );

  return (
    <>
        <Navbar />
        <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Paper elevation={2} sx={{ p: 4, mb: 4, backgroundColor: '#fafafa' }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h3" component="h1" fontWeight="bold" color="primary.main" gutterBottom>
                🍽️ Discover Restaurants
            </Typography>
            <Typography variant="h6" color="text.secondary">
                Explore amazing local restaurants and order your favorite meals
            </Typography>
            </Box>

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <TextField
                placeholder="Search restaurants, cuisines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                    <SearchIcon color="action" />
                    </InputAdornment>
                ),
                }}
                sx={{ minWidth: 300 }}
            />

            <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Cuisine Type</InputLabel>
                <Select
                value={cuisineFilter}
                label="Cuisine Type"
                onChange={(e) => setCuisineFilter(e.target.value)}
                >
                {getCuisineTypes().map((type) => (
                    <MenuItem key={type} value={type}>
                    {type}
                    </MenuItem>
                ))}
                </Select>
            </FormControl>
            </Box>
        </Paper>

        {/* Results Summary */}
        {!loading && (
            <Box sx={{ mb: 3 }}>
            <Typography variant="h6" color="text.secondary">
                {filteredRestaurants.length === 0 ? 
                'No restaurants found' : 
                `${filteredRestaurants.length} restaurant${filteredRestaurants.length !== 1 ? 's' : ''} found`
                }
            </Typography>
            </Box>
        )}

        {/* Restaurant Grid */}
        <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)'
            },
            gap: 3
        }}>
            {loading ? (
            // Loading skeletons
            Array.from({ length: 6 }).map((_, index) => (
                <RestaurantSkeleton key={index} />
            ))
            ) : filteredRestaurants.length === 0 ? (
            // Empty state - spans full width
            <Box sx={{ gridColumn: '1 / -1' }}>
                <Paper sx={{ p: 6, textAlign: 'center' }}>
                <RestaurantIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                    {searchTerm || cuisineFilter !== 'All' ? 
                    'No restaurants match your search criteria' :
                    'No restaurants available at the moment'
                    }
                </Typography>
                {(searchTerm || cuisineFilter !== 'All') && (
                    <Button 
                    variant="outlined" 
                    onClick={() => {
                        setSearchTerm('');
                        setCuisineFilter('All');
                    }}
                    sx={{ mt: 2 }}
                    >
                    Clear Filters
                    </Button>
                )}
                </Paper>
            </Box>
            ) : (
            // Restaurant cards
      filteredRestaurants.map((restaurant) => (
        <RestaurantCard key={restaurant.restaurant_id} restaurant={restaurant} />
            ))
            )}
        </Box>

        {/* Footer Info */}
        {!loading && filteredRestaurants.length > 0 && (
            <Box sx={{ mt: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
                💡 Delivery fees and times may vary by location
            </Typography>
            </Box>
        )}
        </Container>
    </>
  );
}