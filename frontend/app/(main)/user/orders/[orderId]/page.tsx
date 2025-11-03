'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Receipt as ReceiptIcon,
  // Restaurant as RestaurantIcon,
  LocationOn as LocationOnIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  LocalShipping as LocalShippingIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import Navbar from '../../../../_components/navbar';
import { createClient } from '@/utils/supabase/client';

// Interfaces
interface OrderItem {
  item_id: number;
  item_name: string;
  price: number;
  quantity: number;
  subtotal: number;
  special_instructions?: string;
}

interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  zip_code: string;
  instructions?: string;
}

interface Order {
  order_id: string;
  user_id: string;
  restaurant_id: number;
  delivery_user_id?: string;
  order_items: OrderItem[];
  delivery_address: DeliveryAddress;
  payment_method: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  delivery_fee: number;
  tip_amount: number;
  discount_amount: number;
  total_amount: number;
  notes?: string;
  estimated_pickup_time?: string;
  estimated_delivery_time?: string;
  actual_pickup_time?: string;
  actual_delivery_time?: string;
  created_at: string;
  updated_at: string;
  delivery_code?: string | null;
  delivery_code_used?: boolean | null;
}

// Status configuration
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'pending':
      return {
        label: 'Order Pending',
        color: 'warning' as const,
        progress: 10,
      };
    case 'confirmed':
      return { label: 'Order Confirmed', color: 'info' as const, progress: 25 };
    case 'preparing':
      return {
        label: 'Preparing Your Food',
        color: 'primary' as const,
        progress: 50,
      };
    case 'ready':
      return {
        label: 'Ready for Pickup',
        color: 'primary' as const,
        progress: 70,
      };
    case 'assigned':
      return {
        label: 'Delivery Driver Assigned',
        color: 'primary' as const,
        progress: 75,
      };
    case 'picked_up':
      return {
        label: 'Order Picked Up',
        color: 'primary' as const,
        progress: 85,
      };
    case 'en_route':
      return { label: 'On the Way', color: 'primary' as const, progress: 90 };
    case 'delivered':
      return { label: 'Delivered', color: 'success' as const, progress: 100 };
    case 'cancelled':
      return { label: 'Cancelled', color: 'error' as const, progress: 0 };
    default:
      return {
        label: 'Unknown Status',
        color: 'default' as const,
        progress: 0,
      };
  }
};

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const supabase = createClient();

  const [order, setOrder] = React.useState<Order | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [authLoading, setAuthLoading] = React.useState<boolean>(true);

  // Check authentication first
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
          setError('You must be logged in to view this order');
          router.push('/login');
          return;
        }

        // Fetch user details from users table
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

  // Fetch order details
  React.useEffect(() => {
    const fetchOrder = async () => {
      if (!currentUser) return; // Wait for authentication

      try {
        const response = await fetch(
          `http://localhost:8000/api/orders/${orderId}`
        );

        if (!response.ok) {
          throw new Error('Order not found');
        }

        const orderData = await response.json();

        // Verify the order belongs to the current user
        if (orderData.user_id !== currentUser.user_id) {
          setError('You do not have permission to view this order');
          return;
        }

        setOrder(orderData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    if (orderId && currentUser && !authLoading) {
      fetchOrder();
    }
  }, [orderId, currentUser, authLoading]);

  // Auto refresh order status every 30 seconds for pending orders
  React.useEffect(() => {
    if (
      !order ||
      !currentUser ||
      order.status === 'delivered' ||
      order.status === 'cancelled'
    ) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/orders/${orderId}`
        );
        if (response.ok) {
          const updatedOrder = await response.json();
          // Verify the order still belongs to the current user
          if (updatedOrder.user_id === currentUser.user_id) {
            setOrder(updatedOrder);
          }
        }
      } catch {
        setError('Failed to refresh order status');
        // console.error('Error refreshing order status:', err);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [order, orderId, currentUser]);

  if (loading || authLoading) {
    return (
      <Box>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={64} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              {authLoading
                ? 'Verifying your account...'
                : 'Loading order details...'}
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  if (error || !order) {
    return (
      <Box>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" color="error" gutterBottom>
              Order Not Found
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              {error || 'The order you are looking for could not be found.'}
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push('/user/restaurants')}
            >
              Browse Restaurants
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  const statusConfig = getStatusConfig(order.status);
  const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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
          <Box>
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 'bold', color: 'primary.main' }}
            >
              Order #{order.order_id.slice(-8)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Placed on {orderDate}
            </Typography>
          </Box>
        </Box>

        {/* Order Status */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <CheckCircleIcon />
              Order Status
            </Typography>
            <Chip
              label={statusConfig.label}
              color={statusConfig.color}
              icon={
                order.status === 'delivered' ? (
                  <CheckCircleIcon />
                ) : (
                  <ScheduleIcon />
                )
              }
            />
          </Box>

          <LinearProgress
            variant="determinate"
            value={statusConfig.progress}
            sx={{ mb: 2, height: 8, borderRadius: 4 }}
          />

          {order.estimated_delivery_time && (
            <Typography variant="body2" color="text.secondary">
              Estimated delivery:{' '}
              {new Date(order.estimated_delivery_time).toLocaleTimeString(
                'en-US',
                {
                  hour: '2-digit',
                  minute: '2-digit',
                }
              )}
            </Typography>
          )}
        </Paper>

        <Grid container spacing={3}>
          {/* Order Details */}
          <Grid size={{ xs: 12, md: 8 }}>
            {/* Items */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <ReceiptIcon />
                Order Items
              </Typography>

              <List>
                {order.order_items.map((item, index) => (
                  <React.Fragment key={item.item_id}>
                    <ListItem sx={{ px: 0, py: 2 }}>
                      <ListItemText
                        primary={
                          <Typography
                            component="span"
                            variant="subtitle1"
                            sx={{ fontWeight: 'medium' }}
                          >
                            {item.item_name}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.secondary"
                            >
                              ${item.price.toFixed(2)} × {item.quantity}
                            </Typography>
                            {item.special_instructions && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontStyle: 'italic', mt: 0.5 }}
                              >
                                Note: {item.special_instructions}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Typography
                          component="span"
                          variant="subtitle1"
                          sx={{ fontWeight: 'bold' }}
                        >
                          ${item.subtotal.toFixed(2)}
                        </Typography>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < order.order_items.length - 1 && <Divider />}
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
                  <Typography>${order.subtotal.toFixed(2)}</Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <Typography>Tax</Typography>
                  <Typography>${order.tax_amount.toFixed(2)}</Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <Typography>Delivery Fee</Typography>
                  <Typography>${order.delivery_fee.toFixed(2)}</Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <Typography>Tip</Typography>
                  <Typography>${order.tip_amount.toFixed(2)}</Typography>
                </Box>
                {order.discount_amount > 0 && (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Typography>Discount</Typography>
                    <Typography color="success.main">
                      -${order.discount_amount.toFixed(2)}
                    </Typography>
                  </Box>
                )}
                <Divider sx={{ my: 1 }} />
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Total
                  </Typography>
                  <Typography
                    variant="h5"
                    color="primary.main"
                    sx={{ fontWeight: 'bold' }}
                  >
                    ${order.total_amount.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Delivery Address */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <LocationOnIcon />
                Delivery Address
              </Typography>

              <Typography variant="body1">
                {order.delivery_address.street}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {order.delivery_address.city}, {order.delivery_address.state}{' '}
                {order.delivery_address.zip_code}
              </Typography>

              {order.delivery_address.instructions && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1, fontStyle: 'italic' }}
                >
                  Instructions: {order.delivery_address.instructions}
                </Typography>
              )}
            </Paper>

            {/* Payment & Notes */}
            <Paper sx={{ p: 3 }}>
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

              {order.notes && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
                    Special Instructions:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.notes}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ position: 'sticky', top: 20 }}>
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <LocalShippingIcon />
                  Delivery Info
                </Typography>

                <Typography variant="body2" color="text.secondary" paragraph>
                  Your order is being carefully prepared and will be delivered
                  as soon as possible.
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
                    Order ID
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.order_id}
                  </Typography>
                </Box>

                {order.delivery_user_id && (
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 'medium' }}
                    >
                      Delivery Driver
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Assigned
                    </Typography>
                  </Box>
                )}

                {order.delivery_code && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
                      Delivery Code
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {order.delivery_code} {order.delivery_code_used ? '(used)' : ''}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ mt: 3 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => router.push('/user/restaurants')}
                    sx={{ mb: 1 }}
                  >
                    Order Again
                  </Button>
                  {order.status !== 'delivered' &&
                    order.status !== 'cancelled' && (
                      <Button
                        fullWidth
                        variant="contained"
                        color="error"
                        disabled={
                          order.status !== 'pending' &&
                          order.status !== 'confirmed'
                        }
                      >
                        Cancel Order
                      </Button>
                    )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
