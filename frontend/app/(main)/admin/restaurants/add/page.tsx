"use client"

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
  Divider
} from '@mui/material';
import { Restaurant, Add as AddIcon, ArrowBack } from '@mui/icons-material';
import Navbar from "../../../../_components/navbar";
import { useRouter } from 'next/navigation';

interface RestaurantForm {
  Name: string;
  Description: string;
  Address: string;
  Phone: string;
  Email: string;
  CuisineType: string;
  DeliveryFee: string;
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
  'Other'
];

export default function AddRestaurantPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  const [formData, setFormData] = React.useState<RestaurantForm>({
    Name: '',
    Description: '',
    Address: '',
    Phone: '',
    Email: '',
    CuisineType: '',
    DeliveryFee: '0.00'
  });

  const [errors, setErrors] = React.useState<Partial<RestaurantForm>>({});

  const handleInputChange = (field: keyof RestaurantForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<RestaurantForm> = {};

    if (!formData.Name.trim()) {
      newErrors.Name = 'Restaurant name is required';
    }

    if (!formData.Address.trim()) {
      newErrors.Address = 'Address is required';
    }

    if (!formData.Phone.trim()) {
      newErrors.Phone = 'Phone number is required';
    }

    if (!formData.Email.trim()) {
      newErrors.Email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.Email)) {
      newErrors.Email = 'Please enter a valid email address';
    }

    if (!formData.CuisineType) {
      newErrors.CuisineType = 'Cuisine type is required';
    }

    const deliveryFee = parseFloat(formData.DeliveryFee);
    if (isNaN(deliveryFee) || deliveryFee < 0) {
      newErrors.DeliveryFee = 'Please enter a valid delivery fee';
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
        severity: 'error'
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
          DeliveryFee: parseFloat(formData.DeliveryFee)
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSnackbar({
          open: true,
          message: 'Restaurant added successfully!',
          severity: 'success'
        });
        
        // Reset form
        setFormData({
          Name: '',
          Description: '',
          Address: '',
          Phone: '',
          Email: '',
          CuisineType: '',
          DeliveryFee: '0.00'
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
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error adding restaurant:', error);
      setSnackbar({
        open: true,
        message: 'Network error. Please try again.',
        severity: 'error'
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
            sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
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
            <Typography variant="h4" component="h1" color="primary.main" fontWeight="bold">
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
                    value={formData.Name}
                    onChange={handleInputChange('Name')}
                    error={!!errors.Name}
                    helperText={errors.Name}
                    required
                    variant="outlined"
                    />
                </Box>
                <Box sx={{ flex: 1, minWidth: 280 }}>
                    <FormControl fullWidth error={!!errors.CuisineType} required>
                    <InputLabel>Cuisine Type</InputLabel>
                    <Select
                        value={formData.CuisineType}
                        label="Cuisine Type"
                        onChange={(e) => {
                        setFormData(prev => ({ ...prev, CuisineType: e.target.value }));
                        if (errors.CuisineType) {
                            setErrors(prev => ({ ...prev, CuisineType: '' }));
                        }
                        }}
                    >
                        {cuisineTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                            {type}
                        </MenuItem>
                        ))}
                    </Select>
                    {errors.CuisineType && (
                        <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                        {errors.CuisineType}
                        </Typography>
                    )}
                    </FormControl>
                </Box>
                </Box>

                {/* Description */}
                <TextField
                fullWidth
                label="Description"
                value={formData.Description}
                onChange={handleInputChange('Description')}
                multiline
                rows={3}
                variant="outlined"
                helperText="Optional: Brief description of the restaurant"
                />

                {/* Address */}
                <TextField
                fullWidth
                label="Address"
                value={formData.Address}
                onChange={handleInputChange('Address')}
                error={!!errors.Address}
                helperText={errors.Address}
                required
                variant="outlined"
                />

                {/* Row 2: Phone and Email */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 280 }}>
                    <TextField
                    fullWidth
                    label="Phone Number"
                    value={formData.Phone}
                    onChange={handleInputChange('Phone')}
                    error={!!errors.Phone}
                    helperText={errors.Phone}
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
                    value={formData.Email}
                    onChange={handleInputChange('Email')}
                    error={!!errors.Email}
                    helperText={errors.Email}
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
                    value={formData.DeliveryFee}
                    onChange={handleInputChange('DeliveryFee')}
                    error={!!errors.DeliveryFee}
                    helperText={errors.DeliveryFee}
                    required
                    variant="outlined"
                    inputProps={{
                    min: 0,
                    step: 0.01
                    }}
                    InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                    }}
                />
                </Box>
            </Box>

            {/* Submit Button */}
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
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
                startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
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