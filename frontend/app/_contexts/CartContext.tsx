'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// Define interfaces
export interface CartItem {
  id: number;
  ItemName: string;
  Price: number;
  quantity: number;
  Image?: string;
  restaurantId: number;
  restaurantName: string;
}

export interface Restaurant {
  id: number;
  name: string;
}

interface CartContextType {
  items: CartItem[];
  restaurant: Restaurant | null;
  totalItems: number;
  totalPrice: number;
  addToCart: (item: Omit<CartItem, 'quantity'>) => boolean;
  removeFromCart: (itemId: number) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  clearCart: () => void;
  clearCartAndAddItem: (item: Omit<CartItem, 'quantity'>) => void;
  isCartEmpty: boolean;
}

// Create context
const CartContext = createContext<CartContextType | undefined>(undefined);

// Custom hook to use cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// Cart Provider Component
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  // Load cart from localStorage on component mount
  useEffect(() => {
    const savedCart = localStorage.getItem('peerCafeCart');
    const savedRestaurant = localStorage.getItem('peerCafeCartRestaurant');

    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }

    if (savedRestaurant) {
      try {
        setRestaurant(JSON.parse(savedRestaurant));
      } catch (error) {
        console.error('Error loading restaurant from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('peerCafeCart', JSON.stringify(items));
    if (restaurant) {
      localStorage.setItem(
        'peerCafeCartRestaurant',
        JSON.stringify(restaurant)
      );
    } else {
      localStorage.removeItem('peerCafeCartRestaurant');
    }
  }, [items, restaurant]);

  // Add item to cart
  const addToCart = (newItem: Omit<CartItem, 'quantity'>): boolean => {
    // Check if cart is empty
    if (items.length === 0) {
      // Cart is empty, add the item and set restaurant
      setItems([{ ...newItem, quantity: 1 }]);
      setRestaurant({
        id: newItem.restaurantId,
        name: newItem.restaurantName,
      });
      return true;
    }

    // Check if the new item is from the same restaurant as items already in cart
    if (restaurant?.id !== newItem.restaurantId) {
      // Different restaurant - return false to indicate failure
      return false;
    }

    // Same restaurant - check if item already exists in cart
    setItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(
        item => item.id === newItem.id
      );

      if (existingItemIndex > -1) {
        // If item exists, increase quantity
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += 1;
        return updatedItems;
      } else {
        // If item doesn't exist, add new item with quantity 1
        return [...prevItems, { ...newItem, quantity: 1 }];
      }
    });

    return true;
  };

  // Remove item from cart
  const removeFromCart = (itemId: number) => {
    setItems(prevItems => {
      const updatedItems = prevItems.filter(item => item.id !== itemId);

      // If cart becomes empty, clear restaurant
      if (updatedItems.length === 0) {
        setRestaurant(null);
      }

      return updatedItems;
    });
  };

  // Update item quantity
  const updateQuantity = (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setItems(prevItems =>
      prevItems.map(item => (item.id === itemId ? { ...item, quantity } : item))
    );
  };

  // Clear entire cart
  const clearCart = () => {
    setItems([]);
    setRestaurant(null);
  };

  // Clear cart and add new item atomically
  const clearCartAndAddItem = (newItem: Omit<CartItem, 'quantity'>) => {
    // Clear current cart and add new item with its restaurant in one operation
    setItems([{ ...newItem, quantity: 1 }]);
    setRestaurant({
      id: newItem.restaurantId,
      name: newItem.restaurantName,
    });
  };

  // Calculate totals
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.Price * item.quantity,
    0
  );
  const isCartEmpty = items.length === 0;

  const value: CartContextType = {
    items,
    restaurant,
    totalItems,
    totalPrice,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    clearCartAndAddItem,
    isCartEmpty,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
