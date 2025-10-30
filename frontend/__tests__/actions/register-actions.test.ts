/**
 * Tests for register server actions
 */

import { register } from '../../app/(authentication)/register/actions';

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

describe('Register Actions', () => {
  const { createClient } = require('@/utils/supabase/server');
  const axios = require('axios');
  const { revalidatePath } = require('next/cache');
  const { redirect } = require('next/navigation');

  // Mock Supabase client
  const mockSupabaseClient = {
    auth: {
      signUp: jest.fn(),
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

  describe('register', () => {
    it('successfully registers a new user with session token', async () => {
      const formData = createMockFormData({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      });

      const mockAuthData = {
        user: { id: 'user123' },
        session: { access_token: 'mock-token' },
      };

      const mockBackendResponse = {
        data: {
          message: 'User created successfully',
        },
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: mockAuthData,
        error: null,
      });

      axios.post.mockResolvedValue(mockBackendResponse);

      await register(formData);

      // Verify Supabase auth call
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'password123',
      });

      // Verify backend API call
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/register',
        {
          user_id: 'user123',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '',
          is_admin: false,
          is_active: true,
          password: 'password123',
        },
        {
          headers: {
            Authorization: 'Bearer mock-token',
          },
        }
      );

      // Verify successful registration redirect
      expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
      expect(redirect).toHaveBeenCalledWith('/login');
    });

    it('successfully registers a new user without session token (email confirmation required)', async () => {
      const formData = createMockFormData({
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'password456',
      });

      const mockAuthData = {
        user: { id: 'user456' },
        session: null, // No session when email confirmation is required
      };

      const mockBackendResponse = {
        data: {
          message: 'User created successfully',
        },
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: mockAuthData,
        error: null,
      });

      axios.post.mockResolvedValue(mockBackendResponse);

      await register(formData);

      // Verify backend API call without Authorization header
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/register',
        {
          user_id: 'user456',
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com',
          phone: '',
          is_admin: false,
          is_active: true,
          password: 'password456',
        },
        {
          headers: {},
        }
      );

      expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
      expect(redirect).toHaveBeenCalledWith('/login');
    });

    it('handles single name correctly', async () => {
      const formData = createMockFormData({
        name: 'Madonna',
        email: 'madonna@example.com',
        password: 'password789',
      });

      const mockAuthData = {
        user: { id: 'user789' },
        session: { access_token: 'mock-token' },
      };

      const mockBackendResponse = {
        data: {
          message: 'User created successfully',
        },
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: mockAuthData,
        error: null,
      });

      axios.post.mockResolvedValue(mockBackendResponse);

      await register(formData);

      // Verify name parsing for single name
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/register',
        {
          user_id: 'user789',
          first_name: 'Madonna',
          last_name: '', // Empty string for missing last name
          email: 'madonna@example.com',
          phone: '',
          is_admin: false,
          is_active: true,
          password: 'password789',
        },
        {
          headers: {
            Authorization: 'Bearer mock-token',
          },
        }
      );
    });

    it('handles multiple name parts correctly', async () => {
      const formData = createMockFormData({
        name: 'Jean-Pierre Van Damme Jr.',
        email: 'jcvd@example.com',
        password: 'kickboxer123',
      });

      const mockAuthData = {
        user: { id: 'user999' },
        session: { access_token: 'mock-token' },
      };

      const mockBackendResponse = {
        data: {
          message: 'User created successfully',
        },
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: mockAuthData,
        error: null,
      });

      axios.post.mockResolvedValue(mockBackendResponse);

      await register(formData);

      // Verify name parsing (only first two parts)
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/register',
        expect.objectContaining({
          first_name: 'Jean-Pierre',
          last_name: 'Van', // Only takes the second part
        }),
        expect.any(Object)
      );
    });

    it('returns error when user already exists (Supabase level)', async () => {
      const formData = createMockFormData({
        name: 'Existing User',
        email: 'existing@example.com',
        password: 'password123',
      });

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: null,
        error: { code: 'user_already_exists', message: 'User already exists' },
      });

      const result = await register(formData);

      expect(result).toBe('User already exists');
      expect(axios.post).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });

    it('returns error when user already exists (Backend level)', async () => {
      const formData = createMockFormData({
        name: 'Backend Existing User',
        email: 'backend.existing@example.com',
        password: 'password123',
      });

      const mockAuthData = {
        user: { id: 'user123' },
        session: { access_token: 'mock-token' },
      };

      const mockBackendResponse = {
        data: {
          message: 'User already exists',
        },
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: mockAuthData,
        error: null,
      });

      axios.post.mockResolvedValue(mockBackendResponse);

      const result = await register(formData);

      expect(result).toBe('User already exists');
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });

    it('returns error when backend registration fails', async () => {
      const formData = createMockFormData({
        name: 'Failed User',
        email: 'failed@example.com',
        password: 'password123',
      });

      const mockAuthData = {
        user: { id: 'user123' },
        session: { access_token: 'mock-token' },
      };

      const mockBackendResponse = {
        data: {
          message: 'User registration failed',
        },
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: mockAuthData,
        error: null,
      });

      axios.post.mockResolvedValue(mockBackendResponse);

      const result = await register(formData);

      expect(result).toBe('User registration failed');
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });

    it('returns generic error for other Supabase auth errors', async () => {
      const formData = createMockFormData({
        name: 'Error User',
        email: 'error@example.com',
        password: 'password123',
      });

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: null,
        error: { code: 'signup_disabled', message: 'Signup is disabled' },
      });

      const result = await register(formData);

      expect(result).toBe('User registration failed');
      expect(axios.post).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });

    it('handles missing user ID from Supabase', async () => {
      const formData = createMockFormData({
        name: 'No ID User',
        email: 'noid@example.com',
        password: 'password123',
      });

      const mockAuthData = {
        user: null, // Missing user object
        session: { access_token: 'mock-token' },
      };

      const mockBackendResponse = {
        data: {
          message: 'User created successfully',
        },
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: mockAuthData,
        error: null,
      });

      axios.post.mockResolvedValue(mockBackendResponse);

      await register(formData);

      // Should use empty string as fallback for user_id
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/register',
        expect.objectContaining({
          user_id: '',
        }),
        expect.any(Object)
      );
    });

    it('handles backend API errors', async () => {
      const formData = createMockFormData({
        name: 'API Error User',
        email: 'apierror@example.com',
        password: 'password123',
      });

      const mockAuthData = {
        user: { id: 'user123' },
        session: { access_token: 'mock-token' },
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: mockAuthData,
        error: null,
      });

      axios.post.mockRejectedValue(new Error('Backend API error'));

      // Should throw the error since it's not caught
      await expect(register(formData)).rejects.toThrow('Backend API error');

      expect(redirect).not.toHaveBeenCalled();
    });

    it('handles unexpected backend response message', async () => {
      const formData = createMockFormData({
        name: 'Unexpected User',
        email: 'unexpected@example.com',
        password: 'password123',
      });

      const mockAuthData = {
        user: { id: 'user123' },
        session: { access_token: 'mock-token' },
      };

      const mockBackendResponse = {
        data: {
          message: 'Unexpected response message',
        },
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: mockAuthData,
        error: null,
      });

      axios.post.mockResolvedValue(mockBackendResponse);

      const result = await register(formData);

      // Should return undefined for unexpected messages (no explicit handling)
      expect(result).toBeUndefined();
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe('error handling and edge cases', () => {
    it('handles malformed form data gracefully', async () => {
      // Create form data with null values
      const formData = new FormData();
      // Don't append anything, so get() will return null

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: null,
        error: { code: 'user_already_exists', message: 'User already exists' },
      });

      const result = await register(formData);

      // Should still attempt signup with null values cast to strings
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: null,
        password: null,
      });

      expect(result).toBe('User already exists');
    });

    it('handles createClient errors', async () => {
      const formData = createMockFormData({
        name: 'Client Error User',
        email: 'clienterror@example.com',
        password: 'password123',
      });

      createClient.mockRejectedValue(new Error('Supabase client error'));

      await expect(register(formData)).rejects.toThrow('Supabase client error');
    });

    it('extracts form data correctly', async () => {
      const formData = createMockFormData({
        name: 'Test User',
        email: 'test@example.com',
        password: 'testpass',
        // Extra field that should be ignored
        extraField: 'ignored',
      });

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: null,
        error: { code: 'user_already_exists', message: 'User already exists' },
      });

      await register(formData);

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'testpass',
      });
    });

    it('handles empty name string', async () => {
      const formData = createMockFormData({
        name: '',
        email: 'empty@example.com',
        password: 'password123',
      });

      const mockAuthData = {
        user: { id: 'user123' },
        session: { access_token: 'mock-token' },
      };

      const mockBackendResponse = {
        data: {
          message: 'User created successfully',
        },
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: mockAuthData,
        error: null,
      });

      axios.post.mockResolvedValue(mockBackendResponse);

      await register(formData);

      // Should handle empty name gracefully
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/register',
        expect.objectContaining({
          first_name: '', // Empty string from split
          last_name: '', // Empty string from missing second part
        }),
        expect.any(Object)
      );
    });
  });
});
