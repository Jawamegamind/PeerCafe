"use client"

import * as React from 'react';
import Navbar from "../../../_components/navbar";
import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  CircularProgress,
  Button,
  Avatar,
  Stack
} from '@mui/material';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'assigned'
  | 'picked_up'
  | 'en_route'
  | 'delivered'
  | 'cancelled';

interface OrderListItem {
  order_id: string;
  restaurant_id: number;
  user_id: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000';

function statusChip(status: OrderStatus) {
  const map: Record<OrderStatus, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' }>
    = {
      pending: { label: 'Pending', color: 'warning' },
      confirmed: { label: 'Confirmed', color: 'info' },
      preparing: { label: 'Preparing', color: 'primary' },
      ready: { label: 'Ready', color: 'primary' },
      assigned: { label: 'Driver Assigned', color: 'primary' },
      picked_up: { label: 'Picked Up', color: 'primary' },
      en_route: { label: 'En Route', color: 'primary' },
      delivered: { label: 'Delivered', color: 'success' },
      cancelled: { label: 'Cancelled', color: 'error' }
    };
  const cfg = map[status] || { label: status, color: 'default' as const };
  return <Chip size="small" color={cfg.color} label={cfg.label} />;
}

export default function MyOrdersPage() {
  const supabase = createClient();
  const [loading, setLoading] = React.useState(true);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [orders, setOrders] = React.useState<OrderListItem[]>([]);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [filter, setFilter] = React.useState<'active' | 'final'>('active');

  React.useEffect(() => {
    const init = async () => {
      try {
        setAuthLoading(true);
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) {
          setError('Please log in to view your orders.');
          return;
        }
        setCurrentUser(user);

        // Get access token for backend Authorization header
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) {
          setError('Could not get session token. Please re-login.');
          return;
        }

        setLoading(true);
        const res = await fetch(`${backendUrl}/api/orders/me?limit=50`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || 'Failed to load orders');
        }
        const data: OrderListItem[] = await res.json();

        // Sort so that active orders (assigned/picked_up/en_route) appear first,
        // then in-progress (ready/confirmed/preparing/pending), then delivered/cancelled.
        const priority: Record<OrderStatus, number> = {
          // Top bucket: treat all non-final states equally important
          assigned: 0,
          picked_up: 0,
          en_route: 0,
          ready: 0,
          confirmed: 0,
          preparing: 0,
          pending: 0,
          // Final/terminal states
          delivered: 2,
          cancelled: 3,
        };

        const sorted = (Array.isArray(data) ? data : []).slice().sort((a, b) => {
          const pa = priority[a.status] ?? 99;
          const pb = priority[b.status] ?? 99;
          if (pa !== pb) return pa - pb;
          // Newer first within same priority bucket
          const ta = new Date(a.created_at).getTime();
          const tb = new Date(b.created_at).getTime();
          return tb - ta;
        });

        setOrders(sorted);
      } catch (e: any) {
        console.error('Failed to fetch orders:', e);
        setError(e?.message || 'Failed to load orders');
      } finally {
        setAuthLoading(false);
        setLoading(false);
      }
    };
    void init();
  }, [supabase]);

  const isTerminal = (status: OrderStatus) => status === 'delivered' || status === 'cancelled';
  const visibleOrders = React.useMemo(() => {
    if (!orders || orders.length === 0) return [] as OrderListItem[];
    return orders.filter(o => filter === 'active' ? !isTerminal(o.status) : isTerminal(o.status));
  }, [orders, filter]);

  return (
    <Box>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            My Orders
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant={filter === 'active' ? 'contained' : 'outlined'}
              onClick={() => setFilter('active')}
            >
              Active
            </Button>
            <Button
              variant={filter === 'final' ? 'contained' : 'outlined'}
              onClick={() => setFilter('final')}
            >
              Completed
            </Button>
            <Button component={Link} href="/user/restaurants" variant="outlined">Order food</Button>
          </Box>
        </Box>

        {(authLoading || loading) && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={48} />
            <Typography sx={{ mt: 2 }}>Loading your orders…</Typography>
          </Paper>
        )}

        {!loading && error && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="error" variant="h6" gutterBottom>
              {error}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Make sure you are logged in.
            </Typography>
            <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1 }}>
              <Button component={Link} href="/login" variant="contained">Login</Button>
              <Button component={Link} href="/register" variant="text">Create account</Button>
            </Stack>
          </Paper>
        )}

        {!loading && !error && orders.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6">No orders yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              When you place an order, it will appear here.
            </Typography>
            <Button component={Link} href="/user/restaurants" variant="contained" sx={{ mt: 2 }}>
              Browse restaurants
            </Button>
          </Paper>
        )}

        {!loading && !error && orders.length > 0 && (
          <Paper sx={{ p: 0 }}>
            <List>
              {visibleOrders.map((o, idx) => (
                <React.Fragment key={o.order_id}>
                  <ListItem
                    component={Link}
                    href={`/user/orders/${o.order_id}`}
                    sx={{
                      py: 2,
                      '&:hover': { backgroundColor: 'action.hover' },
                    }}
                  >
                    <Avatar sx={{ mr: 2 }}>{o.restaurant_id}</Avatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Order #{o.order_id.slice(-8)}
                          </Typography>
                          {statusChip(o.status)}
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          Placed {new Date(o.created_at).toLocaleString()}
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        ${o.total_amount.toFixed(2)}
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {idx < visibleOrders.length - 1 && <Divider />}
                </React.Fragment>
              ))}
              {visibleOrders.length === 0 && (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {filter === 'active' ? 'No active orders right now.' : 'No completed orders yet.'}
                  </Typography>
                </Box>
              )}
            </List>
          </Paper>
        )}
      </Container>
    </Box>
  );
}
