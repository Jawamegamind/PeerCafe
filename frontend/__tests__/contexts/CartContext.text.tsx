import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  CartProvider,
  useCart,
  CartItem,
} from '../../app/_contexts/CartContext';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Helper function to render hook with CartProvider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);

// Sample test data
const sampleItem1: Omit<CartItem, 'quantity'> = {
  id: 1,
  ItemName: 'Pizza Margherita',
  Price: 12.99,
  Image: '/pizza.jpg',
  restaurantId: 100,
  restaurantName: 'Italian Restaurant',
};

const sampleItem2: Omit<CartItem, 'quantity'> = {
  id: 2,
  ItemName: 'Caesar Salad',
  Price: 8.99,
  restaurantId: 100,
  restaurantName: 'Italian Restaurant',
};

const differentRestaurantItem: Omit<CartItem, 'quantity'> = {
  id: 3,
  ItemName: 'Sushi Roll',
  Price: 15.99,
  restaurantId: 200,
  restaurantName: 'Japanese Restaurant',
};

describe('CartContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('useCart hook', () => {
    it('should throw error when used outside CartProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useCart());
      }).toThrow('useCart must be used within a CartProvider');

      consoleSpy.mockRestore();
    });

    it('should return cart context when used within CartProvider', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.items).toEqual([]);
      expect(result.current.restaurant).toBeNull();
      expect(result.current.totalItems).toBe(0);
      expect(result.current.totalPrice).toBe(0);
      expect(result.current.isCartEmpty).toBe(true);
    });
  });

  describe('Initial state', () => {
    it('should initialize with empty cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current.items).toEqual([]);
      expect(result.current.restaurant).toBeNull();
      expect(result.current.totalItems).toBe(0);
      expect(result.current.totalPrice).toBe(0);
      expect(result.current.isCartEmpty).toBe(true);
    });

    it('should load cart from localStorage on mount', async () => {
      const savedCart = [{ ...sampleItem1, quantity: 2 }];
      const savedRestaurant = { id: 100, name: 'Italian Restaurant' };

      localStorageMock.setItem('peerCafeCart', JSON.stringify(savedCart));
      localStorageMock.setItem(
        'peerCafeCartRestaurant',
        JSON.stringify(savedRestaurant)
      );

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.items).toEqual(savedCart);
        expect(result.current.restaurant).toEqual(savedRestaurant);
        expect(result.current.totalItems).toBe(2);
      });
    });

    it('should handle corrupted localStorage data gracefully', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      localStorageMock.setItem('peerCafeCart', 'invalid-json');
      localStorageMock.setItem('peerCafeCartRestaurant', 'invalid-json');

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.items).toEqual([]);
        expect(result.current.restaurant).toBeNull();
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('addToCart', () => {
    it('should add item to empty cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        const success = result.current.addToCart(sampleItem1);
        expect(success).toBe(true);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]).toEqual({ ...sampleItem1, quantity: 1 });
      expect(result.current.restaurant).toEqual({
        id: 100,
        name: 'Italian Restaurant',
      });
      expect(result.current.totalItems).toBe(1);
      expect(result.current.totalPrice).toBe(12.99);
      expect(result.current.isCartEmpty).toBe(false);
    });

    it('should add another item from same restaurant', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart(sampleItem1);
      });

      act(() => {
        const success = result.current.addToCart(sampleItem2);
        expect(success).toBe(true);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.totalItems).toBe(2);
      expect(result.current.totalPrice).toBe(21.98); // 12.99 + 8.99
    });

    it('should increase quantity if item already exists in cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart(sampleItem1);
      });

      act(() => {
        result.current.addToCart(sampleItem1);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(2);
      expect(result.current.totalItems).toBe(2);
      expect(result.current.totalPrice).toBe(25.98); // 12.99 * 2
    });

    it('should reject item from different restaurant', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart(sampleItem1);
      });

      let success: boolean = true;
      act(() => {
        success = result.current.addToCart(differentRestaurantItem);
      });

      expect(success).toBe(false);
      expect(result.current.items).toHaveLength(1);
      expect(result.current.restaurant?.id).toBe(100);
    });

    it('should save cart to localStorage after adding item', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart(sampleItem1);
      });

      await waitFor(() => {
        const savedCart = JSON.parse(
          localStorageMock.getItem('peerCafeCart') || '[]'
        );
        const savedRestaurant = JSON.parse(
          localStorageMock.getItem('peerCafeCartRestaurant') || 'null'
        );

        expect(savedCart).toHaveLength(1);
        expect(savedRestaurant.id).toBe(100);
      });
    });
  });

  describe('removeFromCart', () => {
    it('should remove item from cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart(sampleItem1);
      });

      act(() => {
        result.current.addToCart(sampleItem2);
      });

      expect(result.current.items).toHaveLength(2);

      act(() => {
        result.current.removeFromCart(1);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe(2);
      expect(result.current.totalItems).toBe(1);
    });

    it('should clear restaurant when last item is removed', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart(sampleItem1);
      });

      expect(result.current.restaurant).not.toBeNull();

      act(() => {
        result.current.removeFromCart(1);
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.restaurant).toBeNull();
      expect(result.current.isCartEmpty).toBe(true);
    });

    it('should update localStorage after removing item', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart(sampleItem1);
      });

      act(() => {
        result.current.addToCart(sampleItem2);
      });

      act(() => {
        result.current.removeFromCart(1);
      });

      await waitFor(() => {
        const savedCart = JSON.parse(
          localStorageMock.getItem('peerCafeCart') || '[]'
        );
        expect(savedCart).toHaveLength(1);
        expect(savedCart[0].id).toBe(2);
      });
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart(sampleItem1);
      });

      act(() => {
        result.current.updateQuantity(1, 5);
      });

      expect(result.current.items[0].quantity).toBe(5);
      expect(result.current.totalItems).toBe(5);
      expect(result.current.totalPrice).toBe(64.95); // 12.99 * 5
    });

    it('should remove item when quantity is set to 0', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart(sampleItem1);
      });

      act(() => {
        result.current.updateQuantity(1, 0);
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.isCartEmpty).toBe(true);
    });

    it('should remove item when quantity is negative', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart(sampleItem1);
      });

      act(() => {
        result.current.updateQuantity(1, -1);
      });

      expect(result.current.items).toHaveLength(0);
    });

    it('should not affect other items when updating quantity', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart(sampleItem1);
      });

      act(() => {
        result.current.addToCart(sampleItem2);
      });

      act(() => {
        result.current.updateQuantity(1, 3);
      });

      expect(result.current.items[0].quantity).toBe(3);
      expect(result.current.items[1].quantity).toBe(1);
    });

    it('should update localStorage after quantity change', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart(sampleItem1);
      });

      act(() => {
        result.current.updateQuantity(1, 3);
      });

      await waitFor(() => {
        const savedCart = JSON.parse(
          localStorageMock.getItem('peerCafeCart') || '[]'
        );
        expect(savedCart[0].quantity).toBe(3);
      });
    });
  });

  describe('clearCart', () => {
    it('should clear all items and restaurant', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart(sampleItem1);
      });

      act(() => {
        result.current.addToCart(sampleItem2);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.restaurant).not.toBeNull();

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.restaurant).toBeNull();
      expect(result.current.totalItems).toBe(0);
      expect(result.current.totalPrice).toBe(0);
      expect(result.current.isCartEmpty).toBe(true);
    });

    it('should remove restaurant from localStorage when clearing cart', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart(sampleItem1);
      });

      act(() => {
        result.current.clearCart();
      });

      await waitFor(() => {
        const savedRestaurant = localStorageMock.getItem(
          'peerCafeCartRestaurant'
        );
        expect(savedRestaurant).toBeNull();
      });
    });
  });

  describe('clearCartAndAddItem', () => {
    it('should clear cart and add new item from different restaurant', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart(sampleItem1);
      });

      act(() => {
        result.current.addToCart(sampleItem2);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.restaurant?.id).toBe(100);

      act(() => {
        result.current.clearCartAndAddItem(differentRestaurantItem);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe(3);
      expect(result.current.restaurant?.id).toBe(200);
      expect(result.current.restaurant?.name).toBe('Japanese Restaurant');
      expect(result.current.totalItems).toBe(1);
      expect(result.current.totalPrice).toBe(15.99);
    });

    it('should set quantity to 1 for new item', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.clearCartAndAddItem(sampleItem1);
      });

      expect(result.current.items[0].quantity).toBe(1);
    });

    it('should update localStorage atomically', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart(sampleItem1);
      });

      act(() => {
        result.current.clearCartAndAddItem(differentRestaurantItem);
      });

      await waitFor(() => {
        const savedCart = JSON.parse(
          localStorageMock.getItem('peerCafeCart') || '[]'
        );
        const savedRestaurant = JSON.parse(
          localStorageMock.getItem('peerCafeCartRestaurant') || 'null'
        );

        expect(savedCart).toHaveLength(1);
        expect(savedCart[0].id).toBe(3);
        expect(savedRestaurant.id).toBe(200);
      });
    });
  });

  describe('Calculated values', () => {
    it('should calculate totalItems correctly', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart(sampleItem1);
      });

      act(() => {
        result.current.addToCart(sampleItem1);
      });

      act(() => {
        result.current.addToCart(sampleItem2);
      });

      expect(result.current.totalItems).toBe(3); // 2 + 1
    });

    it('should calculate totalPrice correctly', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart(sampleItem1); // 12.99
      });

      act(() => {
        result.current.addToCart(sampleItem1); // 12.99
      });

      act(() => {
        result.current.addToCart(sampleItem2); // 8.99
      });

      expect(result.current.totalPrice).toBe(34.97); // (12.99 * 2) + 8.99
    });

    it('should update isCartEmpty correctly', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current.isCartEmpty).toBe(true);

      act(() => {
        result.current.addToCart(sampleItem1);
      });

      expect(result.current.isCartEmpty).toBe(false);

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.isCartEmpty).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle item without image', () => {
      const itemWithoutImage: Omit<CartItem, 'quantity'> = {
        id: 4,
        ItemName: 'Plain Item',
        Price: 5.0,
        restaurantId: 100,
        restaurantName: 'Test Restaurant',
      };

      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart(itemWithoutImage);
      });

      expect(result.current.items[0].Image).toBeUndefined();
    });

    it('should handle decimal prices correctly', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const itemWithDecimal: Omit<CartItem, 'quantity'> = {
        id: 5,
        ItemName: 'Decimal Price Item',
        Price: 10.99,
        restaurantId: 100,
        restaurantName: 'Test Restaurant',
      };

      act(() => {
        result.current.addToCart(itemWithDecimal);
        result.current.updateQuantity(5, 3);
      });

      expect(result.current.totalPrice).toBe(32.97); // 10.99 * 3
    });

    it('should handle multiple sequential operations', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart(sampleItem1);
      });

      act(() => {
        result.current.addToCart(sampleItem2);
      });

      act(() => {
        result.current.updateQuantity(1, 3);
      });

      act(() => {
        result.current.removeFromCart(2);
      });

      act(() => {
        result.current.addToCart(sampleItem2);
      });

      act(() => {
        result.current.updateQuantity(2, 2);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.items[0].quantity).toBe(3);
      expect(result.current.items[1].quantity).toBe(2);
      expect(result.current.totalItems).toBe(5);
    });
  });

  describe('localStorage persistence', () => {
    it('should persist cart state across provider remounts', async () => {
      const { result: firstMount } = renderHook(() => useCart(), { wrapper });

      act(() => {
        firstMount.current.addToCart(sampleItem1);
        firstMount.current.updateQuantity(1, 3);
      });

      // Simulate remount by creating new hook instance
      const { result: secondMount } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(secondMount.current.items).toHaveLength(1);
        expect(secondMount.current.items[0].quantity).toBe(3);
        expect(secondMount.current.restaurant?.id).toBe(100);
      });
    });

    it('should save cart data after every state change', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart(sampleItem1);
      });

      await waitFor(() => {
        const savedCart = localStorageMock.getItem('peerCafeCart');
        expect(savedCart).toBeTruthy();
      });

      act(() => {
        result.current.updateQuantity(1, 5);
      });

      await waitFor(() => {
        const savedCart = JSON.parse(
          localStorageMock.getItem('peerCafeCart') || '[]'
        );
        expect(savedCart[0].quantity).toBe(5);
      });
    });
  });
});
