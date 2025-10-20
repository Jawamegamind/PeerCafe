"use client"

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
  Grid
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ShoppingBag as ShoppingBagIcon,
  Restaurant as RestaurantIcon,
  Receipt as ReceiptIcon,
  Construction as ConstructionIcon
} from '@mui/icons-material';
import Navbar from "../../../_components/navbar";
import { useCart } from '../../../_contexts/CartContext';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, restaurant, totalItems, totalPrice, isCartEmpty } = useCart();

  // If cart is empty, show message
  if (isCartEmpty) {
    return (
      <Box>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <ShoppingBagIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
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
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Checkout
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Order Summary */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                          <Typography component="span" variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                            {item.ItemName}
                          </Typography>
                        }
                        secondary={
                          <Typography component="span" variant="body2" color="text.secondary">
                            ${item.Price.toFixed(2)} × {item.quantity}
                          </Typography>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Typography component="span" variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          ${(item.Price * item.quantity).toFixed(2)}
                        </Typography>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < items.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />

              {/* Total */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  Total ({totalItems} {totalItems === 1 ? 'item' : 'items'})
                </Typography>
                <Typography variant="h5" color="primary.main" sx={{ fontWeight: 'bold' }}>
                  ${totalPrice.toFixed(2)}
                </Typography>
              </Box>
            </Paper>

            {/* Coming Soon Notice */}
            <Alert 
              severity="info" 
              icon={<ConstructionIcon />}
              sx={{ mb: 3 }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                Checkout Functionality Coming Soon!
              </Typography>
              <Typography variant="body2">
                We're working hard to bring you a seamless checkout experience. 
                Payment processing, delivery options, and order tracking will be available soon.
              </Typography>
            </Alert>
          </Grid>

          {/* Sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ position: 'sticky', top: 20 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  What's Next?
                </Typography>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  This is a demonstration of the cart functionality. The complete checkout process will include:
                </Typography>
                
                <List dense>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText 
                      primary="Payment Processing"
                      secondary="Secure payment with multiple options"
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText 
                      primary="Delivery Options"
                      secondary="Choose pickup or delivery"
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText 
                      primary="Order Tracking"
                      secondary="Real-time updates on your order"
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText 
                      primary="Order History"
                      secondary="Track past orders and reorder favorites"
                    />
                  </ListItem>
                </List>

                <Box sx={{ mt: 3 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => router.push('/user/restaurants')}
                    sx={{ mb: 1 }}
                  >
                    Continue Shopping
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    disabled
                    startIcon={<ShoppingBagIcon />}
                  >
                    Place Order (Coming Soon)
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}