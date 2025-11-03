/**
 * Tests for Supabase client utilities
 */

import { createClient } from '../../utils/supabase/client';

// Mock the @supabase/ssr module
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(),
}));

describe('Supabase Client Utils', () => {
  const { createBrowserClient } = require('@supabase/ssr');

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-123';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  describe('createClient', () => {
    it('creates browser client with correct environment variables', () => {
      const mockClient = { from: jest.fn() };
      createBrowserClient.mockReturnValue(mockClient);

      const result = createClient();

      expect(createBrowserClient).toHaveBeenCalledWith(
        'https://test-project.supabase.co',
        'test-anon-key-123'
      );
      expect(result).toBe(mockClient);
    });

    it('calls createBrowserClient exactly once', () => {
      const mockClient = { from: jest.fn() };
      createBrowserClient.mockReturnValue(mockClient);

      createClient();

      expect(createBrowserClient).toHaveBeenCalledTimes(1);
    });

    it('uses environment variables correctly', () => {
      // Test with different environment variables
      process.env.NEXT_PUBLIC_SUPABASE_URL =
        'https://different-project.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'different-key-456';

      const mockClient = { from: jest.fn() };
      createBrowserClient.mockReturnValue(mockClient);

      createClient();

      expect(createBrowserClient).toHaveBeenCalledWith(
        'https://different-project.supabase.co',
        'different-key-456'
      );
    });

    it('returns the client instance from createBrowserClient', () => {
      const expectedClient = {
        from: jest.fn(),
        auth: { getUser: jest.fn() },
        storage: { from: jest.fn() },
      };

      createBrowserClient.mockReturnValue(expectedClient);

      const result = createClient();

      expect(result).toBe(expectedClient);
      expect(result).toHaveProperty('from');
      expect(result).toHaveProperty('auth');
      expect(result).toHaveProperty('storage');
    });
  });

  describe('error handling', () => {
    it('throws error when environment variables are missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      // The actual implementation uses the ! operator, so undefined env vars will cause runtime errors
      createBrowserClient.mockImplementation(() => {
        throw new Error('Invalid project URL or key');
      });

      expect(() => {
        createClient();
      }).toThrow('Invalid project URL or key');
    });

    it('handles createBrowserClient errors', () => {
      createBrowserClient.mockImplementation(() => {
        throw new Error('Failed to create client');
      });

      expect(() => {
        createClient();
      }).toThrow('Failed to create client');
    });
  });
});
