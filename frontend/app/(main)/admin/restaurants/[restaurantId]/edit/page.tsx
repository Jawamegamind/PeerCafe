'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Alert,
  Snackbar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Breadcrumbs,
  Link,
  Divider,
  Skeleton,
} from '@mui/material';
import { Restaurant, Edit as EditIcon, ArrowBack } from '@mui/icons-material';
import Navbar from '../../../../../_components/navbar';
import { useRouter, useParams } from 'next/navigation';

interface RestaurantForm {
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  cuisine_type: string;
  delivery_fee: string;
}

// eslint-disable-next-line
interface Restaurant {
  restaurant_id: number;
  name: string;
  description?: string;
  cuisine_type: string;
  address: string;
  phone: string;
  email: string;
  rating: number;
  delivery_fee: number;
  is_active: boolean;
}

const cuisineTypes = [
  'Italian',
  'Chinese',
  'Mexican',
  'Indian',
  'American',
  'Japanese',
  'Thai',
  'Mediterranean',
  'French',
  'Korean',
  'Greek',
  'Vietnamese',
  'Other',
];

export default function EditRestaurantPage() {
  const router = useRouter();
  const { restaurantId } = useParams();
  const [loading, setLoading] = React.useState(false);
  const [pageLoading, setPageLoading] = React.useState(true);
  const [snackbar, setSnackbar] = React.useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });

  const [formData, setFormData] = React.useState<RestaurantForm>({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    cuisine_type: '',
    delivery_fee: '0.00',
  });

  const [errors, setErrors] = React.useState<Partial<RestaurantForm>>({});

  React.useEffect(() => {
    if (!restaurantId) {
      router.push('/admin/restaurants');
      return;
    }
    fetchRestaurantData();
  }, [restaurantId]);

  const fetchRestaurantData = async () => {
    try {
      setPageLoading(true);
      const response = await fetch(
        `http://localhost:8000/api/restaurants/${restaurantId}`
      );

      if (response.ok) {
        const data: Restaurant = await response.json();
        setFormData({
          name: data.name || '',
          description: data.description || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          cuisine_type: data.cuisine_type || '',
          delivery_fee: data.delivery_fee?.toString() || '0.00',
        });
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to fetch restaurant data',
          severity: 'error',
        });
        router.push('/admin/restaurants');
      }
    } catch {
      setSnackbar({
        open: true,
        message: 'Error fetching restaurant data. Please try again.',
        severity: 'error',
      });
      router.push('/admin/restaurants');
    } finally {
      setPageLoading(false);
    }
  };

  const handleInputChange =
    (field: keyof RestaurantForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData(prev => ({
        ...prev,
        [field]: event.target.value,
      }));

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors(prev => ({
          ...prev,
          [field]: '',
        }));
      }
    };

  const validateForm = (): boolean => {
    const newErrors: Partial<RestaurantForm> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Restaurant name is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.cuisine_type) {
      newErrors.cuisine_type = 'Cuisine type is required';
    }

    const deliveryFee = parseFloat(formData.delivery_fee);
    if (isNaN(deliveryFee) || deliveryFee < 0) {
      newErrors.delivery_fee = 'Please enter a valid delivery fee';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      setSnackbar({
        open: true,
        message: 'Please fix the errors in the form',
        severity: 'error',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `http://localhost:8000/api/restaurants/${restaurantId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            delivery_fee: parseFloat(formData.delivery_fee),
          }),
        }
      );

      if (response.ok) {
        setSnackbar({
          open: true,
          message: 'Restaurant updated successfully!',
          severity: 'success',
        });

        // Redirect to restaurant list after a short delay
        setTimeout(() => {
          router.push('/admin/restaurants');
        }, 2000);
      } else {
        const errorData = await response.json();
        setSnackbar({
          open: true,
          message: errorData.detail || 'Failed to update restaurant',
          severity: 'error',
        });
      }
    } catch {
      setSnackbar({
        open: true,
        message: 'Network error. Please try again.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (pageLoading) {
    return (
      <>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Skeleton variant="rectangular" height={60} sx={{ mb: 3 }} />
          <Paper elevation={3} sx={{ p: 4 }}>
            <Skeleton variant="rectangular" height={40} sx={{ mb: 4 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Skeleton variant="rectangular" height={56} sx={{ flex: 1 }} />
                <Skeleton variant="rectangular" height={56} sx={{ flex: 1 }} />
              </Box>
              <Skeleton variant="rectangular" height={100} />
              <Skeleton variant="rectangular" height={56} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Skeleton variant="rectangular" height={56} sx={{ flex: 1 }} />
                <Skeleton variant="rectangular" height={56} sx={{ flex: 1 }} />
              </Box>
              <Skeleton
                variant="rectangular"
                height={56}
                sx={{ maxWidth: 300 }}
              />
            </Box>
          </Paper>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link
            color="inherit"
            href="/admin/dashboard"
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
            }}
          >
            Admin Dashboard
          </Link>
          <Link
            color="inherit"
            href="/admin/restaurants"
            sx={{ textDecoration: 'none' }}
          >
            Restaurants
          </Link>
          <Typography color="text.primary">Edit Restaurant</Typography>
        </Breadcrumbs>

        <Paper elevation={3} sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => router.back()}
              sx={{ mr: 2 }}
              variant="outlined"
            >
              Back
            </Button>
            <Restaurant sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
            <Typography
              variant="h4"
              component="h1"
              color="primary.main"
              fontWeight="bold"
            >
              Edit Restaurant
            </Typography>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Row 1: Restaurant Name and Cuisine Type */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 280 }}>
                  <TextField
                    fullWidth
                    label="Restaurant Name"
                    value={formData.name}
                    onChange={handleInputChange('name')}
                    error={!!errors.name}
                    helperText={errors.name}
                    required
                    variant="outlined"
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 280 }}>
                  <FormControl fullWidth error={!!errors.cuisine_type} required>
                    <InputLabel>Cuisine Type</InputLabel>
                    <Select
                      value={formData.cuisine_type}
                      label="Cuisine Type"
                      onChange={e => {
                        setFormData(prev => ({
                          ...prev,
                          cuisine_type: e.target.value,
                        }));
                        if (errors.cuisine_type) {
                          setErrors(prev => ({ ...prev, cuisine_type: '' }));
                        }
                      }}
                    >
                      {cuisineTypes.map(type => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.cuisine_type && (
                      <Typography
                        variant="caption"
                        color="error"
                        sx={{ mt: 1, ml: 2 }}
                      >
                        {errors.cuisine_type}
                      </Typography>
                    )}
                  </FormControl>
                </Box>
              </Box>

              {/* Description */}
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={handleInputChange('description')}
                multiline
                rows={3}
                variant="outlined"
                helperText="Optional: Brief description of the restaurant"
              />

              {/* Address */}
              <TextField
                fullWidth
                label="Address"
                value={formData.address}
                onChange={handleInputChange('address')}
                error={!!errors.address}
                helperText={errors.address}
                required
                variant="outlined"
              />

              {/* Row 2: Phone and Email */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 280 }}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={formData.phone}
                    onChange={handleInputChange('phone')}
                    error={!!errors.phone}
                    helperText={errors.phone}
                    required
                    variant="outlined"
                    placeholder="(555) 123-4567"
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 280 }}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    error={!!errors.email}
                    helperText={errors.email}
                    required
                    variant="outlined"
                  />
                </Box>
              </Box>

              {/* Delivery Fee */}
              <Box sx={{ maxWidth: 300 }}>
                <TextField
                  fullWidth
                  label="Delivery Fee"
                  type="number"
                  value={formData.delivery_fee}
                  onChange={handleInputChange('delivery_fee')}
                  error={!!errors.delivery_fee}
                  helperText={errors.delivery_fee}
                  required
                  variant="outlined"
                  inputProps={{
                    min: 0,
                    step: 0.01,
                  }}
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                  }}
                />
              </Box>
            </Box>

            {/* Submit Button */}
            <Box
              sx={{
                mt: 4,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 2,
              }}
            >
              <Button
                type="button"
                variant="outlined"
                size="large"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={
                  loading ? <CircularProgress size={20} /> : <EditIcon />
                }
                disabled={loading}
                sx={{ minWidth: 150 }}
              >
                {loading ? 'Updating...' : 'Update Restaurant'}
              </Button>
            </Box>
          </Box>
        </Paper>

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
