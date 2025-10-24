'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Grid,
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
} from '@mui/material';
import { Restaurant, Add as AddIcon, ArrowBack } from '@mui/icons-material';
import Navbar from '../../../../_components/navbar';
import { useRouter } from 'next/navigation';

interface RestaurantForm {
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  cuisine_type: string;
  delivery_fee: string;
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

export default function AddRestaurantPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
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
      const response = await fetch('http://localhost:8000/api/restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          delivery_fee: parseFloat(formData.delivery_fee),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSnackbar({
          open: true,
          message: 'Restaurant added successfully!',
          severity: 'success',
        });

        // Reset form
        setFormData({
          name: '',
          description: '',
          address: '',
          phone: '',
          email: '',
          cuisine_type: '',
          delivery_fee: '0.00',
        });

        // Optionally redirect to restaurant list
        setTimeout(() => {
          router.push('/admin/restaurants');
        }, 2000);
      } else {
        const errorData = await response.json();
        setSnackbar({
          open: true,
          message: errorData.detail || 'Failed to add restaurant',
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('Error adding restaurant:', error);
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
          <Typography color="text.primary">Add Restaurant</Typography>
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
              Add New Restaurant
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
                  loading ? <CircularProgress size={20} /> : <AddIcon />
                }
                disabled={loading}
                sx={{ minWidth: 150 }}
              >
                {loading ? 'Adding...' : 'Add Restaurant'}
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
