'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Popover,
  Paper,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  // Badge,
  Chip,
} from '@mui/material';
import {
  ShoppingCart as CartIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  ShoppingBag as CheckoutIcon,
} from '@mui/icons-material';
import { useCart } from '../_contexts/CartContext';

interface CartDropdownProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
}

export const CartDropdown: React.FC<CartDropdownProps> = ({
  anchorEl,
  open,
  onClose,
}) => {
  const {
    items,
    restaurant,
    totalItems,
    totalPrice,
    updateQuantity,
    removeFromCart,
    clearCart,
    isCartEmpty,
  } = useCart();
  const router = useRouter();

  const handleCheckout = () => {
    router.push('/user/checkout');
    onClose();
  };

  const handleItemQuantityChange = (
    itemId: number,
    currentQuantity: number,
    change: number
  ) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity > 0) {
      updateQuantity(itemId, newQuantity);
    } else {
      removeFromCart(itemId);
    }
  };

  const handleRemoveItem = (itemId: number) => {
    removeFromCart(itemId);
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      slotProps={{
        paper: {
          sx: {
            width: 400,
            maxHeight: 500,
            mt: 1,
          },
        },
      }}
    >
      <Paper elevation={3} sx={{ p: 2 }}>
        {/* Header */}
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
            <CartIcon />
            Your Cart
          </Typography>
          {!isCartEmpty && (
            <Button
              size="small"
              onClick={clearCart}
              color="error"
              variant="outlined"
            >
              Clear Cart
            </Button>
          )}
        </Box>

        {/* Restaurant Info */}
        {restaurant && (
          <Box sx={{ mb: 2 }}>
            <Chip
              label={`From: ${restaurant.name}`}
              color="primary"
              size="small"
              variant="outlined"
            />
          </Box>
        )}

        {/* Cart Items */}
        {isCartEmpty ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CartIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Your cart is empty
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add items from a restaurant to get started
            </Typography>
          </Box>
        ) : (
          <>
            <List sx={{ maxHeight: 250, overflow: 'auto' }}>
              {items.map((item, index) => (
                <React.Fragment key={item.id}>
                  <ListItem sx={{ px: 0, py: 1 }}>
                    <ListItemText
                      primary={
                        <Typography
                          component="span"
                          variant="subtitle2"
                          sx={{ fontWeight: 'medium' }}
                        >
                          {item.ItemName}
                        </Typography>
                      }
                      secondary={
                        <Box component="div">
                          <Typography
                            component="span"
                            variant="body2"
                            color="primary.main"
                            sx={{ fontWeight: 'medium', display: 'block' }}
                          >
                            ${item.Price.toFixed(2)} each
                          </Typography>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              mt: 0.5,
                            }}
                          >
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleItemQuantityChange(
                                  item.id,
                                  item.quantity,
                                  -1
                                )
                              }
                            >
                              <RemoveIcon fontSize="small" />
                            </IconButton>
                            <Typography
                              component="span"
                              variant="body2"
                              sx={{ minWidth: 20, textAlign: 'center' }}
                            >
                              {item.quantity}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleItemQuantityChange(
                                  item.id,
                                  item.quantity,
                                  1
                                )
                              }
                            >
                              <AddIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: 0.5,
                        }}
                      >
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{ fontWeight: 'bold' }}
                        >
                          ${(item.Price * item.quantity).toFixed(2)}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveItem(item.id)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < items.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>

            <Divider sx={{ my: 2 }} />

            {/* Total */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Typography variant="h6">
                Total ({totalItems} {totalItems === 1 ? 'item' : 'items'})
              </Typography>
              <Typography
                variant="h6"
                color="primary.main"
                sx={{ fontWeight: 'bold' }}
              >
                ${totalPrice.toFixed(2)}
              </Typography>
            </Box>

            {/* Checkout Button */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<CheckoutIcon />}
              onClick={handleCheckout}
              sx={{ py: 1.5 }}
            >
              Proceed to Checkout
            </Button>
          </>
        )}
      </Paper>
    </Popover>
  );
};

export default CartDropdown;
