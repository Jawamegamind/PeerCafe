'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Card,
  CardContent,
  Alert,
  Chip,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ShoppingBag as ShoppingBagIcon,
  Restaurant as RestaurantIcon,
  Receipt as ReceiptIcon,
  LocationOn as LocationOnIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import Navbar from '../../../_components/navbar';
import { useCart } from '../../../_contexts/CartContext';
import { createClient } from '@/utils/supabase/client';
// import { API_ENDPOINTS } from '@/utils/config';

// Interfaces for order placement
interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  zip_code: string;
  instructions?: string;
}

interface OrderData {
  user_id: string;
  restaurant_id: number;
  order_items: Array<{
    item_id: number;
    item_name: string;
    price: number;
    quantity: number;
    subtotal: number;
  }>;
  delivery_address: DeliveryAddress;
  subtotal: number;
  tax_amount: number;
  delivery_fee: number;
  tip_amount: number;
  discount_amount: number;
  total_amount: number;
  notes?: string;
}

const TAX_RATE = 0.08; // 8% tax
const DELIVERY_FEE = 3.99; // Fixed delivery fee

export default function CheckoutPage() {
  const router = useRouter();
  const { items, restaurant, totalItems, totalPrice, isCartEmpty, clearCart } =
    useCart();
  const supabase = createClient();

  // Form state
  const [deliveryAddress, setDeliveryAddress] = React.useState<DeliveryAddress>(
    {
      street: '',
      city: '',
      state: 'CA', // Default to CA
      zip_code: '',
      instructions: '',
    }
  );

  const [tipAmount, setTipAmount] = React.useState<number>(5.0);
  const [notes, setNotes] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showSuccess, setShowSuccess] = React.useState<boolean>(false);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [authLoading, setAuthLoading] = React.useState<boolean>(true);

  // Calculate pricing
  const subtotal = totalPrice;
  const taxAmount = subtotal * TAX_RATE;
  const discountAmount = 0; // No discounts for MVP
  const finalTotal =
    subtotal + taxAmount + DELIVERY_FEE + tipAmount - discountAmount;

  // Fetch current user on component mount
  React.useEffect(() => {
    const getCurrentUser = async () => {
      try {
        setAuthLoading(true);

        // Get current authenticated user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          // console.error('No authenticated user found:', authError);
          setError('You must be logged in to place an order');
          router.push('/login');
          return;
        }

        // Fetch user details from Users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (userError) {
          // console.error('Error fetching user data:', userError);
          setError('Failed to load user information');
          return;
        }

        setCurrentUser(userData);
      } catch {
        // console.error('Error getting current user:', err);
        setError('Authentication error. Please try logging in again.');
        router.push('/login');
      } finally {
        setAuthLoading(false);
      }
    };

    getCurrentUser();
  }, [router, supabase]);

  // Form validation
  const isFormValid = () => {
    return (
      deliveryAddress.street.trim() !== '' &&
      deliveryAddress.city.trim() !== '' &&
      deliveryAddress.state.trim() !== '' &&
      deliveryAddress.zip_code.trim() !== ''
    );
  };

  // Handle order placement
  const handlePlaceOrder = async () => {
    if (!isFormValid()) {
      setError('Please fill in all required delivery address fields');
      return;
    }

    if (!currentUser) {
      setError('User authentication required. Please log in again.');
      router.push('/login');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Prepare order data
      const orderData: OrderData = {
        user_id: currentUser.user_id, // Use actual authenticated user ID
        restaurant_id: restaurant!.id,
        order_items: items.map(item => ({
          item_id: item.id,
          item_name: item.ItemName,
          price: item.Price,
          quantity: item.quantity,
          subtotal: item.Price * item.quantity,
        })),
        delivery_address: deliveryAddress,
        subtotal: subtotal,
        tax_amount: taxAmount,
        delivery_fee: DELIVERY_FEE,
        tip_amount: tipAmount,
        discount_amount: discountAmount,
        total_amount: finalTotal,
        notes: notes || undefined,
      };

      // console.log('Submitting order data:', orderData);

      // Submit order to backend
      const response = await fetch(`http://localhost:8000/api/orders/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        // Check if response is JSON or text
        const contentType = response.headers.get('content-type');
        let errorMessage = 'Failed to place order';

        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorMessage;
          } catch {
            // console.error('Error parsing JSON response:', parseError);
            errorMessage = `Server error (${response.status}): Unable to parse error response`;
          }
        } else {
          // Response is not JSON, likely HTML error page
          // const textResponse = await response.text();
          // console.error('Non-JSON response:', textResponse);
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      // Parse successful response
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // const textResponse = await response.text();
        // console.error('Expected JSON but got:', textResponse);
        throw new Error('Server returned invalid response format');
      }

      const order = await response.json();

      // Clear cart and show success
      clearCart();
      setShowSuccess(true);

      // Redirect to order confirmation page after brief delay
      setTimeout(() => {
        router.push(`/user/orders/${order.order_id}`);
      }, 2000);
    } catch (err) {
      // console.error('Order placement error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to place order. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <Box>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={64} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Verifying your account...
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  // If cart is empty, show message
  if (isCartEmpty) {
    return (
      <Box>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <ShoppingBagIcon
              sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}
            />
            <Typography variant="h5" gutterBottom color="text.secondary">
              Your cart is empty
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Add some items to your cart before checking out.
            </Typography>
            <Button
              variant="contained"
              startIcon={<RestaurantIcon />}
              onClick={() => router.push('/user/restaurants')}
            >
              Browse Restaurants
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.back()}
            sx={{ mr: 2 }}
            variant="outlined"
          >
            Back
          </Button>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 'bold', color: 'primary.main' }}
          >
            Checkout
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Order Summary */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <ReceiptIcon />
                Order Summary
              </Typography>

              {/* Restaurant Info */}
              {restaurant && (
                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={`From: ${restaurant.name}`}
                    color="primary"
                    variant="outlined"
                    icon={<RestaurantIcon />}
                  />
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Items List */}
              <List>
                {items.map((item, index) => (
                  <React.Fragment key={item.id}>
                    <ListItem sx={{ px: 0, py: 2 }}>
                      <ListItemText
                        primary={
                          <Typography
                            component="span"
                            variant="subtitle1"
                            sx={{ fontWeight: 'medium' }}
                          >
                            {item.ItemName}
                          </Typography>
                        }
                        secondary={
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                          >
                            ${item.Price.toFixed(2)} × {item.quantity}
                          </Typography>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Typography
                          component="span"
                          variant="subtitle1"
                          sx={{ fontWeight: 'bold' }}
                        >
                          ${(item.Price * item.quantity).toFixed(2)}
                        </Typography>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < items.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />

              {/* Pricing Breakdown */}
              <Box sx={{ space: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <Typography>Subtotal</Typography>
                  <Typography>${subtotal.toFixed(2)}</Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <Typography>Tax</Typography>
                  <Typography>${taxAmount.toFixed(2)}</Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <Typography>Delivery Fee</Typography>
                  <Typography>${DELIVERY_FEE.toFixed(2)}</Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <Typography>Tip</Typography>
                  <Typography>${tipAmount.toFixed(2)}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Total ({totalItems} {totalItems === 1 ? 'item' : 'items'})
                  </Typography>
                  <Typography
                    variant="h5"
                    color="primary.main"
                    sx={{ fontWeight: 'bold' }}
                  >
                    ${finalTotal.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Delivery Address Form */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <LocationOnIcon />
                Delivery Address
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Street Address"
                    required
                    value={deliveryAddress.street}
                    onChange={e =>
                      setDeliveryAddress({
                        ...deliveryAddress,
                        street: e.target.value,
                      })
                    }
                    placeholder="123 Main St, Apt 4B"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="City"
                    required
                    value={deliveryAddress.city}
                    onChange={e =>
                      setDeliveryAddress({
                        ...deliveryAddress,
                        city: e.target.value,
                      })
                    }
                    placeholder="San Francisco"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <FormControl fullWidth required>
                    <InputLabel>State</InputLabel>
                    <Select
                      value={deliveryAddress.state}
                      label="State"
                      onChange={e =>
                        setDeliveryAddress({
                          ...deliveryAddress,
                          state: e.target.value,
                        })
                      }
                    >
                      <MenuItem value="CA">California</MenuItem>
                      <MenuItem value="NY">New York</MenuItem>
                      <MenuItem value="TX">Texas</MenuItem>
                      <MenuItem value="FL">Florida</MenuItem>
                      <MenuItem value="NC">North Carolina</MenuItem>
                      {/* Add more states as needed */}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    label="ZIP Code"
                    required
                    value={deliveryAddress.zip_code}
                    onChange={e =>
                      setDeliveryAddress({
                        ...deliveryAddress,
                        zip_code: e.target.value,
                      })
                    }
                    placeholder="94105"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Delivery Instructions (Optional)"
                    multiline
                    rows={2}
                    value={deliveryAddress.instructions}
                    onChange={e =>
                      setDeliveryAddress({
                        ...deliveryAddress,
                        instructions: e.target.value,
                      })
                    }
                    placeholder="Ring doorbell twice, leave at door if no answer"
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Payment & Notes */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <PaymentIcon />
                Payment & Notes
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                Payment Method: Cash on Delivery
              </Alert>

              <TextField
                fullWidth
                label="Special Instructions (Optional)"
                multiline
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any special requests for the restaurant..."
                sx={{ mb: 2 }}
              />

              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Tip Amount</InputLabel>
                <Select
                  value={tipAmount}
                  label="Tip Amount"
                  onChange={e => setTipAmount(Number(e.target.value))}
                >
                  <MenuItem value={0}>No Tip</MenuItem>
                  <MenuItem value={2}>$2.00</MenuItem>
                  <MenuItem value={3}>$3.00</MenuItem>
                  <MenuItem value={5}>$5.00</MenuItem>
                  <MenuItem value={7}>$7.00</MenuItem>
                  <MenuItem value={10}>$10.00</MenuItem>
                </Select>
              </FormControl>
            </Paper>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
          </Grid>

          {/* Sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ position: 'sticky', top: 20 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Order Summary
                </Typography>

                <Typography
                  variant="h4"
                  color="primary.main"
                  sx={{ fontWeight: 'bold', mb: 2 }}
                >
                  ${finalTotal.toFixed(2)}
                </Typography>

                <Typography variant="body2" color="text.secondary" paragraph>
                  Cash on delivery • Estimated delivery time: 30-45 minutes
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" color="text.secondary" paragraph>
                  Your order will be confirmed by the restaurant and assigned to
                  a delivery driver.
                </Typography>

                <Box sx={{ mt: 3 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => router.push('/user/restaurants')}
                    sx={{ mb: 2 }}
                    disabled={isSubmitting}
                  >
                    Continue Shopping
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handlePlaceOrder}
                    disabled={!isFormValid() || isSubmitting}
                    startIcon={
                      isSubmitting ? (
                        <CircularProgress size={20} />
                      ) : (
                        <ShoppingBagIcon />
                      )
                    }
                    sx={{ position: 'relative' }}
                  >
                    {isSubmitting
                      ? 'Placing Order...'
                      : `Place Order - $${finalTotal.toFixed(2)}`}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Success Snackbar */}
        <Snackbar
          open={showSuccess}
          autoHideDuration={6000}
          onClose={() => setShowSuccess(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setShowSuccess(false)}
            severity="success"
            sx={{ width: '100%' }}
          >
            Order placed successfully! Redirecting to order details...
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}
