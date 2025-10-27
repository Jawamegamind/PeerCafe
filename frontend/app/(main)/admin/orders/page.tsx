'use client';

import * as React from 'react';
import {
  Box,
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
  Button,
  Breadcrumbs,
  Link,
  Divider,
  CircularProgress,
  TextField,
  Snackbar,
  Alert,
} from '@mui/material';
import Navbar from '../../../_components/navbar';
import { useRouter } from 'next/navigation';

interface OrderItem {
  item_id: number;
  item_name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface Order {
  order_id: string;
  user_id: string;
  restaurant_id: number;
  order_items: OrderItem[];
  delivery_address: any;
  notes?: string;
  subtotal: number;
  tax_amount: number;
  delivery_fee: number;
  tip_amount: number;
  discount_amount: number;
  total_amount: number;
  status: string;
  created_at?: string;
}

interface Restaurant {
  restaurant_id: number;
  name: string;
}

const STATUS_PRIORITY = [
  'pending', // Flow: pending_accept ~ pending
  'confirmed', // accepted
  'ready',
  'picked_up',
  'delivered',
];

export default function AdminOrdersPage() {
  const router = useRouter();
  // API base can be configured via NEXT_PUBLIC_API_URL (e.g. http://localhost:8000/api)
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [restaurants, setRestaurants] = React.useState<Restaurant[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState('');
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, restaurantsRes] = await Promise.all([
        fetch(`${API_BASE}/orders`),
        fetch(`${API_BASE}/restaurants`),
      ]);

      if (!ordersRes.ok) throw new Error('Failed to fetch orders');
      if (!restaurantsRes.ok) throw new Error('Failed to fetch restaurants');

      const ordersData = await ordersRes.json();
      const restaurantsData = await restaurantsRes.json();

      setOrders(ordersData);
      setRestaurants(restaurantsData);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to load data', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getRestaurantName = (restaurant_id: number) => {
    const r = restaurants.find(r => r.restaurant_id === restaurant_id);
    return r ? r.name : `#${restaurant_id}`;
  };

  const updateOrderStatus = async (order_id: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${order_id}/status?new_status=${newStatus}`, {
        method: 'PATCH',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to update order');
      }

      const updated = await res.json();
      setOrders(prev => prev.map(o => (o.order_id === updated.order_id ? updated : o)));
      setSnackbar({ open: true, message: `Order ${order_id} updated to ${newStatus}`, severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to update order', severity: 'error' });
    }
  };

  const filtered = React.useMemo(() => {
    const lower = filter.trim().toLowerCase();
    let list = orders.map(o => ({ ...o, restaurant_name: getRestaurantName(o.restaurant_id) } as any));

    if (lower) {
      list = list.filter((o: any) => o.restaurant_name.toLowerCase().includes(lower));
    }

    // sort by status priority, then created_at desc
    list.sort((a: any, b: any) => {
      const pa = STATUS_PRIORITY.indexOf(a.status);
      const pb = STATUS_PRIORITY.indexOf(b.status);
      const spa = pa === -1 ? STATUS_PRIORITY.length : pa;
      const spb = pb === -1 ? STATUS_PRIORITY.length : pb;
      if (spa !== spb) return spa - spb;

      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

    return list;
  }, [orders, restaurants, filter]);

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link color="inherit" href="/admin/dashboard" sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            Admin Dashboard
          </Link>
          <Typography color="text.primary">Orders</Typography>
        </Breadcrumbs>

        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" color="primary.main" fontWeight="bold">Order Management</Typography>
            <TextField label="Filter by restaurant" value={filter} onChange={e => setFilter(e.target.value)} size="small" />
          </Box>

          <Divider sx={{ mb: 3 }} />

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell><strong>Order ID</strong></TableCell>
                    <TableCell><strong>Restaurant</strong></TableCell>
                    <TableCell><strong>Total</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Created</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography variant="body1" color="text.secondary">No orders found.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((order: any) => (
                      <TableRow key={order.order_id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{order.order_id}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={order.restaurant_name} size="small" color="primary" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">${order.total_amount?.toFixed?.(2) ?? order.total_amount}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={order.status} size="small" color="default" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{order.created_at ? new Date(order.created_at).toLocaleString() : '-'}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            {order.status === 'pending' && (
                              <Button size="small" variant="contained" color="primary" onClick={() => updateOrderStatus(order.order_id, 'confirmed')}>Accept</Button>
                            )}

                            {(order.status === 'confirmed' || order.status === 'preparing') && (
                              <Button size="small" variant="contained" color="success" onClick={() => updateOrderStatus(order.order_id, 'ready')}>Mark Ready</Button>
                            )}

                            <Button size="small" variant="outlined" onClick={() => router.push(`/admin/restaurants/${order.restaurant_id}`)}>View Restaurant</Button>

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

        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
        </Snackbar>
      </Container>
    </>
  );
}
