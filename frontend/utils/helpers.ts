/**
 * Utility functions for testing
 */

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: number | string | undefined | null
): string {
  if (amount === undefined || amount === null || amount === '') return '$0.00';
  const n = typeof amount === 'number' ? amount : Number(amount);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : '$0.00';
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate a slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Truncate text to a specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Check if a restaurant is currently open
 */
export function isRestaurantOpen(openTime: string, closeTime: string): boolean {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [openHour, openMinute] = openTime.split(':').map(Number);
  const [closeHour, closeMinute] = closeTime.split(':').map(Number);

  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;

  // Handle overnight hours (e.g., 22:00 - 02:00)
  if (closeMinutes < openMinutes) {
    return currentTime >= openMinutes || currentTime <= closeMinutes;
  }

  return currentTime >= openMinutes && currentTime <= closeMinutes;
}

/**
 * Calculate delivery time estimate
 */
export function calculateDeliveryTime(
  distance: number,
  trafficFactor: number = 1
): number {
  const baseTime = 20; // Base 20 minutes
  const additionalTime = Math.ceil(distance * 2 * trafficFactor);
  return baseTime + additionalTime;
}

/**
 * Format rating for display
 */
export function formatRating(
  rating: number | string | undefined | null
): string {
  if (rating === undefined || rating === null || rating === '') return '0.0';
  const r = typeof rating === 'number' ? rating : Number(rating);
  return Number.isFinite(r) ? r.toFixed(1) : '0.0';
}

/**
 * Check if a price is within budget
 */
export function isPriceInBudget(price: number, budget: number): boolean {
  return price <= budget;
}
