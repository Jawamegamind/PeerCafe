/**
 * Tests for Supabase server utilities
 */

import { createClient } from '../../utils/supabase/server';

// Mock Next.js headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

// Mock @supabase/ssr
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

describe('Supabase Server Utils', () => {
  const { cookies } = require('next/headers');
  const { createServerClient } = require('@supabase/ssr');

  // Mock cookie store
  const mockCookieStore = {
    getAll: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-123';

    // Setup cookie mock
    cookies.mockResolvedValue(mockCookieStore);
    mockCookieStore.getAll.mockReturnValue([
      { name: 'sb-access-token', value: 'token123' },
      { name: 'sb-refresh-token', value: 'refresh123' },
    ]);
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  describe('createClient', () => {
    it('creates server client with correct configuration', async () => {
      const mockClient = { from: jest.fn() };
      createServerClient.mockReturnValue(mockClient);

      const result = await createClient();

      expect(cookies).toHaveBeenCalled();
      expect(createServerClient).toHaveBeenCalledWith(
        'https://test-project.supabase.co',
        'test-anon-key-123',
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      );
      expect(result).toBe(mockClient);
    });

    it('configures cookie handlers correctly', async () => {
      const mockClient = { from: jest.fn() };
      createServerClient.mockReturnValue(mockClient);

      await createClient();

      // Get the configuration object passed to createServerClient
      const config = createServerClient.mock.calls[0][2];

      // Test getAll function
      const getAllResult = config.cookies.getAll();
      expect(mockCookieStore.getAll).toHaveBeenCalled();
      expect(getAllResult).toEqual([
        { name: 'sb-access-token', value: 'token123' },
        { name: 'sb-refresh-token', value: 'refresh123' },
      ]);
    });

    it('handles setAll cookies correctly', async () => {
      const mockClient = { from: jest.fn() };
      createServerClient.mockReturnValue(mockClient);

      await createClient();

      // Get the configuration object
      const config = createServerClient.mock.calls[0][2];

      // Test setAll function with mock cookies
      const testCookies = [
        {
          name: 'test-cookie',
          value: 'test-value',
          options: { httpOnly: true },
        },
        {
          name: 'another-cookie',
          value: 'another-value',
          options: { secure: true },
        },
      ];

      // This should not throw when called from Server Component context
      expect(() => {
        config.cookies.setAll(testCookies);
      }).not.toThrow();

      // Verify cookies.set was called for each cookie
      expect(mockCookieStore.set).toHaveBeenCalledTimes(2);
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'test-cookie',
        'test-value',
        { httpOnly: true }
      );
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'another-cookie',
        'another-value',
        { secure: true }
      );
    });

    it('handles setAll cookies error gracefully', async () => {
      const mockClient = { from: jest.fn() };
      createServerClient.mockReturnValue(mockClient);

      // Mock cookie.set to throw an error (simulating Server Component context)
      mockCookieStore.set.mockImplementation(() => {
        throw new Error('Cannot set cookies in Server Component');
      });

      await createClient();

      const config = createServerClient.mock.calls[0][2];

      const testCookies = [
        {
          name: 'test-cookie',
          value: 'test-value',
          options: { httpOnly: true },
        },
      ];

      // This should not throw even when cookie.set throws
      expect(() => {
        config.cookies.setAll(testCookies);
      }).not.toThrow();
    });

    it('uses correct environment variables', async () => {
      // Test with different environment variables
      process.env.NEXT_PUBLIC_SUPABASE_URL =
        'https://different-project.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'different-key-456';

      const mockClient = { from: jest.fn() };
      createServerClient.mockReturnValue(mockClient);

      await createClient();

      expect(createServerClient).toHaveBeenCalledWith(
        'https://different-project.supabase.co',
        'different-key-456',
        expect.any(Object)
      );
    });

    it('returns the client instance from createServerClient', async () => {
      const expectedClient = {
        from: jest.fn(),
        auth: { getUser: jest.fn() },
        storage: { from: jest.fn() },
      };

      createServerClient.mockReturnValue(expectedClient);

      const result = await createClient();

      expect(result).toBe(expectedClient);
      expect(result).toHaveProperty('from');
      expect(result).toHaveProperty('auth');
      expect(result).toHaveProperty('storage');
    });
  });

  describe('error handling', () => {
    it('throws error when environment variables are missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      // The actual implementation uses the ! operator, so undefined env vars will cause runtime errors
      createServerClient.mockImplementation(() => {
        throw new Error('Invalid project URL or key');
      });

      await expect(createClient()).rejects.toThrow(
        'Invalid project URL or key'
      );
    });

    it('handles cookie access errors', async () => {
      cookies.mockRejectedValue(new Error('Cookie access failed'));

      await expect(createClient()).rejects.toThrow('Cookie access failed');
    });

    it('handles createServerClient errors', async () => {
      createServerClient.mockImplementation(() => {
        throw new Error('Failed to create server client');
      });

      await expect(createClient()).rejects.toThrow(
        'Failed to create server client'
      );
    });
  });
});
