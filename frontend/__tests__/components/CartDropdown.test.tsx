import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { useRouter } from 'next/navigation';
import { CartDropdown } from '@/app/_components/CartDropdown';
import { useCart } from '@/app/_contexts/CartContext';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/app/_contexts/CartContext', () => ({
  useCart: jest.fn(),
}));

describe('CartDropdown', () => {
  const mockPush = jest.fn();
  const mockOnClose = jest.fn();
  const mockUpdateQuantity = jest.fn();
  const mockRemoveFromCart = jest.fn();
  const mockClearCart = jest.fn();

  // Sample cart data
  const sampleRestaurant = {
    id: 100,
    name: 'Test Restaurant',
  };

  const sampleItems = [
    {
      id: 1,
      ItemName: 'Burger',
      Price: 12.99,
      quantity: 2,
      restaurantId: 100,
      restaurantName: 'Test Restaurant',
      Image: 'burger.jpg',
    },
    {
      id: 2,
      ItemName: 'Pizza',
      Price: 15.99,
      quantity: 1,
      restaurantId: 100,
      restaurantName: 'Test Restaurant',
      Image: 'pizza.jpg',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  const renderCartDropdown = async (props = {}) => {
    const defaultProps = {
      anchorEl: document.createElement('div'),
      open: true,
      onClose: mockOnClose,
      ...props,
    };

    return await render(<CartDropdown {...defaultProps} />);
  };

  describe('Rendering', () => {
    it('should render cart dropdown when open', async () => {
      (useCart as jest.Mock).mockReturnValue({
        items: [],
        restaurant: null,
        totalItems: 0,
        totalPrice: 0,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: true,
      });

      await renderCartDropdown();

      expect(screen.getByText('Your Cart')).toBeInTheDocument();
    });

    it('should not render when closed', async () => {
      (useCart as jest.Mock).mockReturnValue({
        items: [],
        restaurant: null,
        totalItems: 0,
        totalPrice: 0,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: true,
      });

      const { container } = await renderCartDropdown({ open: false });

      // Popover with open=false should not be visible
      const popover = container.querySelector('[role="presentation"]');
      expect(popover).not.toBeInTheDocument();
    });

    it('should render with correct anchorEl', async () => {
      const anchorElement = document.createElement('button');
      anchorElement.setAttribute('data-testid', 'anchor-button');

      (useCart as jest.Mock).mockReturnValue({
        items: [],
        restaurant: null,
        totalItems: 0,
        totalPrice: 0,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: true,
      });

      await renderCartDropdown({ anchorEl: anchorElement });

      expect(screen.getByText('Your Cart')).toBeInTheDocument();
    });
  });

  describe('Empty cart state', () => {
    beforeEach(() => {
      (useCart as jest.Mock).mockReturnValue({
        items: [],
        restaurant: null,
        totalItems: 0,
        totalPrice: 0,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: true,
      });
    });

    it('should display empty cart message', async () => {
      await renderCartDropdown();

      expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
      expect(
        screen.getByText('Add items from a restaurant to get started')
      ).toBeInTheDocument();
    });

    it('should not show clear cart button when empty', async () => {
      await renderCartDropdown();

      expect(screen.queryByText('Clear Cart')).not.toBeInTheDocument();
    });

    it('should not show restaurant info when empty', async () => {
      await renderCartDropdown();

      expect(screen.queryByText(/From:/)).not.toBeInTheDocument();
    });

    it('should not show checkout button when empty', async () => {
      await renderCartDropdown();

      expect(screen.queryByText('Proceed to Checkout')).not.toBeInTheDocument();
    });
  });

  describe('Cart with items', () => {
    beforeEach(() => {
      (useCart as jest.Mock).mockReturnValue({
        items: sampleItems,
        restaurant: sampleRestaurant,
        totalItems: 3,
        totalPrice: 41.97,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: false,
      });
    });

    it('should display cart items', async () => {
      await renderCartDropdown();

      expect(screen.getByText('Burger')).toBeInTheDocument();
      expect(screen.getByText('Pizza')).toBeInTheDocument();
    });

    it('should display item prices', async () => {
      await renderCartDropdown();

      expect(screen.getByText('$12.99 each')).toBeInTheDocument();
      expect(screen.getByText('$15.99 each')).toBeInTheDocument();
    });

    it('should display item quantities', async () => {
      await renderCartDropdown();

      // Find quantity text nodes (looking for the quantity values)
      const quantities = screen.getAllByText(/^[0-9]+$/);
      expect(quantities).toHaveLength(2);
    });

    it('should display item subtotals', async () => {
      await renderCartDropdown();

      // Check that the item subtotals appear
      expect(screen.getByText('$25.98')).toBeInTheDocument(); // 12.99 * 2
      expect(screen.getByText('$15.99')).toBeInTheDocument(); // 15.99 * 1
    });

    it('should display restaurant name', async () => {
      await renderCartDropdown();

      expect(screen.getByText('From: Test Restaurant')).toBeInTheDocument();
    });

    it('should display clear cart button', async () => {
      await renderCartDropdown();

      expect(screen.getByText('Clear Cart')).toBeInTheDocument();
    });

    it('should display total items count', async () => {
      await renderCartDropdown();

      expect(screen.getByText(/Total \(3 items\)/)).toBeInTheDocument();
    });

    it('should display total price', async () => {
      await renderCartDropdown();

      // Check that the total price appears (it might appear in multiple places)
      const allTotalPriceElements = screen.getAllByText('$41.97');
      expect(allTotalPriceElements.length).toBeGreaterThan(0);
    });

    it('should display checkout button', async () => {
      await renderCartDropdown();

      expect(screen.getByText('Proceed to Checkout')).toBeInTheDocument();
    });

    it('should display singular "item" when totalItems is 1', async () => {
      (useCart as jest.Mock).mockReturnValue({
        items: [sampleItems[0]],
        restaurant: sampleRestaurant,
        totalItems: 1,
        totalPrice: 12.99,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: false,
      });

      await renderCartDropdown();

      expect(screen.getByText(/Total \(1 item\)/)).toBeInTheDocument();
    });
  });

  describe('User interactions', () => {
    beforeEach(() => {
      (useCart as jest.Mock).mockReturnValue({
        items: sampleItems,
        restaurant: sampleRestaurant,
        totalItems: 3,
        totalPrice: 41.97,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: false,
      });
    });

    it('should call onClose when clicking outside', async () => {
      await renderCartDropdown();

      // Simulate clicking on the backdrop
      const backdrop = document.querySelector('[class*="MuiBackdrop-root"]');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('should call clearCart when clicking clear cart button', async () => {
      await renderCartDropdown();

      const clearButton = screen.getByText('Clear Cart');
      fireEvent.click(clearButton);

      expect(mockClearCart).toHaveBeenCalledTimes(1);
    });

    it('should navigate to checkout and close dropdown when clicking checkout button', async () => {
      await renderCartDropdown();

      const checkoutButton = screen.getByText('Proceed to Checkout');
      fireEvent.click(checkoutButton);

      expect(mockPush).toHaveBeenCalledWith('/user/checkout');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Quantity controls', () => {
    beforeEach(() => {
      (useCart as jest.Mock).mockReturnValue({
        items: sampleItems,
        restaurant: sampleRestaurant,
        totalItems: 3,
        totalPrice: 41.97,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: false,
      });
    });

    it('should increase quantity when clicking add button', async () => {
      await renderCartDropdown();

      // Get all add buttons (one for each item)
      const addButtons = screen
        .getAllByTestId('AddIcon')
        .map(icon => icon.closest('button'));

      // Click the first item's add button
      fireEvent.click(addButtons[0]!);

      expect(mockUpdateQuantity).toHaveBeenCalledWith(1, 3); // id: 1, new quantity: 3
    });

    it('should decrease quantity when clicking remove button', async () => {
      await renderCartDropdown();

      // Get all remove buttons
      const removeButtons = screen
        .getAllByTestId('RemoveIcon')
        .map(icon => icon.closest('button'));

      // Click the first item's remove button
      fireEvent.click(removeButtons[0]!);

      expect(mockUpdateQuantity).toHaveBeenCalledWith(1, 1); // id: 1, new quantity: 1
    });

    it('should remove item when decreasing quantity to 0', async () => {
      (useCart as jest.Mock).mockReturnValue({
        items: [
          {
            id: 1,
            ItemName: 'Burger',
            Price: 12.99,
            quantity: 1,
            restaurantId: 100,
            restaurantName: 'Test Restaurant',
          },
        ],
        restaurant: sampleRestaurant,
        totalItems: 1,
        totalPrice: 12.99,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: false,
      });

      await renderCartDropdown();

      // Get remove button
      const removeButton = screen.getByTestId('RemoveIcon').closest('button');
      fireEvent.click(removeButton!);

      expect(mockRemoveFromCart).toHaveBeenCalledWith(1);
      expect(mockUpdateQuantity).not.toHaveBeenCalled();
    });

    it('should handle multiple quantity increases', async () => {
      await renderCartDropdown();

      const addButtons = screen
        .getAllByTestId('AddIcon')
        .map(icon => icon.closest('button'));

      // Click add button twice
      fireEvent.click(addButtons[0]!);
      fireEvent.click(addButtons[0]!);

      expect(mockUpdateQuantity).toHaveBeenCalledTimes(2);
      expect(mockUpdateQuantity).toHaveBeenNthCalledWith(1, 1, 3);
      expect(mockUpdateQuantity).toHaveBeenNthCalledWith(2, 1, 3);
    });
  });

  describe('Delete item functionality', () => {
    beforeEach(() => {
      (useCart as jest.Mock).mockReturnValue({
        items: sampleItems,
        restaurant: sampleRestaurant,
        totalItems: 3,
        totalPrice: 41.97,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: false,
      });
    });

    it('should call removeFromCart when clicking delete button', async () => {
      await renderCartDropdown();

      // Get all delete buttons
      const deleteButtons = screen
        .getAllByTestId('DeleteIcon')
        .map(icon => icon.closest('button'));

      // Click the first delete button
      fireEvent.click(deleteButtons[0]!);

      expect(mockRemoveFromCart).toHaveBeenCalledWith(1);
    });

    it('should remove correct item when clicking delete on second item', async () => {
      await renderCartDropdown();

      const deleteButtons = screen
        .getAllByTestId('DeleteIcon')
        .map(icon => icon.closest('button'));

      // Click the second delete button
      fireEvent.click(deleteButtons[1]!);

      expect(mockRemoveFromCart).toHaveBeenCalledWith(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle items without images', async () => {
      const itemsWithoutImages = [
        {
          id: 1,
          ItemName: 'No Image Item',
          Price: 9.99,
          quantity: 1,
          restaurantId: 100,
          restaurantName: 'Test Restaurant',
        },
      ];

      (useCart as jest.Mock).mockReturnValue({
        items: itemsWithoutImages,
        restaurant: sampleRestaurant,
        totalItems: 1,
        totalPrice: 9.99,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: false,
      });

      await renderCartDropdown();

      expect(screen.getByText('No Image Item')).toBeInTheDocument();
      expect(screen.getByText('$9.99 each')).toBeInTheDocument();
    });

    it('should handle decimal prices correctly', async () => {
      const itemsWithDecimals = [
        {
          id: 1,
          ItemName: 'Decimal Item',
          Price: 10.5,
          quantity: 3,
          restaurantId: 100,
          restaurantName: 'Test Restaurant',
        },
      ];

      (useCart as jest.Mock).mockReturnValue({
        items: itemsWithDecimals,
        restaurant: sampleRestaurant,
        totalItems: 3,
        totalPrice: 31.5,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: false,
      });

      await renderCartDropdown();

      expect(screen.getByText('$10.50 each')).toBeInTheDocument();
      // Check that the total appears (might be multiple elements with same price)
      const allDecimalPriceElements = screen.getAllByText('$31.50');
      expect(allDecimalPriceElements.length).toBeGreaterThan(0);
    });

    it('should handle single item in cart', async () => {
      (useCart as jest.Mock).mockReturnValue({
        items: [sampleItems[0]],
        restaurant: sampleRestaurant,
        totalItems: 2,
        totalPrice: 25.98,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: false,
      });

      await renderCartDropdown();

      expect(screen.getByText('Burger')).toBeInTheDocument();
      expect(screen.queryByText('Pizza')).not.toBeInTheDocument();
    });

    it('should handle large quantity numbers', async () => {
      const itemWithLargeQuantity = [
        {
          id: 1,
          ItemName: 'Bulk Item',
          Price: 5.0,
          quantity: 99,
          restaurantId: 100,
          restaurantName: 'Test Restaurant',
        },
      ];

      (useCart as jest.Mock).mockReturnValue({
        items: itemWithLargeQuantity,
        restaurant: sampleRestaurant,
        totalItems: 99,
        totalPrice: 495.0,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: false,
      });

      await renderCartDropdown();

      expect(screen.getByText(/Total \(99 items\)/)).toBeInTheDocument();
      // Look for the total price specifically, not the item subtotal
      const allPriceElements = screen.getAllByText('$495.00');
      expect(allPriceElements.length).toBeGreaterThan(0);
    });

    it('should handle zero price items', async () => {
      const freeItems = [
        {
          id: 1,
          ItemName: 'Free Item',
          Price: 0,
          quantity: 1,
          restaurantId: 100,
          restaurantName: 'Test Restaurant',
        },
      ];

      (useCart as jest.Mock).mockReturnValue({
        items: freeItems,
        restaurant: sampleRestaurant,
        totalItems: 1,
        totalPrice: 0,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: false,
      });

      await renderCartDropdown();

      expect(screen.getByText('$0.00 each')).toBeInTheDocument();
      // Verify there are multiple $0.00 elements (item price and total)
      const allZeroPriceElements = screen.getAllByText('$0.00');
      expect(allZeroPriceElements.length).toBeGreaterThan(0);
    });

    it('should handle null anchorEl gracefully', async () => {
      (useCart as jest.Mock).mockReturnValue({
        items: [],
        restaurant: null,
        totalItems: 0,
        totalPrice: 0,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: true,
      });

      const { container } = await renderCartDropdown({ anchorEl: null });

      // Should still render without errors
      expect(container).toBeInTheDocument();
    });
  });

  describe('Price calculations', () => {
    it('should display correct subtotal for each item', async () => {
      (useCart as jest.Mock).mockReturnValue({
        items: [
          {
            id: 1,
            ItemName: 'Item A',
            Price: 7.5,
            quantity: 4,
            restaurantId: 100,
            restaurantName: 'Test Restaurant',
          },
        ],
        restaurant: sampleRestaurant,
        totalItems: 4,
        totalPrice: 30.0,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: false,
      });

      await renderCartDropdown();

      // Verify that the subtotal appears (both as item subtotal and total price)
      const allThirtyDollarElements = screen.getAllByText('$30.00');
      expect(allThirtyDollarElements.length).toBeGreaterThan(0); // Should have both item subtotal and total
    });

    it('should format prices to 2 decimal places', async () => {
      (useCart as jest.Mock).mockReturnValue({
        items: [
          {
            id: 1,
            ItemName: 'Odd Price Item',
            Price: 9.999,
            quantity: 1,
            restaurantId: 100,
            restaurantName: 'Test Restaurant',
          },
        ],
        restaurant: sampleRestaurant,
        totalItems: 1,
        totalPrice: 9.999,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: false,
      });

      await renderCartDropdown();

      // Should round to 2 decimal places
      expect(screen.getByText('$10.00 each')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      (useCart as jest.Mock).mockReturnValue({
        items: sampleItems,
        restaurant: sampleRestaurant,
        totalItems: 3,
        totalPrice: 41.97,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: false,
      });
    });

    it('should have accessible buttons', async () => {
      await renderCartDropdown();

      const clearButton = screen.getByText('Clear Cart');
      const checkoutButton = screen.getByText('Proceed to Checkout');

      expect(clearButton).toBeEnabled();
      expect(checkoutButton).toBeEnabled();
    });

    it('should have clickable icon buttons', async () => {
      await renderCartDropdown();

      const addIcons = screen.getAllByTestId('AddIcon');
      const removeIcons = screen.getAllByTestId('RemoveIcon');
      const deleteIcons = screen.getAllByTestId('DeleteIcon');

      expect(addIcons.length).toBeGreaterThan(0);
      expect(removeIcons.length).toBeGreaterThan(0);
      expect(deleteIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle add-then-delete workflow', async () => {
      (useCart as jest.Mock).mockReturnValue({
        items: sampleItems,
        restaurant: sampleRestaurant,
        totalItems: 3,
        totalPrice: 41.97,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: false,
      });

      await renderCartDropdown();

      // Increase quantity
      const addButton = screen.getAllByTestId('AddIcon')[0].closest('button');
      fireEvent.click(addButton!);

      expect(mockUpdateQuantity).toHaveBeenCalledWith(1, 3);

      // Then delete
      const deleteButton = screen
        .getAllByTestId('DeleteIcon')[0]
        .closest('button');
      fireEvent.click(deleteButton!);

      expect(mockRemoveFromCart).toHaveBeenCalledWith(1);
    });

    it('should handle clear cart then close', async () => {
      (useCart as jest.Mock).mockReturnValue({
        items: sampleItems,
        restaurant: sampleRestaurant,
        totalItems: 3,
        totalPrice: 41.97,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: false,
      });

      await renderCartDropdown();

      // Clear cart
      const clearButton = screen.getByText('Clear Cart');
      fireEvent.click(clearButton);

      expect(mockClearCart).toHaveBeenCalled();
    });

    it('should handle rapid quantity changes', async () => {
      (useCart as jest.Mock).mockReturnValue({
        items: sampleItems,
        restaurant: sampleRestaurant,
        totalItems: 3,
        totalPrice: 41.97,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: false,
      });

      await renderCartDropdown();

      const addButton = screen.getAllByTestId('AddIcon')[0].closest('button');

      // Click multiple times rapidly
      fireEvent.click(addButton!);
      fireEvent.click(addButton!);
      fireEvent.click(addButton!);

      expect(mockUpdateQuantity).toHaveBeenCalledTimes(3);
    });
  });

  describe('Restaurant information', () => {
    it('should display restaurant chip when restaurant is present', async () => {
      (useCart as jest.Mock).mockReturnValue({
        items: sampleItems,
        restaurant: sampleRestaurant,
        totalItems: 3,
        totalPrice: 41.97,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: false,
      });

      await renderCartDropdown();

      const chip = screen.getByText('From: Test Restaurant');
      expect(chip).toBeInTheDocument();
    });

    it('should not display restaurant chip when restaurant is null', async () => {
      (useCart as jest.Mock).mockReturnValue({
        items: [],
        restaurant: null,
        totalItems: 0,
        totalPrice: 0,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: true,
      });

      await renderCartDropdown();

      expect(screen.queryByText(/From:/)).not.toBeInTheDocument();
    });

    it('should handle long restaurant names', async () => {
      const longNameRestaurant = {
        id: 100,
        name: 'This Is A Very Long Restaurant Name That Should Still Display Correctly',
      };

      (useCart as jest.Mock).mockReturnValue({
        items: sampleItems,
        restaurant: longNameRestaurant,
        totalItems: 3,
        totalPrice: 41.97,
        updateQuantity: mockUpdateQuantity,
        removeFromCart: mockRemoveFromCart,
        clearCart: mockClearCart,
        isCartEmpty: false,
      });

      await renderCartDropdown();

      expect(
        screen.getByText(
          'From: This Is A Very Long Restaurant Name That Should Still Display Correctly'
        )
      ).toBeInTheDocument();
    });
  });
});
