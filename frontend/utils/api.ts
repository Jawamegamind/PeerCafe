// Centralized API base URL helper
// Use a single env var that includes the /api prefix in development and prod.
// Example: NEXT_PUBLIC_API_URL=http://localhost:8000/api
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
