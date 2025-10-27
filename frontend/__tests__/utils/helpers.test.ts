import {
  formatCurrency,
  validateEmail,
  generateSlug,
  truncateText,
  isRestaurantOpen,
  calculateDeliveryTime,
  formatRating,
  isPriceInBudget,
} from '../../utils/helpers';

describe('Utility Functions', () => {
  describe('formatCurrency', () => {
    it('formats currency correctly', () => {
      expect(formatCurrency(15.99)).toBe('$15.99');
      expect(formatCurrency(10)).toBe('$10.00');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(99.9)).toBe('$99.90');
    });

    it('handles negative numbers', () => {
      expect(formatCurrency(-5.99)).toBe('$-5.99');
    });

    it('handles very large numbers', () => {
      expect(formatCurrency(1234567.89)).toBe('$1234567.89');
    });
  });

  describe('validateEmail', () => {
    it('validates correct email formats', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co')).toBe(true);
      expect(validateEmail('user+tag@domain.org')).toBe(true);
    });

    it('rejects invalid email formats', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user@domain')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('generateSlug', () => {
    it('generates slugs correctly', () => {
      expect(generateSlug('Test Restaurant')).toBe('test-restaurant');
      expect(generateSlug('Pizza & Pasta Place')).toBe('pizza-pasta-place');
      expect(generateSlug("Joe's Diner")).toBe('joes-diner');
    });

    it('handles special characters', () => {
      expect(generateSlug('Café français!')).toBe('caf-franais');
      expect(generateSlug('Restaurant@123')).toBe('restaurant123');
    });

    it('handles multiple spaces and dashes', () => {
      expect(generateSlug('Multiple   Spaces')).toBe('multiple-spaces');
      expect(generateSlug('Already-has-dashes')).toBe('already-has-dashes');
    });
  });

  describe('truncateText', () => {
    it('truncates text correctly', () => {
      const longText = 'This is a very long text that needs to be truncated';
      expect(truncateText(longText, 20)).toBe('This is a very long...');
    });

    it('returns original text if under limit', () => {
      const shortText = 'Short text';
      expect(truncateText(shortText, 20)).toBe('Short text');
    });

    it('handles exact length match', () => {
      const exactText = 'Exactly twenty chars';
      expect(truncateText(exactText, 20)).toBe('Exactly twenty chars');
    });
  });

  describe('isRestaurantOpen', () => {
    // Mock Date for consistent testing
    beforeEach(() => {
      // Mock current time as 2:30 PM (14:30)
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
      jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(30);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('returns true when restaurant is open during normal hours', () => {
      expect(isRestaurantOpen('09:00', '22:00')).toBe(true);
      expect(isRestaurantOpen('12:00', '15:00')).toBe(true);
    });

    it('returns false when restaurant is closed', () => {
      expect(isRestaurantOpen('18:00', '22:00')).toBe(false);
      expect(isRestaurantOpen('09:00', '12:00')).toBe(false);
    });

    it('handles overnight hours correctly', () => {
      // Current time: 14:30, restaurant open 22:00-02:00
      expect(isRestaurantOpen('22:00', '02:00')).toBe(false);

      // Test with early morning time
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(1);
      jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(0);
      expect(isRestaurantOpen('22:00', '02:00')).toBe(true);
    });
  });

  describe('calculateDeliveryTime', () => {
    it('calculates delivery time correctly', () => {
      expect(calculateDeliveryTime(1)).toBe(22); // 20 + 2*1
      expect(calculateDeliveryTime(5)).toBe(30); // 20 + 2*5
      expect(calculateDeliveryTime(0)).toBe(20); // Base time only
    });

    it('applies traffic factor correctly', () => {
      expect(calculateDeliveryTime(5, 1.5)).toBe(35); // 20 + ceil(5*2*1.5)
      expect(calculateDeliveryTime(3, 2)).toBe(32); // 20 + ceil(3*2*2)
    });

    it('handles fractional distances', () => {
      expect(calculateDeliveryTime(2.3)).toBe(25); // 20 + ceil(2.3*2)
      expect(calculateDeliveryTime(1.7, 1.2)).toBe(25); // 20 + ceil(1.7*2*1.2)
    });
  });

  describe('formatRating', () => {
    it('formats ratings correctly', () => {
      expect(formatRating(4.5)).toBe('4.5');
      expect(formatRating(4)).toBe('4.0');
      expect(formatRating(3.75)).toBe('3.8');
    });

    it('handles edge cases', () => {
      expect(formatRating(0)).toBe('0.0');
      expect(formatRating(5)).toBe('5.0');
    });
  });

  describe('isPriceInBudget', () => {
    it('returns true when price is within budget', () => {
      expect(isPriceInBudget(15.99, 20)).toBe(true);
      expect(isPriceInBudget(20, 20)).toBe(true);
      expect(isPriceInBudget(0, 10)).toBe(true);
    });

    it('returns false when price exceeds budget', () => {
      expect(isPriceInBudget(25, 20)).toBe(false);
      expect(isPriceInBudget(20.01, 20)).toBe(false);
    });
  });
});
