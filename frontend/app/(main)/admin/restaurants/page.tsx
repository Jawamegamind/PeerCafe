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
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Snackbar,
  FormControlLabel,
  Switch
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Restaurant as RestaurantIcon,
  Restore as RestoreIcon,
  MenuBook as MenuBookIcon
} from '@mui/icons-material';
import Navbar from "../../../_components/navbar";
import { useRouter } from 'next/navigation';

interface Restaurant {
  RestaurantId: number;
  Name: string;
  Description?: string;
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
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [deleteDialog, setDeleteDialog] = React.useState({
    open: false,
    restaurant: null as Restaurant | null
  });
  const [snackbar, setSnackbar] = React.useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });
  const [showDeleted, setShowDeleted] = React.useState(true);

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

  const handleDeleteClick = (restaurant: Restaurant) => {
    setDeleteDialog({
      open: true,
      restaurant: restaurant
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.restaurant) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/restaurants/${deleteDialog.restaurant.RestaurantId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Update the restaurant's IsActive status to false instead of removing it
        setRestaurants(prev => 
          prev.map(r => 
            r.RestaurantId === deleteDialog.restaurant!.RestaurantId 
              ? { ...r, IsActive: false }
              : r
          )
        );
        
        setSnackbar({
          open: true,
          message: `${deleteDialog.restaurant.Name} has been deleted successfully`,
          severity: 'success'
        });
      } else {
        const errorData = await response.json();
        setSnackbar({
          open: true,
          message: errorData.detail || 'Failed to delete restaurant',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      setSnackbar({
        open: true,
        message: 'Network error. Please try again.',
        severity: 'error'
      });
    } finally {
      setDeleteLoading(false);
      setDeleteDialog({ open: false, restaurant: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, restaurant: null });
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleRestoreRestaurant = async (restaurant: Restaurant) => {
    try {
      const response = await fetch(`http://localhost:8000/api/restaurants/${restaurant.RestaurantId}/restore`, {
        method: 'PATCH',
      });

      if (response.ok) {
        // Update the restaurant in the state
        setRestaurants(prev => 
          prev.map(r => 
            r.RestaurantId === restaurant.RestaurantId 
              ? { ...r, IsActive: true }
              : r
          )
        );
        
        setSnackbar({
          open: true,
          message: `${restaurant.Name} has been restored successfully`,
          severity: 'success'
        });
      } else {
        const errorData = await response.json();
        setSnackbar({
          open: true,
          message: errorData.detail || 'Failed to restore restaurant',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error restoring restaurant:', error);
      setSnackbar({
        open: true,
        message: 'Network error. Please try again.',
        severity: 'error'
      });
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

            {/* Filter Controls */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <FormControlLabel
                control={
                <Switch
                    checked={showDeleted}
                    onChange={(e) => setShowDeleted(e.target.checked)}
                    color="primary"
                />
                }
                label="Show deleted restaurants"
            />
            <Typography variant="body2" color="text.secondary">
                Total: {restaurants.length} restaurants
                {restaurants.filter(r => !r.IsActive).length > 0 && 
                ` (${restaurants.filter(r => !r.IsActive).length} deleted)`
                }
            </Typography>
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
                    {restaurants.filter(r => showDeleted || r.IsActive).length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                            {restaurants.length === 0 
                                ? 'No restaurants found. Add your first restaurant to get started!'
                                : 'No restaurants match your current filter settings.'
                            }
                        </Typography>
                        </TableCell>
                    </TableRow>
                    ) : (
                    restaurants
                        .filter(restaurant => showDeleted || restaurant.IsActive)
                        .map((restaurant) => (
                        <TableRow 
                            key={restaurant.RestaurantId} 
                            hover
                            sx={{ 
                                opacity: restaurant.IsActive ? 1 : 0.6,
                                backgroundColor: restaurant.IsActive ? 'inherit' : '#fafafa'
                            }}
                        >
                        <TableCell>
                            <Typography 
                                variant="subtitle1" 
                                fontWeight="medium"
                                sx={{ 
                                    textDecoration: restaurant.IsActive ? 'none' : 'line-through',
                                    color: restaurant.IsActive ? 'inherit' : 'text.secondary'
                                }}
                            >
                            {restaurant.Name}
                            {!restaurant.IsActive && (
                                <Chip 
                                label="Deleted" 
                                size="small" 
                                color="error" 
                                sx={{ ml: 1 }} 
                                />
                            )}
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
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            {restaurant.IsActive ? (
                                <>
                                <IconButton 
                                    size="small" 
                                    color="info"
                                    title="Manage Menu"
                                    onClick={() => router.push(`/admin/restaurants/${restaurant.RestaurantId}`)}
                                >
                                    <MenuBookIcon />
                                </IconButton>
                                <IconButton 
                                    size="small" 
                                    color="primary"
                                    title="Edit Restaurant"
                                    onClick={() => {
                                    // TODO: Navigate to edit page
                                    console.log('Edit restaurant:', restaurant.RestaurantId);
                                    }}
                                >
                                    <EditIcon />
                                </IconButton>
                                <IconButton 
                                    size="small" 
                                    color="error"
                                    title="Delete Restaurant"
                                    onClick={() => handleDeleteClick(restaurant)}
                                    disabled={deleteLoading}
                                >
                                    <DeleteIcon />
                                </IconButton>
                                </>
                            ) : (
                                <IconButton 
                                size="small" 
                                color="success"
                                title="Restore Restaurant"
                                onClick={() => handleRestoreRestaurant(restaurant)}
                                >
                                <RestoreIcon />
                                </IconButton>
                            )}
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

        {/* Delete Confirmation Dialog */}
        <Dialog
            open={deleteDialog.open}
            onClose={handleDeleteCancel}
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-description"
        >
            <DialogTitle id="delete-dialog-title" sx={{ color: 'error.main' }}>
            ⚠️ Delete Restaurant
            </DialogTitle>
            <DialogContent>
            <DialogContentText id="delete-dialog-description" sx={{ mb: 2 }}>
                Are you sure you want to delete <strong>{deleteDialog.restaurant?.Name}</strong>?
            </DialogContentText>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                This action will:
            </Typography>
            
            <Box component="ul" sx={{ margin: '0 0 16px 0', paddingLeft: '20px' }}>
                <Box component="li" sx={{ mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                    Mark the restaurant as inactive
                </Typography>
                </Box>
                <Box component="li" sx={{ mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                    Hide it from user listings
                </Typography>
                </Box>
                <Box component="li" sx={{ mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                    Preserve historical data
                </Typography>
                </Box>
            </Box>
            
            <Typography variant="body2" color="text.secondary">
                This action can be reversed by reactivating the restaurant.
            </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
            <Button 
                onClick={handleDeleteCancel} 
                variant="outlined"
                disabled={deleteLoading}
            >
                Cancel
            </Button>
            <Button 
                onClick={handleDeleteConfirm} 
                color="error" 
                variant="contained"
                disabled={deleteLoading}
                startIcon={deleteLoading ? <CircularProgress size={20} /> : <DeleteIcon />}
            >
                {deleteLoading ? 'Deleting...' : 'Delete Restaurant'}
            </Button>
            </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={handleSnackbarClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
            <Alert 
            onClose={handleSnackbarClose} 
            severity={snackbar.severity}
            variant="filled"
            >
            {snackbar.message}
            </Alert>
        </Snackbar>
        </Container>
    </>
  );
}