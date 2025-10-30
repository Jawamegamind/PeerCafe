/**
 * Tests for login server actions
 */

import { login, logout } from '../../app/(authentication)/login/actions';

// Mock external dependencies
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('axios', () => ({
  post: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

describe('Login Actions', () => {
  const { createClient } = require('@/utils/supabase/server');
  const axios = require('axios');
  const { revalidatePath } = require('next/cache');
  const { redirect } = require('next/navigation');

  // Mock Supabase client
  const mockSupabaseClient = {
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    createClient.mockResolvedValue(mockSupabaseClient);

    // Mock console methods to avoid test output noise
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createMockFormData = (data: Record<string, string>) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
    return formData;
  };

  describe('login', () => {
    it('successfully logs in a regular user', async () => {
      const formData = createMockFormData({
        email: 'user@example.com',
        password: 'password123',
      });

      const mockAuthData = {
        user: { id: 'user123' },
        session: { access_token: 'mock-token' },
      };

      const mockBackendResponse = {
        data: {
          user: { is_admin: false },
        },
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: mockAuthData,
        error: null,
      });

      axios.post.mockResolvedValue(mockBackendResponse);

      await login(formData);

      // Verify Supabase auth call
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });

      // Verify backend API call
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/login',
        {
          user_id: 'user123',
          email: 'user@example.com',
          password: 'password123',
        },
        {
          headers: {
            Authorization: 'Bearer mock-token',
          },
        }
      );

      // Verify user redirect
      expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
      expect(redirect).toHaveBeenCalledWith('/user/dashboard');
    });

    it('successfully logs in an admin user', async () => {
      const formData = createMockFormData({
        email: 'admin@example.com',
        password: 'admin123',
      });

      const mockAuthData = {
        user: { id: 'admin123' },
        session: { access_token: 'mock-admin-token' },
      };

      const mockBackendResponse = {
        data: {
          user: { is_admin: true },
        },
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: mockAuthData,
        error: null,
      });

      axios.post.mockResolvedValue(mockBackendResponse);

      await login(formData);

      // Verify admin redirect
      expect(redirect).toHaveBeenCalledWith('/admin/dashboard');
      // Should not revalidate path for admin
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('returns error message for invalid credentials', async () => {
      const formData = createMockFormData({
        email: 'invalid@example.com',
        password: 'wrongpassword',
      });

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { code: 'invalid_credentials', message: 'Invalid credentials' },
      });

      const result = await login(formData);

      expect(result).toBe('Invalid credentials');
      expect(axios.post).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });

    it('handles other Supabase auth errors gracefully', async () => {
      const formData = createMockFormData({
        email: 'user@example.com',
        password: 'password123',
      });

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { code: 'email_not_confirmed', message: 'Email not confirmed' },
      });

      const result = await login(formData);

      // Should return undefined (no explicit error message for non-credential errors)
      expect(result).toBeUndefined();
      expect(axios.post).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });

    it('handles backend API errors', async () => {
      const formData = createMockFormData({
        email: 'user@example.com',
        password: 'password123',
      });

      const mockAuthData = {
        user: { id: 'user123' },
        session: { access_token: 'mock-token' },
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: mockAuthData,
        error: null,
      });

      axios.post.mockRejectedValue(new Error('Backend server error'));

      // Should throw the error since it's not caught
      await expect(login(formData)).rejects.toThrow('Backend server error');

      expect(redirect).not.toHaveBeenCalled();
    });

    it('handles missing user ID from Supabase', async () => {
      const formData = createMockFormData({
        email: 'user@example.com',
        password: 'password123',
      });

      const mockAuthData = {
        user: null, // Missing user
        session: { access_token: 'mock-token' },
      };

      const mockBackendResponse = {
        data: {
          user: { is_admin: false },
        },
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: mockAuthData,
        error: null,
      });

      axios.post.mockResolvedValue(mockBackendResponse);

      await login(formData);

      // Should use empty string as fallback for user_id
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/login',
        {
          user_id: '',
          email: 'user@example.com',
          password: 'password123',
        },
        {
          headers: {
            Authorization: 'Bearer mock-token',
          },
        }
      );
    });

    it('extracts form data correctly', async () => {
      const formData = createMockFormData({
        email: 'test@example.com',
        password: 'testpass',
        // Extra field that should be ignored
        extraField: 'ignored',
      });

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { code: 'invalid_credentials', message: 'Invalid credentials' },
      });

      await login(formData);

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'testpass',
      });
    });
  });

  describe('logout', () => {
    it('successfully logs out user', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      await logout();

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
      expect(redirect).toHaveBeenCalledWith('/login');
    });

    it('handles logout errors', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: 'Logout failed', code: 'signout_error' },
      });

      const result = await logout();

      expect(result).toBe('Logout failed');
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });

    it('handles Supabase client creation errors', async () => {
      createClient.mockRejectedValue(new Error('Client creation failed'));

      await expect(logout()).rejects.toThrow('Client creation failed');
    });
  });

  describe('error handling and edge cases', () => {
    it('handles malformed form data gracefully', async () => {
      // Create form data with null values
      const formData = new FormData();
      // Don't append anything, so get() will return null

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { code: 'invalid_credentials', message: 'Invalid credentials' },
      });

      const result = await login(formData);

      // Should still attempt login with null values cast to strings
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: null,
        password: null,
      });

      expect(result).toBe('Invalid credentials');
    });

    it('handles createClient errors in login', async () => {
      const formData = createMockFormData({
        email: 'user@example.com',
        password: 'password123',
      });

      createClient.mockRejectedValue(new Error('Supabase client error'));

      await expect(login(formData)).rejects.toThrow('Supabase client error');
    });
  });
});
