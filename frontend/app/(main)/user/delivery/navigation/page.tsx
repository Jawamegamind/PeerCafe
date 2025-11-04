'use client';

import * as React from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Typography,
  Alert,
} from '@mui/material';
import NavigationMap from '../NavigationMap';
import { createClient } from '@/utils/supabase/client';

const backend_url =
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

interface ActiveOrder {
  order_id: string;
  status: string;
  restaurants: {
    name: string;
    address: string;
  };
}

export default function DeliveryNavigationPage() {
  const supabase = createClient();

  const [loading, setLoading] = React.useState(true);
  const [activeOrder, setActiveOrder] = React.useState<ActiveOrder | null>(
    null
  );
  const [error, setError] = React.useState<string | null>(null);

  const loadActiveOrder = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setError('Please log in to access navigation.');
        setActiveOrder(null);
        return;
      }

      const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('order_id, status, restaurants(name, address)')
        .eq('delivery_user_id', user.id)
        .in('status', ['assigned', 'picked_up', 'en_route'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (orderError) {
        setError('Failed to load active order.');
        setActiveOrder(null);
        return;
      }

      if (!orders || orders.length === 0) {
        setActiveOrder(null);
      } else {
        const o = orders[0];
        const r = Array.isArray(o.restaurants)
          ? o.restaurants[0]
          : o.restaurants;
        setActiveOrder({
          order_id: o.order_id,
          status: o.status,
          restaurants: {
            name: r?.name || '',
            address: r?.address || '',
          },
        });
      }
    } catch {
      setError('Unexpected error loading data.');
      setActiveOrder(null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  React.useEffect(() => {
    loadActiveOrder();
  }, [loadActiveOrder]);

  // Called by child (NavigationMap) when realtime updates indicate order changed
  const handleOrderUpdated = React.useCallback(
    (updatedOrder: any) => {
      setActiveOrder(prev => {
        if (!prev) return prev;
        if (prev.order_id !== updatedOrder.order_id) return prev;
        return {
          ...prev,
          status:
            updatedOrder.order_status || updatedOrder.status || prev.status,
        };
      });

      // If order went to a terminal state, refresh active order list
      if (
        updatedOrder.order_status === 'delivered' ||
        updatedOrder.status === 'delivered'
      ) {
        // Refresh list to pick up next active order (if any)
        loadActiveOrder();
      }
    },
    [loadActiveOrder]
  );

  const handleMarkPickedUp = async () => {
    if (!activeOrder) return;
    try {
      await axios.patch(
        `${backend_url}/api/orders/${activeOrder.order_id}/status?new_status=picked_up`
      );
      setActiveOrder(prev => (prev ? { ...prev, status: 'picked_up' } : prev));
    } catch {
      setError('Failed to mark picked up. Please try again.');
    }
  };

  const handleMarkDelivered = async () => {
    if (!activeOrder) return;
    // Delivery verification is handled by the NavigationMap child, which will
    // call the verify endpoint and then invoke this callback on success.
    try {
      setActiveOrder(null);
      await loadActiveOrder();
    } catch {
      setError('Failed to refresh order state after delivery.');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h5" fontWeight={700}>
          Delivery Navigation
        </Typography>
        <Button component={Link} href="/user/delivery" variant="outlined">
          Back to Orders
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="50vh"
        >
          <CircularProgress />
        </Box>
      )}

      {!loading && !activeOrder && (
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography>
              No active delivery found. Accept an order first.
            </Typography>
            <Button
              component={Link}
              href="/user/delivery"
              sx={{ mt: 2 }}
              variant="contained"
            >
              Go to Delivery Page
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && activeOrder && (
        <Box>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600}>
                {activeOrder.restaurants.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Order #{activeOrder.order_id.substring(0, 8)}...
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Status: {activeOrder.status.toUpperCase()}
              </Typography>
            </CardContent>
          </Card>

          <NavigationMap
            orderId={activeOrder.order_id}
            orderStatus={activeOrder.status}
            onMarkPickedUp={handleMarkPickedUp}
            onMarkDelivered={handleMarkDelivered}
            onOrderUpdated={handleOrderUpdated}
          />
        </Box>
      )}
    </Container>
  );
}
