"use client"

import * as React from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Grid,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Stack,
  IconButton,
  Skeleton,
  Button,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  LocalOffer as PriceIcon,
  CheckCircle as AvailableIcon,
  Cancel as UnavailableIcon,
  Star as StarIcon,
  ShoppingCart as CartIcon,
  Add as AddIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import Navbar from "../../../../_components/navbar";
import { useCart } from "../../../../_contexts/CartContext";

interface MenuItem {
  ItemId: number;  // Changed from 'id' to match backend API
  ItemName: string;
  Description?: string;
  Price: number;
  Image?: string;
  IsAvailable: boolean;
  Quantity?: number;
}

interface Restaurant {
  RestaurantId: number;  // Changed from 'id' to match backend API
  Name: string;
  Description?: string;
  CuisineType?: string;
  Rating?: number;
  Address?: string;
}

export default function RestaurantDetailPage() {
  const { restaurantId } = useParams();
  const { addToCart, restaurant: cartRestaurant, clearCart } = useCart();
  const [menuItems, setMenuItems] = React.useState<MenuItem[]>([]);
  const [restaurant, setRestaurant] = React.useState<Restaurant | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [conflictDialogOpen, setConflictDialogOpen] = React.useState(false);
  const [pendingItem, setPendingItem] = React.useState<MenuItem | null>(null);
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // console.log("Restaurant ID from params is", restaurantId);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch menu items
        const menuResponse = await fetch(`http://localhost:8000/api/restaurants/${restaurantId}/menu`);
        console.log("Menu response status:", menuResponse);
        if (!menuResponse.ok) {
          throw new Error('Failed to fetch menu items');
        }
        const menuData = await menuResponse.json();
        setMenuItems(menuData);

        // Fetch restaurant details (assuming this endpoint exists)
        try {
          const restaurantResponse = await fetch(`http://localhost:8000/api/restaurants/${restaurantId}`);
          console.log("Restaurant response status:", restaurantResponse);
          if (restaurantResponse.ok) {
            const restaurantData = await restaurantResponse.json();
            console.log("Restaurant data fetched:", restaurantData);
            setRestaurant(restaurantData);
          }
        } catch (restaurantError) {
          // If restaurant details endpoint doesn't exist, create a basic restaurant object
          setRestaurant({
            RestaurantId: parseInt(restaurantId as string),
            Name: 'Restaurant Name',
            Description: 'A wonderful dining experience awaits you.',
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (restaurantId) {
      fetchData();
    }
  }, [restaurantId]);

  // Handle add to cart
  const handleAddToCart = (item: MenuItem) => {
    if (!restaurant) return;

    const cartItem = {
      id: item.ItemId,
      ItemName: item.ItemName,
      Price: item.Price,
      Image: item.Image,
      restaurantId: restaurant.RestaurantId,
      restaurantName: restaurant.Name
    };

    const success = addToCart(cartItem);
    
    if (success) {
      setSnackbar({
        open: true,
        message: `${item.ItemName} added to cart!`,
        severity: 'success'
      });
    } else {
      // Cart has items from different restaurant
      setPendingItem(item);
      setConflictDialogOpen(true);
    }
  };

  const handleReplaceCart = () => {
    if (pendingItem && restaurant) {
      clearCart();
      const cartItem = {
        id: pendingItem.ItemId,
        ItemName: pendingItem.ItemName,
        Price: pendingItem.Price,
        Image: pendingItem.Image,
        restaurantId: restaurant.RestaurantId,
        restaurantName: restaurant.Name
      };
      addToCart(cartItem);
      setSnackbar({
        open: true,
        message: `Cart cleared and ${pendingItem.ItemName} added!`,
        severity: 'success'
      });
    }
    setConflictDialogOpen(false);
    setPendingItem(null);
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const MenuItemCard: React.FC<{ item: MenuItem }> = ({ item }) => (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        },
        opacity: item.IsAvailable ? 1 : 0.7,
      }}
    >
      {item.Image && (
        <CardMedia
          component="img"
          height="160"
          image={item.Image}
          alt={item.ItemName}
          sx={{ objectFit: 'cover' }}
        />
      )}
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" component="h3" sx={{ flexGrow: 1, pr: 1 }}>
            {item.ItemName}
          </Typography>
          <Chip
            icon={item.IsAvailable ? <AvailableIcon /> : <UnavailableIcon />}
            label={item.IsAvailable ? 'Available' : 'Unavailable'}
            color={item.IsAvailable ? 'success' : 'error'}
            size="small"
            variant="outlined"
          />
        </Box>
        
        {item.Description && (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ mb: 2, flexGrow: 1 }}
          >
            {item.Description}
          </Typography>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
          <Chip
            icon={<PriceIcon />}
            label={`$${item.Price.toFixed(2)}`}
            color="primary"
            variant="filled"
          />
          {item.Quantity !== undefined && (
            <Typography variant="caption" color="text.secondary">
              Qty: {item.Quantity}
            </Typography>
          )}
        </Box>
      </CardContent>
      <CardActions>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          startIcon={<CartIcon />}
          onClick={() => handleAddToCart(item)}
          disabled={!item.IsAvailable}
          sx={{ m: 1 }}
        >
          Add to Cart
        </Button>
      </CardActions>
    </Card>
  );

  if (loading) {
    return (
      <Box>
        <Navbar />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Skeleton variant="text" width="60%" height={40} />
            <Skeleton variant="text" width="80%" height={24} />
            <Skeleton variant="text" width="40%" height={24} />
          </Paper>
          <Grid container spacing={3}>
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item}>
                <Card>
                  <Skeleton variant="rectangular" height={160} />
                  <CardContent>
                    <Skeleton variant="text" width="80%" height={28} />
                    <Skeleton variant="text" width="100%" height={20} />
                    <Skeleton variant="text" width="60%" height={20} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                      <Skeleton variant="rounded" width={80} height={32} />
                      <Skeleton variant="rounded" width={60} height={32} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Navbar />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Restaurant Header */}
        {restaurant && (
          <Paper 
            elevation={2}
            sx={{ 
              p: 4, 
              mb: 4,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: 2
            }}
          >
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <RestaurantIcon sx={{ fontSize: 40 }} />
                <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold' }}>
                  {restaurant.Name}
                </Typography>
              </Box>
              
              {restaurant.Description && (
                <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: '80%' }}>
                  {restaurant.Description}
                </Typography>
              )}
              
              <Stack direction="row" spacing={2} flexWrap="wrap">
                {restaurant.CuisineType && (
                  <Chip 
                    label={restaurant.CuisineType} 
                    variant="outlined" 
                    sx={{ 
                      borderColor: 'white', 
                      color: 'white',
                      '& .MuiChip-label': { fontWeight: 'medium' }
                    }} 
                  />
                )}
                {restaurant.Rating && (
                  <Chip 
                    icon={<StarIcon />}
                    label={`${restaurant.Rating}/5`} 
                    variant="outlined" 
                    sx={{ 
                      borderColor: 'white', 
                      color: 'white',
                      '& .MuiChip-label': { fontWeight: 'medium' }
                    }} 
                  />
                )}
                {restaurant.Address && (
                  <Chip 
                    label={restaurant.Address} 
                    variant="outlined" 
                    sx={{ 
                      borderColor: 'white', 
                      color: 'white',
                      '& .MuiChip-label': { fontWeight: 'medium' }
                    }} 
                  />
                )}
              </Stack>
            </Stack>
          </Paper>
        )}

        {/* Menu Items */}
        {menuItems.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <RestaurantIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom color="text.secondary">
              No menu items available
            </Typography>
            <Typography variant="body1" color="text.secondary">
              This restaurant hasn't added their menu items yet.
            </Typography>
          </Paper>
        ) : (
          <Box>
            <Typography 
              variant="h4" 
              component="h2" 
              gutterBottom 
              sx={{ 
                fontWeight: 'bold',
                color: 'primary.main',
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              Menu
              <Chip 
                label={`${menuItems.length} items`} 
                size="small" 
                variant="outlined" 
                color="primary"
              />
            </Typography>
            
            <Grid container spacing={3}>
              {menuItems.map((item) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.ItemId}>
                  <MenuItemCard item={item} />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Container>

      {/* Restaurant Conflict Dialog */}
      <Dialog 
        open={conflictDialogOpen} 
        onClose={() => setConflictDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Different Restaurant
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Your cart contains items from <strong>{cartRestaurant?.name}</strong>.
          </Typography>
          <Typography variant="body1" paragraph>
            You can only order from one restaurant at a time. Would you like to clear your current cart and add this item from <strong>{restaurant?.Name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConflictDialogOpen(false)}
            color="inherit"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleReplaceCart}
            variant="contained"
            color="primary"
          >
            Replace Cart
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}